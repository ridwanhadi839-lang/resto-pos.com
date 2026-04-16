const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const content = fs.readFileSync(filePath, 'utf8');

  content.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    entries[key] = value;
  });

  return entries;
};

const isPlaceholder = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();

  return (
    !normalizedValue ||
    normalizedValue.includes('your-') ||
    normalizedValue.includes('replace-with')
  );
};

const assertHttpsUrl = (issues, name, value) => {
  if (isPlaceholder(value)) {
    issues.push(`${name} wajib diisi untuk build release.`);
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    issues.push(`${name} harus berupa URL valid.`);
    return;
  }

  if (parsedUrl.protocol !== 'https:') {
    issues.push(`${name} wajib memakai HTTPS untuk build Play Store.`);
  }

  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname)) {
    issues.push(`${name} tidak boleh mengarah ke localhost untuk build Play Store.`);
  }
};

const env = {
  ...process.env,
  ...parseEnvFile(envPath),
};
const issues = [];

assertHttpsUrl(issues, 'EXPO_PUBLIC_SUPABASE_URL', env.EXPO_PUBLIC_SUPABASE_URL);
assertHttpsUrl(issues, 'EXPO_PUBLIC_API_BASE_URL', env.EXPO_PUBLIC_API_BASE_URL);

if (isPlaceholder(env.EXPO_PUBLIC_SUPABASE_ANON_KEY)) {
  issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY wajib diisi untuk build release.');
}

if (env.EXPO_PUBLIC_ENABLE_LOCAL_DEV_AUTH === 'true') {
  issues.push('EXPO_PUBLIC_ENABLE_LOCAL_DEV_AUTH harus false untuk build release.');
}

if (!isPlaceholder(env.EXPO_PUBLIC_LOCAL_LOGIN_PIN)) {
  issues.push('EXPO_PUBLIC_LOCAL_LOGIN_PIN jangan diisi PIN asli untuk build release.');
}

if (issues.length > 0) {
  console.error(`Release env check failed:\n- ${issues.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Release env check: OK');
}
