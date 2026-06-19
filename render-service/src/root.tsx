import type { FC } from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, UgcVideo, WIDTH, durationFor, type UgcProps } from "./video";

const defaultProps: UgcProps = {
  spec: {
    productName: "",
    siteUrl: "",
    concept: "",
    caption: [],
    pexelsQuery: "",
    giphyQuery: "",
    audioVibe: "",
    accentColor: "#a855f7",
  },
  assets: {
    background: { kind: "gradient", source: "gradient" },
    gif: null,
    audio: null,
  },
};

export const RemotionRoot: FC = () => (
  <Composition
    id="UgcVideo"
    component={UgcVideo}
    durationInFrames={durationFor(4)}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({
      durationInFrames: durationFor(props.spec.caption?.length ?? 1),
    })}
  />
);
