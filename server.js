import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const app = express();

app.use(cors());
app.use(express.json());

// Load routes
const promptRoutes = await import('./backend/routes/promptRoutes.js');
const templateRoutes = await import('./backend/routes/templateRoutes.js');
const historyRoutes = await import('./backend/routes/historyRoutes.js');
const suggestionRoutes = await import('./backend/routes/suggestionRoutes.js');
const embeddingRoutes = await import('./backend/routes/embeddingRoutes.js');

app.use('/api/prompt', promptRoutes.default);
app.use('/api/templates', templateRoutes.default);
app.use('/api/history', historyRoutes.default);
app.use('/api/suggestions', suggestionRoutes.default);
app.use('/api/embeddings', embeddingRoutes.default);

// Serve static frontend
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

export default app;