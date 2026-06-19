import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { assemble } from "./assemble";
import type { RenderSpec, ResolvedAssets } from "./types";

const propsPath = process.argv[2];
const outPath = process.argv[3] || "out/reelity.mp4";
if (!propsPath) {
  console.error("usage: bun run src/cli.ts <props.json> [out.mp4]");
  process.exit(1);
}

const { spec, assets } = JSON.parse(await readFile(propsPath, "utf8")) as {
  spec: RenderSpec;
  assets: ResolvedAssets;
};

await mkdir(dirname(outPath), { recursive: true });
const t0 = Date.now();
const res = await assemble(spec, assets, outPath);
console.log(`rendered ${res.outPath} (${res.durationSec}s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
