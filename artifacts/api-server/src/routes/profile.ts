import { Router } from 'express';
import * as multerMod from 'multer';
import { requireUser } from '../middleware/requireAuth';
import { supabaseAdmin } from '../lib/supabase-admin';

// multer ships CJS UMD types (`export = multer`) alongside an ESM default
// shim. Vercel's tsc post-build type-check pins the default-import to the
// namespace, which downstream `multer.MulterError` and `multer.memoryStorage`
// accesses then surface as not-callable. The namespace + `.default ?? mod`
// pattern is robust under both module flavors and preserves the function's
// attached properties (`MulterError`, `memoryStorage`) at runtime.
const multer = ((multerMod as any).default ?? multerMod) as any;

const router = Router();

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
});

let bucketEnsured = false;
async function ensureAvatarBucket(): Promise<void> {
  if (bucketEnsured) return;
  const { data: existing } = await supabaseAdmin.storage.getBucket(AVATAR_BUCKET);
  if (!existing) {
    const { error } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: MAX_AVATAR_BYTES,
      allowedMimeTypes: Object.keys(ALLOWED_MIME_TO_EXT),
    });
    // Ignore "already exists" races from concurrent requests.
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }
  bucketEnsured = true;
}

// POST /api/profile/avatar
// Uploads the authenticated caller's profile photo to Supabase Storage and
// updates profiles.avatar_url. Uses the service role key server-side, so no
// storage RLS policies are required — the caller can only ever touch their
// own row/path because the path is derived from req.userId, never client input.
router.post('/profile/avatar', requireUser, upload.single('avatar'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded (expected multipart field "avatar")' });
      return;
    }

    const ext = ALLOWED_MIME_TO_EXT[file.mimetype];
    if (!ext) {
      res.status(400).json({ error: 'Unsupported file type. Use JPEG, PNG, or WebP.' });
      return;
    }

    await ensureAvatarBucket();

    const userId = req.userId as string;
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      req.log.error({ err: uploadError }, 'Failed to upload avatar to storage');
      res.status(500).json({ error: 'Failed to upload photo' });
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // Cache-bust so the browser picks up the new image even though the path is stable.
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      req.log.error({ err: updateError }, 'Failed to save avatar_url on profile');
      res.status(500).json({ error: 'Photo uploaded but failed to save on profile' });
      return;
    }

    res.status(200).json({ data: { avatar_url: avatarUrl } });
  } catch (err: any) {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5MB or smaller' : err.message;
      res.status(400).json({ error: message });
      return;
    }
    req.log.error({ err }, 'Unexpected error in /profile/avatar');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
