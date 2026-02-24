import { spawn } from 'child_process';
import { join } from 'path';
import type { ToolRuntime } from '@ai-agent/shared';
import type { DiscoveredTool, ToolResult } from './types';

const RUNTIME_COMMANDS: Record<ToolRuntime, string[]> = {
  bun: ['bun', 'run'],
  node: ['node'],
  python: ['python3'],
  bash: ['bash'],
  go: ['go', 'run'],
  binary: [],
  powershell: ['pwsh', '-File'],
};

export async function executeTool(
  tool: DiscoveredTool,
  args: Record<string, unknown>,
  timeout: number = 30000
): Promise<ToolResult> {
  const { definition, path } = tool;
  const scriptPath = join(path, definition.script);
  
  const runtimeCmd = RUNTIME_COMMANDS[definition.runtime];
  const command = definition.runtime === 'binary' 
    ? [scriptPath]
    : [...runtimeCmd, scriptPath];
  
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    const proc = spawn(command[0], command.slice(1), {
      cwd: path,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeout);
    
    // Send input via stdin
    proc.stdin?.write(JSON.stringify(args));
    proc.stdin?.end();
    
    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      
      if (timedOut) {
        resolve({
          success: false,
          error: `Tool execution timed out after ${timeout}ms`,
        });
        return;
      }
      
      if (code !== 0) {
        resolve({
          success: false,
          error: stderr || `Tool exited with code ${code}`,
        });
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve({
          success: true,
          result,
        });
      } catch (_e) {
        resolve({
          success: false,
          error: `Failed to parse tool output: ${stdout.slice(0, 200)}`,
        });
      }
    });
    
    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: `Failed to execute tool: ${err.message}`,
      });
    });
  });
}

export { RUNTIME_COMMANDS };
