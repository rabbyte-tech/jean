const input = JSON.parse(await Bun.stdin.text());
const { pattern, path, _include } = input;

// Simple grep implementation using ripgrep if available, otherwise fallback
const result = Bun.spawnSync(['rg', '-n', '--json', pattern, path], {
  maxBuffer: 1024 * 1024 * 10,
});

const matches: Array<{ file: string; line: number; content: string }> = [];

if (result.exitCode === 0) {
  const lines = result.stdout.toString().split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'match') {
        for (const match of parsed.data.matches) {
          matches.push({
            file: parsed.data.path.text,
            line: parsed.data.line_number,
            content: match.text,
          });
        }
      }
    } catch {
      // Skip non-JSON lines from ripgrep output
    }
  }
}

console.log(JSON.stringify({ matches }));
