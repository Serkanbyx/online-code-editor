import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import sanitize from './middleware/sanitize.js';
import authRoutes from './routes/authRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import snippetRoutes from './routes/snippetRoutes.js';
import { initSocketServer } from './sockets/index.js';
import { attachYjsToServer } from './sockets/yjsServer.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();
const httpServer = createServer(app);
const globalJsonParser = express.json({ limit: '64kb' });

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use('/api/code', express.json({ limit: '96kb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/code')) {
    next();
    return;
  }

  globalJsonParser(req, res, next);
});
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
app.use('/api/code', codeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/snippets', snippetRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

await connectDB();
initSocketServer(httpServer);
attachYjsToServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
