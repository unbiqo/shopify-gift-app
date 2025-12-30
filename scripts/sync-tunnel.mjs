import fs from 'node:fs';
import path from 'node:path';

const getRepoRoot = () => process.cwd();

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const writeFile = (filePath, content) => fs.writeFileSync(filePath, content, 'utf8');

const normalizeUrl = (value) => {
  if (!value) return '';
  return value.replace(/\/+$/, '');
};

const parseEnv = (content) => {
  const lines = content.split(/\r?\n/);
  const map = new Map();
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    map.set(key, value);
  }
  return map;
};

const upsertEnvKey = (content, key, value) => {
  const lineRegex = new RegExp(`^${key}=.*$`, 'm');
  if (lineRegex.test(content)) {
    return content.replace(lineRegex, `${key}=${value}`);
  }
  const trimmed = content.replace(/\s*$/, '');
  return `${trimmed}\n${key}=${value}\n`;
};

const updateShopifyToml = (content, baseUrl) => {
  const appUrlLine = `application_url = "${baseUrl}"`;
  const redirectLine = `redirect_urls = [ "${baseUrl}/auth" ]`;

  let updated = content.replace(/application_url = ".*"/, appUrlLine);
  if (updated === content) {
    updated = `${content.trimEnd()}\n${appUrlLine}\n`;
  }

  if (/redirect_urls = \[ ".*" \]/.test(updated)) {
    updated = updated.replace(/redirect_urls = \[ ".*" \]/, redirectLine);
  } else {
    updated = `${updated.trimEnd()}\n${redirectLine}\n`;
  }

  return updated;
};

const root = getRepoRoot();
const envPath = path.join(root, '.env');
const tomlPath = path.join(root, 'shopify.app.toml');

const envContent = readFile(envPath);
const envMap = parseEnv(envContent);

const inputUrl = normalizeUrl(process.argv[2]);
const baseUrl = inputUrl || normalizeUrl(envMap.get('SHOPIFY_APP_URL'));

if (!baseUrl) {
  console.error('Missing tunnel URL. Pass it as an argument or set SHOPIFY_APP_URL in .env.');
  process.exit(1);
}

const nextEnv = upsertEnvKey(envContent, 'SHOPIFY_APP_URL', baseUrl);
writeFile(envPath, nextEnv);

const tomlContent = readFile(tomlPath);
const nextToml = updateShopifyToml(tomlContent, baseUrl);
writeFile(tomlPath, nextToml);

console.log(`Updated SHOPIFY_APP_URL + shopify.app.toml to ${baseUrl}`);
