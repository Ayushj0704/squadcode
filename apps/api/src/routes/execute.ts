import { Router } from "express";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth } from "../auth/clerk.js";
import { env } from "../env.js";

export const executeRouter = Router();

executeRouter.post("/", requireClerkAuth, asyncRoute(async (req, res) => {
  const { language, code, stdin } = req.body;
  if (!language || !code) {
    res.status(400).json({ error: "Missing language or code" });
    return;
  }

  // Trim to prevent trailing spaces from .env breaking authentication
  const clientId = env.JDOODLE_CLIENT_ID?.trim();
  const clientSecret = env.JDOODLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: "JDoodle API keys are missing in the server configuration." });
    return;
  }

  let jdoodleLanguage = "";
  let versionIndex = "0";

  if (language === "python") {
    jdoodleLanguage = "python3";
    versionIndex = "4"; // Python 3.11.2
  } else if (language === "cpp") {
    jdoodleLanguage = "cpp";
    versionIndex = "5"; // GCC 11.1.0
  } else {
    res.status(400).json({ error: "Unsupported language" });
    return;
  }

  try {
    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script: code,
        language: jdoodleLanguage,
        versionIndex,
        stdin: stdin || "",
      }),
    });

    const data = (await response.json()) as { error?: string; message?: string; output?: string };

    if (!response.ok || data.error) {
      res.json({ stdout: "", stderr: data.error || data.message || "JDoodle Execution error", code: 1 });
      return;
    }

    res.json({
      stdout: data.output || "",
      stderr: "", 
      code: 0,
    });
  } catch (error: any) {
    res.json({ stdout: "", stderr: error.message || "Failed to execute code", code: 1 });
  }
}));
