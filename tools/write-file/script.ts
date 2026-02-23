const input = JSON.parse(await Bun.stdin.text());
const { path, content } = input;

try {
  await Bun.write(path, content);
  console.log(JSON.stringify({ success: true }));
} catch (e) {
  console.log(JSON.stringify({ success: false, error: (e as Error).message }));
}
