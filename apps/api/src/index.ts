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

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

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
app.use("/api/execute", executeRouter);

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../../../web/dist")));

app.use(notFoundHandler);
app.use(errorHandler);

// Catch-all for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../../../web/dist/index.html"));
});

app.listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});

void initWorkers();
