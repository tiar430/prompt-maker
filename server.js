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
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes (from backend)
const promptRoutes = (await import('./backend/routes/promptRoutes.js')).default;
const templateRoutes = (await import('./backend/routes/templateRoutes.js')).default;
const historyRoutes = (await import('./backend/routes/historyRoutes.js')).default;
const suggestionRoutes = (await import('./backend/routes/suggestionRoutes.js')).default;
const embeddingRoutes = (await import('./backend/routes/embeddingRoutes.js')).default;

app.use('/api/prompt', promptRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/embeddings', embeddingRoutes);

// Serve static frontend files from Vite build
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// SPA fallback - serve index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});