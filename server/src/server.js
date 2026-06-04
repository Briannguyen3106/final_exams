import { createApp } from './app.js';
import { initDatabase } from './db/database.js';

const PORT = Number(process.env.PORT || 3001);

initDatabase()
  .then(() => {
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Exam schedule API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
