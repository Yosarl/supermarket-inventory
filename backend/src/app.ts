import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
