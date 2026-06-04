import { createApp } from './app.js';
import { initDatabase } from './db/database.js';

const PORT = Number(process.env.PORT || 3001);

initDatabase();

const app = createApp();

app.listen(PORT, () => {
  console.log(`Exam schedule API listening on http://localhost:${PORT}`);
});
