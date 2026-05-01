import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { createRequire } from 'module';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { connectDB } from './config/db.js';
import env from './config/env.js';
import { swaggerSpec, swaggerUiOptions } from './config/swagger.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import sanitize from './middleware/sanitize.js';
import adminRoutes from './routes/adminRoutes.js';
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

const require = createRequire(import.meta.url);
const { version } = require('./package.json');
const app = express();
const httpServer = createServer(app);
const globalJsonParser = express.json({ limit: '64kb' });
const swaggerHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:'],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
    },
  },
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use('/api-docs', swaggerHelmet, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

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

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodeNest API</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #090b17;
        --panel: rgba(13, 17, 35, 0.78);
        --line: rgba(125, 211, 252, 0.24);
        --text: #ecfeff;
        --muted: #9ca3af;
        --cyan: #22d3ee;
        --violet: #8b5cf6;
        --green: #34d399;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        overflow: hidden;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 18% 20%, rgba(34, 211, 238, 0.2), transparent 30%),
          radial-gradient(circle at 82% 16%, rgba(139, 92, 246, 0.24), transparent 34%),
          linear-gradient(135deg, #050816 0%, #0f172a 52%, #111827 100%);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background-image:
          linear-gradient(rgba(125, 211, 252, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(125, 211, 252, 0.08) 1px, transparent 1px);
        background-size: 42px 42px;
        mask-image: radial-gradient(circle, black 0%, transparent 72%);
      }

      .container {
        position: relative;
        width: min(92vw, 620px);
        padding: 56px 42px 34px;
        border: 1px solid var(--line);
        border-radius: 32px;
        background: var(--panel);
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        text-align: center;
        backdrop-filter: blur(20px);
      }

      .container::before {
        content: "</>";
        position: absolute;
        top: -26px;
        left: 50%;
        transform: translateX(-50%);
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 22px;
        background: linear-gradient(135deg, var(--cyan), var(--violet));
        color: #020617;
        font-weight: 900;
        box-shadow: 0 16px 34px rgba(34, 211, 238, 0.24);
      }

      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 8vw, 5rem);
        line-height: 0.95;
        letter-spacing: -0.08em;
        background: linear-gradient(90deg, var(--text), var(--cyan), var(--green));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .version {
        margin: 18px 0 32px;
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        letter-spacing: 0.18em;
      }

      .links {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 14px;
        margin-bottom: 34px;
      }

      a {
        color: inherit;
      }

      .btn-primary,
      .btn-secondary {
        min-width: 170px;
        padding: 14px 18px;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 800;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
      }

      .btn-primary {
        background: linear-gradient(135deg, var(--cyan), var(--violet));
        color: #020617;
        box-shadow: 0 14px 30px rgba(34, 211, 238, 0.2);
      }

      .btn-secondary {
        border: 1px solid rgba(52, 211, 153, 0.42);
        color: var(--green);
        background: rgba(52, 211, 153, 0.08);
      }

      .btn-primary:hover,
      .btn-secondary:hover {
        transform: translateY(-3px);
        box-shadow: 0 18px 42px rgba(139, 92, 246, 0.24);
      }

      footer.sign {
        color: var(--muted);
        font-size: 0.95rem;
      }

      footer.sign a {
        color: var(--cyan);
        font-weight: 800;
        text-decoration: none;
      }

      footer.sign a:hover {
        color: var(--green);
      }

      @media (max-width: 520px) {
        body {
          overflow: auto;
          padding: 24px;
        }

        .container {
          padding: 52px 22px 28px;
          border-radius: 26px;
        }

        .links {
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>CodeNest API</h1>
      <p class="version">v${version}</p>
      <div class="links">
        <a href="/api-docs" class="btn-primary">API Documentation</a>
        <a href="/api/health" class="btn-secondary">Health Check</a>
      </div>
      <footer class="sign">
        Created by
        <a href="https://serkanbayraktar.com/" target="_blank" rel="noopener noreferrer">Serkanby</a>
        |
        <a href="https://github.com/Serkanbyx" target="_blank" rel="noopener noreferrer">Github</a>
      </footer>
    </div>
  </body>
</html>`);
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
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

httpServer.listen(env.PORT);
