# Reelity render service

Standalone Remotion microservice that turns a `{ spec, assets }` payload into a 720×1280
vertical MP4. Deployed independently (e.g. on an Oracle server) and reached by the Cloudflare
Worker over a tunnel.

## Local

```bash
bun install
bun run studio    # preview / iterate the composition
bun run render    # render the sample to out/reelity.mp4
bun run typecheck
```

## Docker

```bash
docker build -t reelity-render .
docker run --rm -v "$PWD/out:/app/out" reelity-render   # renders the sample into ./out
```

The image bundles Chrome Headless Shell, ffmpeg, and emoji/display fonts, so it renders with no
host dependencies. Built for arm64 to match Oracle Ampere.

## Files

- `src/types.ts` — the `RenderSpec` / `ResolvedAssets` contract (mirrors the Worker).
- `src/video.tsx` — the composition: templates, kinetic captions, GIF punch, end card, audio.
- `src/root.tsx` — registers the composition + its sample default props.
- `src/index.ts` — Remotion entrypoint.
