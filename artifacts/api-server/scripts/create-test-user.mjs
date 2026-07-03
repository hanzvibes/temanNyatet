import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = 'test@temannyatet.id';
const password = 'TemanNyatet123!';

async function main() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      console.log('Test user already exists. You can log in with:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      return;
    }
    console.error('Failed to create test user:', error.message);
    process.exit(1);
  }

  console.log('Test user created successfully!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`User ID: ${data.user?.id}`);
}

main();
