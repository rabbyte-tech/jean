import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { Preconfig } from '@ai-agent/shared';
import { randomUUID } from 'crypto';

const PRECONFIGS_DIR = process.env.PRECONFIGS_PATH || join(homedir(), '.jean2', 'preconfigs');

// Default preconfigs
const DEFAULT_PRECONFIGS: Preconfig[] = [
  {
    id: 'reader',
    name: 'Reader',
    description: 'Read-only agent for exploring codebases and documents',
    systemPrompt: 'You are a helpful assistant focused on reading and understanding files. You have access to tools for reading files, searching content, and exploring directory structures. Be thorough and precise in your analysis.',
    tools: ['read-file', 'glob', 'grep'],
    model: null,
    provider: null,
    settings: { temperature: 0.5 },
    isDefault: true,
  },
  {
    id: 'coder',
    name: 'Coder',
    description: 'Full-featured agent for writing and modifying code',
    systemPrompt: 'You are a skilled software developer assistant. You can read, write, and modify files, and execute shell commands. Write clean, well-documented code. Test your changes when appropriate.',
    tools: ['read-file', 'write-file', 'shell', 'glob', 'grep'],
    model: null,
    provider: null,
    settings: { temperature: 0.3 },
    isDefault: false,
  },
  {
    id: 'writer',
    name: 'Writer',
    description: 'Agent for writing documentation and content',
    systemPrompt: 'You are a helpful writing assistant. You can read and write files to help create documentation, articles, and other text content. Write clearly and concisely.',
    tools: ['read-file', 'write-file'],
    model: null,
    provider: null,
    settings: { temperature: 0.7 },
    isDefault: false,
  },
];

async function ensureDir(): Promise<void> {
  try {
    await mkdir(PRECONFIGS_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
}

export async function initializePreconfigs(): Promise<void> {
  await ensureDir();
  
  // Check if any preconfigs exist
  const files = await readdir(PRECONFIGS_DIR).catch(() => []);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    // Create default preconfigs
    for (const preconfig of DEFAULT_PRECONFIGS) {
      await createPreconfig(preconfig);
    }
    console.log(`Initialized ${DEFAULT_PRECONFIGS.length} default preconfigs`);
  }
}

export async function listPreconfigs(): Promise<Preconfig[]> {
  await ensureDir();
  
  const files = await readdir(PRECONFIGS_DIR).catch(() => []);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  const preconfigs: Preconfig[] = [];
  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(PRECONFIGS_DIR, file), 'utf-8');
      preconfigs.push(JSON.parse(content) as Preconfig);
    } catch (e) {
      console.error(`Failed to read preconfig ${file}:`, e);
    }
  }
  
  return preconfigs.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getPreconfig(id: string): Promise<Preconfig | null> {
  await ensureDir();
  
  try {
    const content = await readFile(join(PRECONFIGS_DIR, `${id}.json`), 'utf-8');
    return JSON.parse(content) as Preconfig;
  } catch (e) {
    return null;
  }
}

export async function createPreconfig(preconfig: Omit<Preconfig, 'id'> & { id?: string }): Promise<Preconfig> {
  await ensureDir();
  
  const newPreconfig: Preconfig = {
    ...preconfig,
    id: preconfig.id || randomUUID(),
  };
  
  await writeFile(
    join(PRECONFIGS_DIR, `${newPreconfig.id}.json`),
    JSON.stringify(newPreconfig, null, 2)
  );
  
  return newPreconfig;
}

export async function updatePreconfig(id: string, updates: Partial<Omit<Preconfig, 'id'>>): Promise<Preconfig | null> {
  const existing = await getPreconfig(id);
  if (!existing) return null;
  
  const updated: Preconfig = {
    ...existing,
    ...updates,
    id, // Ensure id is not changed
  };
  
  await writeFile(
    join(PRECONFIGS_DIR, `${id}.json`),
    JSON.stringify(updated, null, 2)
  );
  
  return updated;
}

export async function deletePreconfig(id: string): Promise<boolean> {
  try {
    await unlink(join(PRECONFIGS_DIR, `${id}.json`));
    return true;
  } catch (e) {
    return false;
  }
}

export async function getDefaultPreconfig(): Promise<Preconfig | null> {
  const preconfigs = await listPreconfigs();
  return preconfigs.find(p => p.isDefault) || preconfigs[0] || null;
}
