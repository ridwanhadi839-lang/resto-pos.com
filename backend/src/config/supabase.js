const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;
const supabaseServiceRoleKey = env.supabaseServiceRoleKey;

const hasRealValue = (value) =>
  Boolean(value) &&
  !String(value).includes('your-project-ref') &&
  !String(value).includes('your-anon-key') &&
  !String(value).includes('your-service-role-key');

const hasPublicClientConfig = hasRealValue(supabaseUrl) && hasRealValue(supabaseAnonKey);
const hasAdminClientConfig = hasRealValue(supabaseUrl) && hasRealValue(supabaseServiceRoleKey);

const supabase = hasPublicClientConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const supabaseAdmin = hasAdminClientConfig
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

module.exports = {
  supabase,
  supabaseAdmin,
  hasPublicClientConfig,
  hasAdminClientConfig,
};
