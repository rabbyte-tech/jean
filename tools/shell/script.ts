const input = JSON.parse(await Bun.stdin.text());
const { command, cwd } = input;

const result = Bun.spawnSync(['sh', '-c', command], {
  cwd: cwd || process.cwd(),
  maxBuffer: 1024 * 1024 * 10, // 10MB
});

console.log(JSON.stringify({
  stdout: result.stdout.toString(),
  stderr: result.stderr.toString(),
  exitCode: result.exitCode,
}));
