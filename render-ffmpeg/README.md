# Reelity render service (ffmpeg)

Active render path. Turns a `{ spec, assets }` payload into a 1080×1920 vertical MP4 with a
single ffmpeg pass — full-frame hero clip/GIF, one static meme caption, and a trending-audio
bed. Deployed independently (e.g. on an Oracle server) and reached by the Cloudflare Worker.

Two layouts, chosen by `spec.format`:

- **reaction** — a full-frame reaction clip (or GIF, or gradient fallback) fills the frame; the
  caption sits in the upper third. Matches most of the reference examples.
- **composite** — a scenic background clip/photo with a reaction GIF overlaid lower-center, plus
  the caption.

## Local

```bash
bun install
bun run render props.json out/reel.mp4   # props.json is { spec, assets }
bun run typecheck
```

`props.json` is the `{ spec, assets }` payload the Worker sends (see `src/types.ts`). Captions
render with the bundled `assets/fonts/Inter-Bold.ttf`; override with `REELITY_FONT`.

## Docker

```bash
docker build -t reelity-render-ffmpeg .
docker run --rm -v "$PWD/out:/app/out" -v "$PWD/props.json:/app/props.json" reelity-render-ffmpeg
```

The image bundles ffmpeg and display/emoji fonts, so it renders with no host dependencies.

## Files

- `src/types.ts` — the `RenderSpec` / `ResolvedAssets` contract (mirrors the Worker).
- `src/assemble.ts` — downloads assets, wraps the caption, builds the ffmpeg filter graph, renders.
- `src/cli.ts` — reads a props JSON and renders to a file.

> The Remotion implementation in `../render-service` is kept as a fallback path (kinetic
> captions / per-frame animation) and can be brought back if richer motion is needed.
