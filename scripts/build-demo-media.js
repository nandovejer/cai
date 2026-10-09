/**
 * CAI — demo media for the player examples in apps/docs.
 * Every file is generated here, so it is the project's own work under the
 * repository's MIT licence (no third-party recordings, footage or scores).
 *
 *   sample.mid  original two-track melody, written byte by byte below
 *   audio.mp3   30 s of synthesised chords (ffmpeg aevalsrc), no metadata
 *   video.mp4   20 s abstract animation in the vejer palette, silent
 *
 * Needs ffmpeg with libmp3lame and libx264. Output is committed, so CI does
 * not need ffmpeg. Usage: node scripts/build-demo-media.js
 */

import { execFileSync } from "child_process";
import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/docs/assets");

/* ---- MIDI ---------------------------------------------------------------- */

const PPQ = 480;
const varLen = (n) => {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
};
const text = (type, s) => [0x00, 0xff, type, ...varLen(s.length), ...Buffer.from(s, "ascii")];
const chunk = (id, data) => {
  const len = data.length;
  return [...Buffer.from(id, "ascii"), len >>> 24, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff, ...data];
};

// notes: [midi note, beats]; 0 is a rest
function track(name, channel, program, velocity, notes) {
  const data = [...text(0x03, name), 0x00, 0xc0 | channel, program];
  let wait = 0;
  for (const [note, beats] of notes) {
    const ticks = Math.round(beats * PPQ);
    if (!note) {
      wait += ticks;
      continue;
    }
    data.push(...varLen(wait), 0x90 | channel, note, velocity);
    data.push(...varLen(ticks), 0x80 | channel, note, 0);
    wait = 0;
  }
  data.push(0x00, 0xff, 0x2f, 0x00);
  return chunk("MTrk", data);
}

// An original tune in A minor, 16 bars at 96 bpm (about 40 s)
const phrase = [
  [69, 1], [72, 0.5], [74, 0.5], [76, 1], [74, 1],
  [72, 1], [71, 0.5], [69, 0.5], [71, 2],
  [72, 1], [74, 0.5], [76, 0.5], [77, 1], [76, 1],
  [74, 1.5], [72, 0.5], [76, 2],
];
const answer = [
  [76, 1], [77, 0.5], [79, 0.5], [81, 1], [79, 1],
  [77, 1], [76, 0.5], [74, 0.5], [72, 2],
  [71, 1], [72, 0.5], [74, 0.5], [76, 1], [71, 1],
  [69, 3], [0, 1],
];
const bassBar = (root) => [[root, 1], [root + 7, 1], [root + 12, 1], [root + 7, 1]];
const bass = [45, 43, 41, 40, 45, 43, 41, 40, 45, 41, 43, 40, 45, 41, 40, 45].flatMap(bassBar);

const tempo = Math.round(60_000_000 / 96);
const conductor = chunk("MTrk", [
  ...text(0x03, "CAI demo melody"),
  ...text(0x02, "MIT License, CAI Design System"),
  0x00, 0xff, 0x51, 0x03, tempo >> 16, (tempo >> 8) & 0xff, tempo & 0xff,
  0x00, 0xff, 0x58, 0x04, 4, 2, 24, 8,
  0x00, 0xff, 0x2f, 0x00,
]);

const midi = Buffer.from([
  ...chunk("MThd", [0, 1, 0, 3, PPQ >> 8, PPQ & 0xff]),
  ...conductor,
  ...track("Melody", 0, 0, 90, [...phrase, ...answer, ...phrase, ...answer]),
  ...track("Bass", 1, 32, 70, bass),
]);
writeFileSync(resolve(out, "sample.mid"), midi);
console.log(`✓ sample.mid (${midi.length} bytes)`);

/* ---- Audio --------------------------------------------------------------- */

const chord = (a, b) => `if(lt(mod(t,8),4),${a},${b})`;
const tone = (a, b) => `sin(2*PI*${chord(a, b)}*t)`;
const audioExpr =
  `0.12*(${tone(261.63, 220)}+${tone(329.63, 261.63)}+${tone(392, 329.63)})` +
  "*(0.6+0.4*sin(2*PI*t/2))*min(1,t/2)*min(1,(30-t)/3)";

const ffmpeg = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

ffmpeg([
  "-f", "lavfi", "-i", `aevalsrc=exprs='${audioExpr}':s=44100:d=30`,
  "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k",
  "-map_metadata", "-1", "-id3v2_version", "0", "-write_xing", "0",
  resolve(out, "audio.mp3"),
]);
console.log("✓ audio.mp3");

/* ---- Video --------------------------------------------------------------- */

// Whitewash wall, a sky-blue arch window, a sun crossing it, sandstone
// ground and a terracotta band: vejer palette, no text, no sound.
const W = 640;
const H = 360;
const graph =
  `color=c=0xfbf8f2:s=${W}x${H}:d=20:r=25,` +
  `drawbox=x=220:y=60:w=200:h=240:color=0x6fb1ec:t=fill,` +
  `drawbox=x=220:y=60:w=200:h=120:color=0x2365a6@0.35:t=fill[sky];` +
  `color=c=0xf3d27a:s=36x36:d=20:r=25[sun];` +
  // overlay evaluates x and y on every frame: the sun rises across the window
  `[sky][sun]overlay=x='236+t*7':y='250-t*8':shortest=1,` +
  `drawbox=x=0:y=300:w=${W}:h=60:color=0xc9a46a:t=fill,` +
  `drawbox=x=0:y=292:w=${W}:h=8:color=0xc8643c:t=fill,` +
  `drawbox=x=210:y=50:w=220:h=10:color=0x231c16:t=fill,` +
  `drawbox=x=210:y=50:w=10:h=250:color=0x231c16:t=fill,` +
  `drawbox=x=420:y=50:w=10:h=250:color=0x231c16:t=fill,` +
  `fade=t=in:st=0:d=1,fade=t=out:st=19:d=1[out0]`;

ffmpeg([
  "-f", "lavfi", "-i", graph,
  "-c:v", "libx264", "-preset", "slow", "-profile:v", "main", "-crf", "28", "-g", "50", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", "-an", "-map_metadata", "-1",
  resolve(out, "video.mp4"),
]);
console.log("✓ video.mp4");
