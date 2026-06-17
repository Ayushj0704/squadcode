import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth } from "../auth/clerk.js";

export const executeRouter = Router();

const executeSchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1).max(50000),
  stdin: z.string().max(10000).optional().default(""),
});

// Judge0 language mapping
const JUDGE0_LANG_MAP: Record<string, number> = {
  python: 71, // Python (3.8.1)
  cpp: 54,    // C++ (GCC 9.2.0)
};

executeRouter.post("/", requireClerkAuth, asyncRoute(async (req, res) => {
  const { language, code, stdin } = executeSchema.parse(req.body);

  const languageId = JUDGE0_LANG_MAP[language];
  if (!languageId) {
    res.status(400).json({ error: "Unsupported language" });
    return;
  }

  try {
    const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: stdin || "",
      }),
    });

    const data = (await response.json()) as {
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      message?: string | null;
      status?: { id: number; description: string };
      time?: string | null;
      memory?: number | null;
    };

    if (!response.ok) {
      res.json({ stdout: "", stderr: "Code execution API returned an error.", code: 1 });
      return;
    }

    const stdout = data.stdout || "";
    // If compilation fails, stderr comes in compile_output. Runtime errors in stderr.
    const stderr = data.compile_output || data.stderr || data.message || "";
    const statusCode = data.status?.id === 3 ? 0 : 1;

    res.json({
      stdout,
      stderr,
      code: statusCode,
      cpuTime: data.time || null,
      memory: data.memory ? `${data.memory} KB` : null,
    });
  } catch (error: any) {
    res.json({ stdout: "", stderr: error.message || "Failed to execute code", code: 1 });
  }
}));
