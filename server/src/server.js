import { createApp } from './app.js';
import { loadLocalEnv } from './config/env.js';
import { initDatabase } from './db/database.js';

loadLocalEnv();

const PORT = Number(process.env.PORT || 3001);

function formatDatabaseStartupError(error) {
  const lines = ['Failed to initialize PostgreSQL database.'];

  if (!process.env.DATABASE_URL) {
    lines.push('DATABASE_URL is not set. Add it to .env or set it in the current shell before starting the server.');
    return lines.join('\n');
  }

  if (error?.code === 'ENOTFOUND') {
    const hostname = error.hostname || 'the configured database host';
    lines.push(`DNS could not resolve ${hostname}.`);

    if (/^db\.[a-z0-9]+\.supabase\.co$/i.test(hostname)) {
      lines.push('This looks like a Supabase direct database host. If it does not resolve from this machine, copy a Session pooler or Transaction pooler connection string from Supabase instead.');
      lines.push('Supabase pooler URLs usually use a host like aws-0-<region>.pooler.supabase.com and a username like postgres.<project-ref>.');
    }

    lines.push('If the database password contains URL characters such as @, #, %, /, or ?, use the connection string copied by the provider or URL-encode the password.');
    return lines.join('\n');
  }

  if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    lines.push(`Connection failed with ${error.code}. Check DATABASE_URL host, port, network access, and SSL settings.`);
    return lines.join('\n');
  }

  lines.push(error?.message || String(error));
  return lines.join('\n');
}

initDatabase()
  .then(() => {
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Exam schedule API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(formatDatabaseStartupError(error));
    if (process.env.DEBUG_DB_STARTUP === 'true') {
      console.error(error);
    }
    process.exit(1);
  });
