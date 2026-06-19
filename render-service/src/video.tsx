import type { FC } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Gif } from "@remotion/gif";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import type { BackgroundAsset, RenderSpec, ResolvedAssets } from "./types";

export const FPS = 30;
export const WIDTH = 720;
export const HEIGHT = 1280;
export const BEAT_FRAMES = 58;
export const PUNCH_EXTRA = 22;
export const END_CARD_FRAMES = 60;

export const durationFor = (beats: number) =>
  Math.max(1, beats) * BEAT_FRAMES + PUNCH_EXTRA + END_CARD_FRAMES;

const display = loadAnton().fontFamily;
const body = loadInter().fontFamily;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const beatPunch = (frame: number, starts: number[]) => {
  let p = 0;
  for (const s of starts) {
    if (frame >= s) {
      p = Math.max(p, interpolate(frame - s, [0, 4, 14], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    }
  }
  return 1 + p * 0.06;
};

const Background: FC<{ asset: BackgroundAsset; accent: string; beatStarts: number[] }> = ({ asset, accent, beatStarts }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.05, 1.16]) * beatPunch(frame, beatStarts);
  const cover = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` } as const;

  if (asset.kind === "video" && asset.url) {
    return (
      <AbsoluteFill>
        <OffthreadVideo src={asset.url} muted style={cover} />
      </AbsoluteFill>
    );
  }
  const img = asset.url ?? asset.poster;
  if (img) {
    return (
      <AbsoluteFill>
        <Img src={img} style={cover} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, background: `radial-gradient(circle at 30% 18%, ${accent}, #0b0b12 70%)` }} />
  );
};

const Vignette: FC = () => (
  <AbsoluteFill
    style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.78) 100%)" }}
  />
);

const wordStyle = {
  display: "inline-block",
  fontFamily: display,
  fontSize: 76,
  lineHeight: 1,
  textTransform: "uppercase",
  borderRadius: 14,
} as const;

const Caption: FC<{ text: string; accent: string; hold: number; top: string }> = ({ text, accent, hold, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const per = Math.max(7, hold / (words.length + 0.7));
  const activeIdx = Math.min(words.length - 1, Math.floor(frame / per));
  const intro = spring({ frame, fps, config: { damping: 16, stiffness: 190, mass: 0.6 } });
  const exit = interpolate(frame, [hold - 9, hold], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          padding: "0 44px",
          opacity: Math.min(intro, exit),
          transform: `translateY(${interpolate(intro, [0, 1], [60, 0])}px)`,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 14 }}>
          {words.map((word, i) => {
            const active = i === activeIdx;
            const pop = spring({ frame: frame - Math.round(i * per), fps, config: { damping: 12, stiffness: 200, mass: 0.5 } });
            const scale = active ? interpolate(pop, [0, 1], [1.35, 1.1], { extrapolateRight: "clamp" }) : 1;
            return (
              <span
                key={i}
                style={{
                  ...wordStyle,
                  color: active ? "#0b0b12" : "#fff",
                  background: active ? accent : "transparent",
                  padding: active ? "4px 14px" : "4px 2px",
                  transform: `scale(${scale}) rotate(${active ? -2 : 0}deg)`,
                  WebkitTextStroke: active ? "0" : "2px rgba(0,0,0,0.5)",
                  textShadow: active ? "none" : "0 6px 22px rgba(0,0,0,0.65)",
                  boxShadow: active ? `0 12px 32px ${accent}aa` : "none",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GifPunch: FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 200, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.1, 1], { extrapolateRight: "clamp" });
  const shake = frame < 14 ? Math.sin(frame * 3) * (1 - frame / 14) * 7 : Math.sin(frame / 7) * 2;
  const flash = interpolate(frame, [0, 5], [0.65, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: "18%" }}>
      <div style={{ position: "relative", transform: `scale(${scale}) rotate(${shake}deg)` }}>
        <div style={{ borderRadius: 28, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 24px 70px rgba(0,0,0,0.6)" }}>
          <Gif src={src} width={360} height={360} fit="cover" />
        </div>
        <AbsoluteFill style={{ background: "#fff", opacity: flash, borderRadius: 28 }} />
      </div>
    </AbsoluteFill>
  );
};

const EMOJIS = ["🔥", "✨", "💀", "😭", "🤯", "💅", "🚀", "👀", "💯", "🙌"];
const EmojiBurst: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = spring({ frame, fps, config: { damping: 12 } });
  const count = 16;
  return (
    <AbsoluteFill>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = interpolate(burst, [0, 1], [0, 320]);
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist - frame * 1.4;
        const opacity = interpolate(frame, [0, 8, 42, 58], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: "50%", top: "60%", fontSize: 52, transform: `translate(${x}px, ${y}px)`, opacity }}>
            {EMOJIS[i % EMOJIS.length]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const TopBar: FC<{ product: string }> = ({ product }) => (
  <AbsoluteFill style={{ padding: 28 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: body, color: "#fff" }}>
      <span style={{ fontWeight: 700, fontSize: 24, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>@{slug(product)}</span>
      <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 3, opacity: 0.85 }}>REELITY</span>
    </div>
  </AbsoluteFill>
);

const ProgressBar: FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const width = interpolate(frame, [0, durationInFrames], [0, 100]);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end" }}>
      <div style={{ height: 6, background: "rgba(255,255,255,0.25)" }}>
        <div style={{ height: "100%", width: `${width}%`, background: accent }} />
      </div>
    </AbsoluteFill>
  );
};

const EndCard: FC<{ spec: RenderSpec; accent: string }> = ({ spec, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 9, stiffness: 180, mass: 0.7 } });
  const scale = interpolate(s, [0, 1], [1.7, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const glow = 26 + Math.sin(frame / 7) * 16;
  const host = (spec.siteUrl || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center", padding: "0 56px" }}>
        <div style={{ fontFamily: display, fontSize: 96, color: "#fff", textTransform: "uppercase", textShadow: `0 0 ${glow}px ${accent}` }}>
          {spec.productName}
        </div>
        {host && <div style={{ fontFamily: body, fontSize: 34, fontWeight: 700, color: accent, marginTop: 12 }}>{host}</div>}
        <div style={{ fontFamily: body, fontSize: 20, color: "rgba(255,255,255,0.6)", marginTop: 30, letterSpacing: 1 }}>made with Reelity</div>
      </div>
    </AbsoluteFill>
  );
};

const Flash: FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6], [0.75, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#fff", opacity }} />;
};

export type UgcProps = { spec: RenderSpec; assets: ResolvedAssets };

export const UgcVideo: FC<UgcProps> = ({ spec, assets }) => {
  const { durationInFrames } = useVideoConfig();
  const accent = spec.accentColor || "#a855f7";
  const beats = spec.caption ?? [];
  const n = Math.max(1, beats.length);
  const beatStarts = beats.map((_, i) => i * BEAT_FRAMES);
  const lastStart = (n - 1) * BEAT_FRAMES;
  const punchHold = BEAT_FRAMES + PUNCH_EXTRA;
  const endCardStart = n * BEAT_FRAMES + PUNCH_EXTRA;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Background asset={assets.background} accent={accent} beatStarts={beatStarts} />
      <Vignette />
      <TopBar product={spec.productName} />

      {beats.map((beat, i) => {
        const isLast = i === n - 1;
        const hold = isLast ? punchHold : BEAT_FRAMES;
        return (
          <Sequence key={i} from={i * BEAT_FRAMES} durationInFrames={hold} name={`cap-${i}`}>
            <Caption text={beat.text} accent={accent} hold={hold} top={isLast ? "22%" : "38%"} />
          </Sequence>
        );
      })}

      <Sequence from={lastStart} durationInFrames={punchHold} name="punch">
        {assets.gif ? <GifPunch src={assets.gif.url} /> : <EmojiBurst />}
      </Sequence>

      <ProgressBar accent={accent} />

      <Sequence from={endCardStart} name="end">
        <EndCard spec={spec} accent={accent} />
      </Sequence>

      <Flash />

      {assets.audio && (
        <Audio
          src={assets.audio.url}
          volume={(f) =>
            interpolate(f, [0, 8, durationInFrames - 18, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};
