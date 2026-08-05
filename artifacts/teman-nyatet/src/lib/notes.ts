import * as z from 'zod';

export const noteSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  tags: z.array(z.string()).default([]),
  color: z.string().optional(),
});

export type NoteFormValues = z.infer<typeof noteSchema>;