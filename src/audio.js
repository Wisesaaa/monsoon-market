// Yardline — every sound is synthesized with WebAudio: no audio files,
// no network, nothing to download. A gunshot is a sharp crack (filtered
// noise) plus a low thump; reloads are mechanical clicks; footsteps are soft
// thuds; the hit marker is a crisp tick. One master gain keeps the mix sane.
export function createAudio() {
  let ctx = null;
  let master = null;
  let windGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      startWind();
      return true;
    } catch {
      return false;
    }
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // faint desert wind, always under the mix
  function startWind() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    windGain = ctx.createGain();
    windGain.gain.value = 0.03;
    src.connect(filter).connect(windGain).connect(master);
    src.start();
  }

  function burst({ freq = 1200, dur = 0.12, type = 'lowpass', gain = 0.5, slideTo = null, delay = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function tone({ freq = 440, dur = 0.08, type = 'square', gain = 0.12, delay = 0, slideTo = null }) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }

  // a gunshot: sharp crack + low body thump
  function gunshot(kind, distant) {
    const g = distant ? 0.1 : 0.55;
    if (kind === 'smg') {
      burst({ freq: 2600, dur: 0.05, type: 'highpass', gain: g * 0.7, slideTo: 900 });
      burst({ freq: 900, dur: 0.07, gain: g * 0.5, slideTo: 250 });
      tone({ freq: 110, dur: 0.07, type: 'sine', gain: g * 0.35 });
    } else if (kind === 'dmr') {
      burst({ freq: 1400, dur: 0.16, type: 'highpass', gain: g, slideTo: 500 });
      burst({ freq: 500, dur: 0.28, gain: g * 0.8, slideTo: 120 });
      tone({ freq: 70, dur: 0.26, type: 'sine', gain: g * 0.6 });
    } else if (kind === 'shotgun') {
      burst({ freq: 1000, dur: 0.2, type: 'highpass', gain: g, slideTo: 300 });
      burst({ freq: 350, dur: 0.32, gain: g * 0.9, slideTo: 90 });
      tone({ freq: 60, dur: 0.3, type: 'sine', gain: g * 0.65 });
    } else if (kind === 'pistol') {
      burst({ freq: 3000, dur: 0.045, type: 'highpass', gain: g * 0.75, slideTo: 1200 });
      burst({ freq: 1100, dur: 0.06, gain: g * 0.45, slideTo: 350 });
      tone({ freq: 130, dur: 0.06, type: 'sine', gain: g * 0.3 });
    } else {
      // rifle
      burst({ freq: 2000, dur: 0.09, type: 'highpass', gain: g, slideTo: 600 });
      burst({ freq: 700, dur: 0.14, gain: g * 0.7, slideTo: 180 });
      tone({ freq: 85, dur: 0.13, type: 'sine', gain: g * 0.5 });
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    shot(kind, distant) {
      if (!ensure()) return;
      gunshot(kind, distant);
    },
    dryFire() {
      if (!ensure()) return;
      tone({ freq: 1200, dur: 0.03, type: 'square', gain: 0.08 });
    },
    reload() {
      if (!ensure()) return;
      // mag release click, mag out, mag in, rack
      burst({ freq: 1800, dur: 0.03, type: 'bandpass', gain: 0.16 });
      burst({ freq: 900, dur: 0.04, type: 'bandpass', gain: 0.14, delay: 0.35 });
      burst({ freq: 1200, dur: 0.03, type: 'bandpass', gain: 0.16, delay: 0.7 });
      burst({ freq: 2400, dur: 0.04, type: 'highpass', gain: 0.18, delay: 1.05 });
    },
    hit(killed) {
      if (!ensure()) return;
      tone({ freq: killed ? 2100 : 1500, dur: 0.04, type: 'square', gain: 0.13 });
      if (killed) tone({ freq: 2600, dur: 0.05, type: 'square', gain: 0.11, delay: 0.05 });
    },
    step() {
      if (!ensure()) return;
      burst({ freq: 300, dur: 0.06, gain: 0.07, slideTo: 140 });
    },
    plantBeep() {
      if (!ensure()) return;
      tone({ freq: 880, dur: 0.09, gain: 0.14 });
    },
    explode() {
      if (!ensure()) return;
      burst({ freq: 300, dur: 0.9, gain: 0.7, slideTo: 60 });
      tone({ freq: 50, dur: 0.8, type: 'sine', gain: 0.5 });
    },
    radio() {
      if (!ensure()) return;
      tone({ freq: 1400, dur: 0.03, gain: 0.06 });
      tone({ freq: 1800, dur: 0.03, gain: 0.06, delay: 0.06 });
    },
    buy() {
      if (!ensure()) return;
      tone({ freq: 660, dur: 0.05, gain: 0.1 });
      tone({ freq: 990, dur: 0.06, gain: 0.1, delay: 0.07 });
    },
    roundStart() {
      if (!ensure()) return;
      tone({ freq: 523, dur: 0.1, gain: 0.1 });
      tone({ freq: 784, dur: 0.14, gain: 0.1, delay: 0.11 });
    },
  };
}
