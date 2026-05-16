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
import { initWorkers } from "./workers/queue.js";
import { initWebSockets } from "./websockets/index.js";
import { createServer } from "http";

const app = express();
const server = createServer(app);
initWebSockets(server);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", squadsRouter);
app.use("/api", connectionsRouter);
app.use("/api", platformDataRouter);
app.use("/api", threadsRouter);
app.use("/api", sheetsRouter);
app.use("/api", contestsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});

void initWorkers();


void initWorkers();
