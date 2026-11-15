// Monsoon Market — every sound is synthesized with WebAudio: no audio files,
// no network, nothing to download. A tiny synth per sound, all through one
// master gain so the mix stays quiet under the rain.
export function createAudio() {
  let ctx = null;
  let master = null;
  let rainGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      startRain();
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

  function startRain() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0.05;
    src.connect(filter).connect(rainGain).connect(master);
    src.start();
  }

  function burst({ freq = 1200, dur = 0.12, type = 'lowpass', gain = 0.5, slideTo = null }) {
    if (!ctx) return;
    const t = ctx.currentTime;
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

  function tone({ freq = 440, dur = 0.08, type = 'square', gain = 0.12 }) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    shot(kind, distant) {
      if (!ensure()) return;
      const g = distant ? 0.12 : 0.5;
      if (kind === 'smg') burst({ freq: 1800, dur: 0.07, gain: g * 0.8, slideTo: 500 });
      else if (kind === 'dmr') { burst({ freq: 900, dur: 0.22, gain: g, slideTo: 200 }); tone({ freq: 90, dur: 0.18, type: 'sine', gain: g * 0.7 }); }
      else if (kind === 'shotgun') burst({ freq: 700, dur: 0.25, gain: g, slideTo: 150 });
      else if (kind === 'pistol') burst({ freq: 2200, dur: 0.06, gain: g * 0.7, slideTo: 700 });
      else burst({ freq: 1400, dur: 0.1, gain: g, slideTo: 300 });
    },
    dryFire() {
      if (!ensure()) return;
      tone({ freq: 1200, dur: 0.03, type: 'square', gain: 0.08 });
    },
    reload() {
      if (!ensure()) return;
      tone({ freq: 500, dur: 0.04, gain: 0.1 });
      setTimeout(() => tone({ freq: 700, dur: 0.04, gain: 0.1 }), 350);
      setTimeout(() => tone({ freq: 900, dur: 0.04, gain: 0.12 }), 700);
    },
    hit(killed) {
      if (!ensure()) return;
      tone({ freq: killed ? 1600 : 1100, dur: 0.05, type: 'square', gain: 0.14 });
    },
    step() {
      if (!ensure()) return;
      burst({ freq: 500, dur: 0.05, gain: 0.05, slideTo: 200 });
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
      setTimeout(() => tone({ freq: 1800, dur: 0.03, gain: 0.06 }), 60);
    },
    buy() {
      if (!ensure()) return;
      tone({ freq: 660, dur: 0.05, gain: 0.1 });
      setTimeout(() => tone({ freq: 990, dur: 0.06, gain: 0.1 }), 70);
    },
    roundStart() {
      if (!ensure()) return;
      tone({ freq: 523, dur: 0.1, gain: 0.1 });
      setTimeout(() => tone({ freq: 784, dur: 0.14, gain: 0.1 }), 110);
    },
  };
}
