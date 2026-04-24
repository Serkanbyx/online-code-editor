import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import sanitize from './middleware/sanitize.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(sanitize);

if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api', globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

await connectDB();

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
