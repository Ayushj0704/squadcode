import { Router } from "express";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth } from "../auth/clerk.js";
import { env } from "../env.js";

export const executeRouter = Router();

// JDoodle language mapping
const JDOODLE_LANG_MAP: Record<string, { language: string; versionIndex: string }> = {
  python: { language: "python3", versionIndex: "4" },
  cpp: { language: "cpp17", versionIndex: "1" },
};

executeRouter.post("/", requireClerkAuth, asyncRoute(async (req, res) => {
  const { language, code, stdin } = req.body;
  if (!language || !code) {
    res.status(400).json({ error: "Missing language or code" });
    return;
  }

  const jdoodleConfig = JDOODLE_LANG_MAP[language];
  if (!jdoodleConfig) {
    res.status(400).json({ error: "Unsupported language" });
    return;
  }

  if (!env.JDOODLE_CLIENT_ID || !env.JDOODLE_CLIENT_SECRET) {
    res.status(500).json({ error: "JDoodle API credentials not configured" });
    return;
  }

  try {
    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: env.JDOODLE_CLIENT_ID,
        clientSecret: env.JDOODLE_CLIENT_SECRET,
        script: code,
        language: jdoodleConfig.language,
        versionIndex: jdoodleConfig.versionIndex,
        stdin: stdin || "",
      }),
    });

    const data = (await response.json()) as {
      output?: string;
      statusCode?: number;
      memory?: string;
      cpuTime?: string;
      error?: string;
    };

    if (!response.ok || data.error) {
      res.json({ stdout: "", stderr: data.error || "Execution error", code: 1 });
      return;
    }

    // JDoodle returns combined output in `output` field.
    // statusCode 200 = success, anything else = error.
    const isSuccess = data.statusCode === 200;
    res.json({
      stdout: isSuccess ? (data.output || "") : "",
      stderr: isSuccess ? "" : (data.output || "Execution error"),
      code: isSuccess ? 0 : 1,
      memory: data.memory || null,
      cpuTime: data.cpuTime || null,
    });
  } catch (error: any) {
    res.json({ stdout: "", stderr: error.message || "Failed to execute code", code: 1 });
  }
}));
