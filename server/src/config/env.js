import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFile = fileURLToPath(import.meta.url);
const serverSrcDir = path.dirname(path.dirname(currentFile));
const serverDir = path.dirname(serverSrcDir);
const projectRoot = path.dirname(serverDir);

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (!key) {
    return null;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadLocalEnv() {
  const envPaths = [
    path.join(projectRoot, '.env'),
    path.join(serverDir, '.env')
  ];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const content = fs.readFileSync(envPath, 'utf8');

    for (const line of content.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (entry && process.env[entry.key] === undefined) {
        process.env[entry.key] = entry.value;
      }
    }
  }
}
