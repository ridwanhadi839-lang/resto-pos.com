const normalizeEnvValue = (value) => (typeof value === 'string' ? value.trim() : '');

const parseCorsOrigins = (value) =>
  normalizeEnvValue(value || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const env = {
  nodeEnv: normalizeEnvValue(process.env.NODE_ENV) || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: normalizeEnvValue(process.env.CORS_ORIGIN) || '*',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  supabaseUrl: normalizeEnvValue(process.env.SUPABASE_URL),
  supabaseAnonKey: normalizeEnvValue(process.env.SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
  jwtSecret: normalizeEnvValue(process.env.JWT_SECRET),
  jwtExpiresIn: normalizeEnvValue(process.env.JWT_EXPIRES_IN) || '12h',
  integrationApiKey: normalizeEnvValue(process.env.INTEGRATION_API_KEY),
};

const validateEnvConfig = () => {
  const issues = [];

  if (!Number.isFinite(env.port) || env.port <= 0) {
    issues.push('PORT harus berupa angka valid yang lebih besar dari 0.');
  }

  if (env.jwtSecret && env.jwtSecret.length < 32) {
    issues.push('JWT_SECRET harus minimal 32 karakter.');
  }

  if (env.nodeEnv === 'production' && env.corsOrigins.includes('*')) {
    issues.push('CORS_ORIGIN tidak boleh "*" pada production.');
  }

  return issues;
};

const assertEnvConfig = () => {
  const issues = validateEnvConfig();
  if (issues.length === 0) {
    return;
  }

  throw new Error(`Konfigurasi backend tidak valid:\n- ${issues.join('\n- ')}`);
};

module.exports = {
  env,
  assertEnvConfig,
  validateEnvConfig,
};
