import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { squadsRouter } from "./routes/squads.js";
import { connectionsRouter } from "./routes/connections.js";
import { platformDataRouter } from "./routes/platformData.js";
import { threadsRouter } from "./routes/threads.js";
import { sheetsRouter } from "./routes/sheets.js";
import { feedRouter } from "./routes/feed.js";
import { initWorkers } from "./workers/queue.js";

import rateLimit from 'express-rate-limit';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.jdoodle.com"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:8080',
  'https://squadcode.netlify.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.netlify.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

// Global rate limit: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(clerkMiddleware());

import { executeRouter } from "./routes/execute.js";

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/squads", squadsRouter);
app.use("/api/connections", connectionsRouter);
app.use("/api/data", platformDataRouter);
app.use("/api/platformData", platformDataRouter);
app.use("/api/threads", threadsRouter);
app.use("/api/sheets", sheetsRouter);
app.use("/api/feed", feedRouter);

// Stricter rate limit for code execution: 20 per minute
const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code execution requests. Please wait.' },
});
app.use('/api/execute', executeLimiter);
app.use("/api/execute", executeRouter);

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../../web/dist")));

// SPA catch-all for non-API routes (production only)
app.use((req, res, next) => {
  // Skip API routes — let them fall through to notFoundHandler
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, "../../web/dist/index.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});

void initWorkers();
