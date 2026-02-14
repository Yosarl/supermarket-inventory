import express from 'express';
import path from 'path';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// UPLOAD_DIR is set by Electron to a writable user-data location (outside Program Files).
// BACKEND_CWD is the backend's own directory. Fall back to process.cwd() for dev mode.
const uploadsBase = process.env.UPLOAD_DIR || process.env.BACKEND_CWD || process.cwd();
app.use('/uploads', express.static(path.join(uploadsBase, 'uploads')));

app.get('/', (_req, res) => {
  res.json({
    message: 'Supermarket Inventory API',
    api: '/api',
    health: '/api/health',
    docs: 'Use the frontend at http://localhost:3000 or send requests to /api/*',
  });
});

app.use('/api', routes);

app.use(errorHandler);

export default app;
