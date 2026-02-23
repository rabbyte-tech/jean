const input = JSON.parse(await Bun.stdin.text());
const path = input.path;

try {
  const content = await Bun.file(path).text();
  console.log(JSON.stringify({ content }));
} catch (e) {
  console.log(JSON.stringify({ error: (e as Error).message }));
}
