FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ffmpeg fonts-liberation fonts-noto-color-emoji ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g bun

WORKDIR /app
COPY package.json ./
RUN bun install

COPY . .

CMD ["bun", "run", "src/cli.ts", "props.json", "out/reelity.mp4"]
