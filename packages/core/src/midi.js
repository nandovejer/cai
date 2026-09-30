/**
 * CAI Design System — midi.js
 * MIDI parser + Web Audio API sequencer. Zero dependencies.
 *
 * Architecture:
 *   - MidiParser   → reads raw ArrayBuffer, emits structured events
 *   - buildTimeline → flattens tracks, converts ticks→seconds via tempo map
 *   - MidiPlayer   → schedules notes using Web Audio clock + sliding lookahead
 *                    (never uses setTimeout for note timing — only rAF for UI)
 *
 * Public API:
 *   await MidiPlayer.load(url)  → MidiPlayer instance
 *   .play() .pause() .stop() .seek(0..1)
 *   .setVolume(0..1) .setMute(bool)
 *   .duration .currentTime .paused .muted .volume
 *   .on('timeupdate'|'play'|'pause'|'ended'|'loadedmetadata'|'error', fn)
 */

/* ============================================================
   1. MIDI BINARY PARSER
   ============================================================ */

// Hard limits: MIDI files are untrusted input (any URL, user uploads).
// A malformed or hostile file must fail fast, never hang the main thread.
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_EVENTS     = 500_000;

export class MidiParser {
  static parse(buffer) {
    if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('MIDI file too large');

    const view  = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let   pos   = 0;

    // DataView throws RangeError past the end; u8 must do the same.
    const u32 = () => { const v = view.getUint32(pos); pos += 4; return v; };
    const u16 = () => { const v = view.getUint16(pos); pos += 2; return v; };
    const u8  = () => {
      if (pos >= bytes.length) throw new Error('Unexpected end of MIDI data');
      return bytes[pos++];
    };

    // Variable-length quantity: at most 4 bytes (28 bits) per the spec.
    const varlen = () => {
      let v = 0;
      for (let i = 0; i < 4; i++) {
        const b = u8();
        v = v * 128 + (b & 0x7f);
        if (!(b & 0x80)) return v;
      }
      throw new Error('Invalid variable-length quantity');
    };

    // Header
    if (u32() !== 0x4d546864) throw new Error('Not a MIDI file (missing MThd)');
    const headerLen   = u32(); // 6 in every known file
    const headerEnd   = pos + headerLen;
    const format      = u16();
    const numTracks   = u16();
    const timeDivision = u16();
    if (headerEnd < pos || headerEnd > bytes.length) throw new Error('Invalid MIDI header');
    pos = headerEnd;

    if (timeDivision & 0x8000) throw new Error('SMPTE time division not supported');
    const ticksPerBeat = timeDivision;
    if (ticksPerBeat === 0) throw new Error('Invalid MIDI time division');

    // Tracks
    const tracks = [];
    let eventCount = 0;

    for (let t = 0; t < numTracks; t++) {
      if (pos + 8 > bytes.length) break; // header promised more tracks than exist

      const tag = u32();
      const len = u32();
      // A declared length past the end of the file is clamped, not trusted
      const end = Math.min(pos + len, bytes.length);

      if (tag !== 0x4d54726b) { pos = end; continue; } // skip non-MTrk

      const events = [];
      let tick = 0;
      let runningStatus = 0;

      while (pos < end) {
        const delta = varlen();
        tick += delta;

        let status = u8();

        // Running status: byte < 0x80 means reuse last status
        if (status < 0x80) {
          status = runningStatus;
          pos--; // the byte IS the first data byte
        } else if (status < 0xf0) {
          // Only update running status for voice messages (not sysex/meta)
          runningStatus = status;
        }

        const type    = status & 0xf0;
        const channel = status & 0x0f;

        if (status === 0xff) {
          // Meta event
          const metaType = u8();
          const metaLen  = varlen();
          const metaEnd  = pos + metaLen;
          if (metaEnd > end) throw new Error('Meta event overruns its track');

          if (metaType === 0x51 && metaLen === 3) {
            // Tempo change: microseconds per beat
            const usPerBeat = (bytes[pos] << 16) | (bytes[pos+1] << 8) | bytes[pos+2];
            events.push({ tick, type: 'tempo', usPerBeat });
          } else if (metaType === 0x2f) {
            events.push({ tick, type: 'end' });
          }
          pos = metaEnd;

        } else if (status === 0xf0 || status === 0xf7) {
          // SysEx — skip
          const slen = varlen();
          if (pos + slen > end) throw new Error('SysEx event overruns its track');
          pos += slen;

        } else if (type === 0x90) {
          const note = u8(), velocity = u8();
          // noteOn with velocity=0 is actually noteOff (very common convention)
          events.push({
            tick,
            type: velocity > 0 ? 'noteOn' : 'noteOff',
            channel, note, velocity,
          });

        } else if (type === 0x80) {
          const note = u8(), velocity = u8();
          events.push({ tick, type: 'noteOff', channel, note, velocity });

        } else if (type === 0xa0) { pos += 2; } // aftertouch
        else if (type === 0xb0) { pos += 2; }   // control change
        else if (type === 0xc0) { pos += 1; }   // program change
        else if (type === 0xd0) { pos += 1; }   // channel pressure
        else if (type === 0xe0) { pos += 2; }   // pitch bend
        else { pos++; }                          // unknown, skip 1

        if (events.length + eventCount > MAX_EVENTS) throw new Error('MIDI file has too many events');
      }

      pos = end;
      eventCount += events.length;
      tracks.push(events);
    }

    return { format, ticksPerBeat, tracks };
  }
}


/* ============================================================
   2. TIMELINE BUILDER
   Flattens all tracks → [ { time (sec), type, note, velocity }, … ]
   Applies tempo map correctly across multiple tempo changes.
   ============================================================ */

export function buildTimeline(midi) {
  const { ticksPerBeat, tracks } = midi;

  // 1. Collect all tempo events from all tracks, sorted by tick
  //    (stable sort: same-tick changes keep file order, the last one wins)
  const tempoChanges = [{ tick: 0, usPerBeat: 500_000 }]; // default: 120 BPM

  for (const track of tracks) {
    for (const ev of track) {
      if (ev.type === 'tempo') tempoChanges.push({ tick: ev.tick, usPerBeat: ev.usPerBeat });
    }
  }
  tempoChanges.sort((a, b) => a.tick - b.tick);

  // 2. Build tick→seconds lookup: elapsed seconds at each tempo change,
  //    computed once so each lookup is a binary search, not a full scan
  const secondsAt = [0];
  for (let i = 1; i < tempoChanges.length; i++) {
    const prev = tempoChanges[i - 1];
    secondsAt.push(
      secondsAt[i - 1] +
        ((tempoChanges[i].tick - prev.tick) / ticksPerBeat) * (prev.usPerBeat / 1_000_000),
    );
  }

  function ticksToSeconds(targetTick) {
    // Last tempo change at or before targetTick
    let lo = 0, hi = tempoChanges.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (tempoChanges[mid].tick <= targetTick) lo = mid;
      else hi = mid - 1;
    }
    const { tick, usPerBeat } = tempoChanges[lo];
    return secondsAt[lo] + ((targetTick - tick) / ticksPerBeat) * (usPerBeat / 1_000_000);
  }

  // 3. Flatten all note events
  const timeline = [];
  let maxTick = 0;

  for (const track of tracks) {
    for (const ev of track) {
      if (ev.tick > maxTick) maxTick = ev.tick;
      if (ev.type === 'noteOn' || ev.type === 'noteOff') {
        timeline.push({ ...ev, time: ticksToSeconds(ev.tick) });
      }
    }
  }

  timeline.sort((a, b) => a.time - b.time || (a.type === 'noteOff' ? -1 : 1));

  const duration = ticksToSeconds(maxTick);
  return { timeline, duration };
}


/* ============================================================
   3. FREQUENCY HELPER
   ============================================================ */

const midiToFreq = note => 440 * Math.pow(2, (note - 69) / 12);


/* ============================================================
   4. MIDI PLAYER
   Uses Web Audio clock for note scheduling (accurate).
   Uses rAF only for UI updates (timeupdate events).
   ============================================================ */

const LOOKAHEAD_SEC  = 0.25;  // schedule notes this far ahead of AudioContext time

export class MidiPlayer {
  constructor() {
    this._ctx         = null;
    this._masterGain  = null;
    this._timeline    = [];
    this._duration    = 0;

    // Playback state
    this._playing       = false;   // true while playing (not paused)
    this._pauseOffset   = 0;       // seconds into track at last pause
    this._ctxTimeAtPlay = 0;       // ctx.currentTime when play() was called

    // Scheduling
    this._nextEventIdx  = 0;       // index into _timeline of next event to schedule
    this._activeNotes   = new Map(); // note → { osc, gain, stopTime }
    this._rafId         = null;

    // Public state
    this._muted  = false;
    this._volume = 1;

    this._listeners = {};
    this._loaded    = false;
  }

  /* ---- Properties ---- */

  get duration()    { return this._duration; }
  get paused()      { return !this._playing; }
  get muted()       { return this._muted; }
  get volume()      { return this._volume; }

  get currentTime() {
    if (!this._playing || !this._ctx) return this._pauseOffset;
    return Math.min(
      this._pauseOffset + (this._ctx.currentTime - this._ctxTimeAtPlay),
      this._duration,
    );
  }

  /* ---- Event emitter ---- */

  on(event, fn) {
    (this._listeners[event] ??= []).push(fn);
    return this;
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  /* ---- Load ---- */

  async load(url) {
    try {
      const res    = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      // Refuse oversized responses before buffering them
      if (Number(res.headers.get('content-length')) > MAX_FILE_BYTES) {
        throw new Error('MIDI file too large');
      }
      const buffer = await res.arrayBuffer();
      const midi   = MidiParser.parse(buffer);
      const { timeline, duration } = buildTimeline(midi);
      this._timeline = timeline;
      this._duration = Math.max(duration, 0.1);
      this._loaded   = true;
      this._emit('loadedmetadata');
    } catch (err) {
      this._emit('error', err);
      throw err;
    }
    return this;
  }

  /* ---- AudioContext (lazy — needs user gesture to create) ---- */

  _ensureCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
      this._masterGain.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  /* ---- Play ---- */

  play() {
    if (!this._loaded || this._playing) return;
    this._ensureCtx();
    this._playing       = true;
    this._ctxTimeAtPlay = this._ctx.currentTime;

    // Find index of first event at or after pauseOffset
    this._nextEventIdx = this._timeline.findIndex(ev => ev.time >= this._pauseOffset);
    if (this._nextEventIdx === -1) this._nextEventIdx = this._timeline.length;

    this._scheduleLoop();
    this._emit('play');
  }

  /* ---- Pause ---- */

  pause() {
    if (!this._playing) return;
    this._pauseOffset = this.currentTime;
    this._playing     = false;
    this._stopAllNotes();
    this._stopRaf();
    this._emit('pause');
  }

  /* ---- Stop / rewind ---- */

  stop() {
    // Bug 1.8 fix: always emit 'pause' after stop so consumers can reliably
    // reset their UI regardless of whether playback was active.
    // Contract: stop() always results in paused state at t=0.
    if (this._playing) this.pause();
    this._pauseOffset = 0;
    this._emit('pause');      // explicit pause signal for UI consumers
    this._emit('timeupdate'); // reset time display
  }

  /* ---- Seek ---- */

  seek(ratio) {
    const wasPlaying = this._playing;
    if (wasPlaying) {
      this._playing = false;
      this._stopAllNotes();
      this._stopRaf();
    }
    this._pauseOffset = Math.max(0, Math.min(1, ratio)) * this._duration;
    if (wasPlaying) {
      this._ctxTimeAtPlay = this._ctx.currentTime;
      this._playing       = true;
      this._nextEventIdx  = this._timeline.findIndex(ev => ev.time >= this._pauseOffset);
      if (this._nextEventIdx === -1) this._nextEventIdx = this._timeline.length;
      this._scheduleLoop();
    }
    this._emit('timeupdate');
  }

  /* ---- Volume / Mute ---- */

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._masterGain && !this._muted) {
      this._masterGain.gain.setTargetAtTime(this._volume, this._ctx.currentTime, 0.01);
    }
    this._emit('volumechange');
  }

  setMute(muted) {
    this._muted = !!muted;
    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(
        this._muted ? 0 : this._volume,
        this._ctx.currentTime, 0.01,
      );
    }
    this._emit('volumechange');
  }

  /* ============================================================
     SCHEDULER — Web Audio clock lookahead
     Called every rAF (~16ms). Schedules all notes whose
     absolute AudioContext time falls within the lookahead window.
     This is the standard Web Audio scheduling pattern and is
     immune to setTimeout jitter.
     ============================================================ */

  _scheduleLoop() {
    if (!this._playing) return;

    const ctx      = this._ctx;
    const now      = ctx.currentTime;
    // The AudioContext time corresponding to pauseOffset
    const baseTime = this._ctxTimeAtPlay - this._pauseOffset;
    const horizon  = now + LOOKAHEAD_SEC;

    while (this._nextEventIdx < this._timeline.length) {
      const ev      = this._timeline[this._nextEventIdx];
      const absTime = baseTime + ev.time; // when this event fires on ctx clock

      if (absTime > horizon) break; // beyond lookahead window — stop for now

      if (ev.type === 'noteOn') {
        this._scheduleNoteOn(ev.note, ev.velocity, Math.max(absTime, now));
      } else if (ev.type === 'noteOff') {
        this._scheduleNoteOff(ev.note, Math.max(absTime, now));
      }

      this._nextEventIdx++;
    }

    // Check end of track
    const trackEnd = baseTime + this._duration;
    if (now >= trackEnd - 0.05) {
      this._playing     = false;
      this._pauseOffset = 0;
      this._stopRaf();
      this._emit('ended');
      this._emit('pause');
      return;
    }

    // Emit timeupdate for UI and schedule next frame
    this._emit('timeupdate');
    this._rafId = requestAnimationFrame(() => this._scheduleLoop());
  }

  _stopRaf() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  /* ---- Note synthesis ---- */

  _scheduleNoteOn(note, velocity, absTime) {
    // If note is already playing (missing noteOff), stop it first
    const existing = this._activeNotes.get(note);
    if (existing) this._releaseNote(existing, absTime);

    const freq    = midiToFreq(note);
    const gainVal = (velocity / 127) * 0.15;

    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Attack envelope
    gain.gain.setValueAtTime(0, absTime);
    gain.gain.linearRampToValueAtTime(gainVal, absTime + 0.006);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(absTime);

    this._activeNotes.set(note, { osc, gain });
  }

  _scheduleNoteOff(note, absTime) {
    const node = this._activeNotes.get(note);
    if (!node) return;
    this._releaseNote(node, absTime);
    this._activeNotes.delete(note);
  }

  _releaseNote(node, absTime) {
    const release = 0.08;
    try {
      node.gain.gain.setTargetAtTime(0, absTime, release / 4);
      node.osc.stop(absTime + release + 0.02);
    } catch (_) {}
  }

  _stopAllNotes() {
    const now = this._ctx?.currentTime ?? 0;
    for (const node of this._activeNotes.values()) this._releaseNote(node, now);
    this._activeNotes.clear();
  }

  /* ---- Static factory ---- */

  static async load(url) {
    return new MidiPlayer().load(url);
  }
}
