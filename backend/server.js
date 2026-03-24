import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import promptRoutes from './routes/promptRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import suggestionRoutes from './routes/suggestionRoutes.js';
import embeddingRoutes from './routes/embeddingRoutes.js';
import { seedDbIfEmpty } from './services/dbSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/prompt', promptRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/embeddings', embeddingRoutes);

// Serve static frontend files from Vite build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback - serve index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, '0.0.0.0', async () => {
  try {
    await seedDbIfEmpty();
  } catch (e) {
    console.error('DB seed error:', e.message);
  }
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
