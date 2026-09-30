import { describe, it, expect } from "vitest";
import { MidiParser, buildTimeline } from "../packages/core/src/midi.js";

/** Build a MIDI file: header + one MTrk chunk per `tracks` entry (byte arrays). */
function midiFile(tracks, { ticksPerBeat = 480, declaredLengths = [] } = {}) {
  const bytes = [
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1,
    (tracks.length >> 8) & 0xff, tracks.length & 0xff,
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff,
  ];
  tracks.forEach((data, i) => {
    const len = declaredLengths[i] ?? data.length;
    bytes.push(
      0x4d, 0x54, 0x72, 0x6b,
      (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff,
      ...data,
    );
  });
  return new Uint8Array(bytes).buffer;
}

const END_OF_TRACK = [0x00, 0xff, 0x2f, 0x00];

describe("MidiParser — well-formed input", () => {
  it("parses notes, running status and tempo", () => {
    const midi = MidiParser.parse(
      midiFile([
        [
          0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, // tempo 500000
          0x00, 0x90, 60, 100, // noteOn C4
          0x83, 0x60, 60, 0, // +480 ticks, running status, velocity 0 → noteOff
          ...END_OF_TRACK,
        ],
      ]),
    );
    expect(midi.ticksPerBeat).toBe(480);
    expect(midi.tracks[0].map((e) => e.type)).toEqual(["tempo", "noteOn", "noteOff", "end"]);

    const { timeline, duration } = buildTimeline(midi);
    expect(timeline).toHaveLength(2);
    expect(timeline[1].time).toBeCloseTo(0.5);
    expect(duration).toBeCloseTo(0.5);
  });

  it("applies tempo changes cumulatively, in tick order across tracks", () => {
    const { timeline } = buildTimeline({
      ticksPerBeat: 480,
      tracks: [
        [{ tick: 960, type: "noteOn", note: 60, velocity: 90, channel: 0 }],
        [
          { tick: 480, type: "tempo", usPerBeat: 1_000_000 },
          { tick: 0, type: "tempo", usPerBeat: 250_000 },
        ],
      ],
    });
    // 480 ticks at 0.25s/beat + 480 ticks at 1s/beat
    expect(timeline[0].time).toBeCloseTo(1.25);
  });
});

describe("MidiParser — hostile input fails fast (no hangs)", () => {
  it("clamps a track length that overruns the file", () => {
    const midi = MidiParser.parse(
      midiFile([END_OF_TRACK], { declaredLengths: [0xffffffff] }),
    );
    expect(midi.tracks[0]).toEqual([{ tick: 0, type: "end" }]);
  });

  it("rejects a variable-length quantity longer than 4 bytes", () => {
    const track = [0x00, 0xff, 0x01, 0xff, 0xff, 0xff, 0xff, 0x7f];
    expect(() => MidiParser.parse(midiFile([track]))).toThrow(/variable-length/);
  });

  it("rejects meta and sysex events that overrun their track", () => {
    expect(() => MidiParser.parse(midiFile([[0x00, 0xff, 0x01, 0x7f]]))).toThrow(/overruns/);
    expect(() => MidiParser.parse(midiFile([[0x00, 0xf0, 0x7f]]))).toThrow(/overruns/);
  });

  it("rejects a zero time division", () => {
    expect(() => MidiParser.parse(midiFile([END_OF_TRACK], { ticksPerBeat: 0 }))).toThrow(
      /time division/,
    );
  });

  it("rejects truncated note data instead of reading past the buffer", () => {
    expect(() => MidiParser.parse(midiFile([[0x00, 0x90, 60]]))).toThrow(/Unexpected end/);
  });

  it("stops at the last real track when the header promises more", () => {
    const buffer = new Uint8Array(midiFile([END_OF_TRACK]));
    buffer[11] = 0xff; // numTracks = 255
    expect(MidiParser.parse(buffer.buffer).tracks).toHaveLength(1);
  });

  it("rejects files over the size limit", () => {
    expect(() => MidiParser.parse(new ArrayBuffer(5 * 1024 * 1024 + 1))).toThrow(/too large/);
  });

  it("builds a timeline with many tempo changes in linear time", () => {
    const events = [];
    for (let i = 0; i < 100_000; i++) {
      events.push({ tick: i * 2, type: "tempo", usPerBeat: 500_000 });
      events.push({ tick: i * 2 + 1, type: "noteOn", note: 60, velocity: 90, channel: 0 });
    }
    const start = performance.now();
    const { timeline } = buildTimeline({ ticksPerBeat: 480, tracks: [events] });
    expect(timeline).toHaveLength(100_000);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
