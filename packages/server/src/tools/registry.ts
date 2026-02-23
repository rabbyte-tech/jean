import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ToolDefinition } from '@ai-agent/shared';
import type { DiscoveredTool } from './types';

const DEFAULT_TOOLS_PATH = process.env.TOOLS_PATH || join(process.cwd(), 'data', 'tools');

let toolsCache: Map<string, DiscoveredTool> = new Map();
let lastScanTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

export async function scanTools(toolsPath: string = DEFAULT_TOOLS_PATH): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  
  try {
    const entries = await readdir(toolsPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const toolDir = join(toolsPath, entry.name);
      const toolJsonPath = join(toolDir, 'tool.json');
      
      try {
        const content = await readFile(toolJsonPath, 'utf-8');
        const definition = JSON.parse(content) as ToolDefinition;
        
        // Validate required fields
        if (!definition.name || !definition.script || !definition.runtime) {
          console.warn(`Invalid tool.json in ${entry.name}: missing required fields`);
          continue;
        }
        
        tools.push({
          definition,
          path: toolDir,
        });
      } catch (e) {
        console.warn(`Failed to read tool.json in ${entry.name}:`, e);
      }
    }
  } catch (e) {
    // Tools directory doesn't exist yet
    console.warn(`Tools directory not found: ${toolsPath}`);
  }
  
  // Update cache
  toolsCache.clear();
  for (const tool of tools) {
    toolsCache.set(tool.definition.name, tool);
  }
  lastScanTime = Date.now();
  
  return tools;
}

export async function getTool(name: string): Promise<DiscoveredTool | null> {
  // Return cached if fresh
  if (Date.now() - lastScanTime < CACHE_TTL && toolsCache.has(name)) {
    return toolsCache.get(name) || null;
  }
  
  // Rescan
  await scanTools();
  return toolsCache.get(name) || null;
}

export async function listTools(): Promise<ToolDefinition[]> {
  if (Date.now() - lastScanTime >= CACHE_TTL) {
    await scanTools();
  }
  
  return Array.from(toolsCache.values()).map(t => t.definition);
}

export function clearCache(): void {
  toolsCache.clear();
  lastScanTime = 0;
}
