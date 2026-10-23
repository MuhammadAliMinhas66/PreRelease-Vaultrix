import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import errorHandler from './middleware/errorHandler.js';
import { sanitizeInput, noStore, allowedOrigins } from './middleware/security.js';
import { attachDeviceId } from './middleware/deviceId.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.disable('x-powered-by');

if (process.env.TRUST_PROXY) {
  const value = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(value) ? process.env.TRUST_PROXY : value);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Google's "Continue with Google" popup needs to postMessage its result
    // back to the window that opened it. Helmet's own default COOP value
    // ("same-origin") blocks exactly that - the browser isolates the popup
    // from its opener and the postMessage call gets silently dropped, which
    // is what shows up in the console as "Cross-Origin-Opener-Policy policy
    // would block the window.postMessage call." "same-origin-allow-popups"
    // is the policy Google's own docs recommend for pages that open an
    // OAuth popup: it keeps the opener isolated from other origins while
    // still allowing a popup IT opened to talk back to it.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);

const origins = allowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fallback-Id'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(attachDeviceId);

app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    dotfiles: 'deny',
    index: false,
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    },
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a moment and try again.' },
});

app.use('/api', apiLimiter, noStore);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'That endpoint does not exist.' });
});

app.use(errorHandler);

export default app;
