import { Router } from "express";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth } from "../auth/clerk.js";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const executeRouter = Router();

executeRouter.post("/", requireClerkAuth, asyncRoute(async (req, res) => {
  const { language, code, stdin } = req.body;
  if (!language || !code) {
    res.status(400).json({ error: "Missing language or code" });
    return;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "squadcode-"));
  
  try {
    if (language === "python") {
      const sourceFile = path.join(tmpDir, "main.py");
      await fs.writeFile(sourceFile, code);
      const result = await runCommand("python", [sourceFile], stdin, tmpDir);
      res.json(result);
    } else if (language === "cpp") {
      const sourceFile = path.join(tmpDir, "main.cpp");
      const exeFile = path.join(tmpDir, "out.exe");
      await fs.writeFile(sourceFile, code);
      
      const compileRes = await runCommand("g++", [sourceFile, "-o", exeFile], "", tmpDir);
      if (compileRes.exitCode !== 0) {
        res.json({ stdout: "", stderr: compileRes.stderr || compileRes.stdout, code: compileRes.exitCode });
        return;
      }
      
      const runRes = await runCommand(exeFile, [], stdin, tmpDir);
      res.json(runRes);
    } else {
      res.status(400).json({ error: "Unsupported language" });
    }
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}));

function runCommand(command: string, args: string[], stdin: string | undefined, cwd: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd });
    
    let stdout = "";
    let stderr = "";
    
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    
    if (stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }
    
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      stderr += "\n[Execution timeout (5s)]";
    }, 5000);
    
    proc.on("close", (code) => {
      clearTimeout(timeout);
      // Clean up local paths from output to avoid leaking them
      const cleanStdout = stdout.split(cwd).join("/playground").split(cwd.replace(/\\/g, "/")).join("/playground");
      const cleanStderr = stderr.split(cwd).join("/playground").split(cwd.replace(/\\/g, "/")).join("/playground");
      resolve({ stdout: cleanStdout, stderr: cleanStderr, exitCode: code ?? 1 });
    });
    
    proc.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ stdout: "", stderr: err.message, exitCode: 1 });
    });
  });
}
