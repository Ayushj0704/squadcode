import { Router } from "express";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth } from "../auth/clerk.js";

export const executeRouter = Router();

executeRouter.post("/", requireClerkAuth, asyncRoute(async (req, res) => {
  const { language, code, stdin } = req.body;
  if (!language || !code) {
    res.status(400).json({ error: "Missing language or code" });
    return;
  }

  let pistonLanguage = "";
  let version = "";

  if (language === "python") {
    pistonLanguage = "python";
    version = "3.10.0";
  } else if (language === "cpp") {
    pistonLanguage = "c++";
    version = "10.2.0";
  } else {
    res.status(400).json({ error: "Unsupported language" });
    return;
  }

  try {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: pistonLanguage,
        version: version,
        files: [{ content: code }],
        stdin: stdin || "",
      }),
    });

    const data = (await response.json()) as { message?: string; run?: { stdout?: string; stderr?: string; code?: number } };

    if (!response.ok || data.message) {
      res.json({ stdout: "", stderr: data.message || "Execution error", code: 1 });
      return;
    }

    const run = data.run || {};
    res.json({
      stdout: run.stdout || "",
      stderr: run.stderr || "", 
      code: run.code ?? 0,
    });
  } catch (error: any) {
    res.json({ stdout: "", stderr: error.message || "Failed to execute code", code: 1 });
  }
}));
