/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class WebAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentBgm: { oscs: OscillatorNode[]; gains: GainNode[]; timer?: number } | null = null;
  private customMusicSource: AudioBufferSourceNode | null = null;
  private customMusicBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy initialize when first user interaction occurs
  }

  setCustomMusicBuffer(buffer: AudioBuffer | null) {
    this.customMusicBuffer = buffer;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(mute: boolean) {
    this.isMuted = mute;
    if (mute) {
      this.stopMusic();
    }
  }

  getMuted() {
    return this.isMuted;
  }

  playBark(highPitch: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const baseFreq = highPitch ? 250 : 130;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    // Double-bark effect!
    setTimeout(() => {
      if (this.isMuted || !this.ctx) return;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(baseFreq * 1.1, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, this.ctx.currentTime + 0.1);

      gain2.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.12);
    }, 100);
  }

  playCollect(isRare: boolean = false, isToken: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    const startFreq = isToken ? 880 : isRare ? 659.25 : 523.25; // C5(523), E5(659), A5(880)
    const endFreq = isToken ? 1320 : isRare ? 987.77 : 783.99; // G5(783), B5(987), E6(1320)

    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(isToken ? 0.08 : 0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playPowerup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Upward arpeggio code
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major
    notes.forEach((freq, index) => {
      setTimeout(() => {
        if (this.isMuted || !this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(0.06, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        o.start();
        o.stop(this.ctx.currentTime + 0.15);
      }, index * 40);
    });
  }

  playCrash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Low rumble crash
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);

    // Crack crack noise!
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.connect(crackGain);
    crackGain.connect(this.ctx.destination);
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(80, this.ctx.currentTime);
    crackGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    crackOsc.start();
    crackOsc.stop(this.ctx.currentTime + 0.2);
  }

  playHowl() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Beautiful sustained sliding slide sweep representing a cute dog howl
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.8);
    osc.frequency.exponentialRampToValueAtTime(450, now + 1.2);
    osc.frequency.linearRampToValueAtTime(220, now + 1.8);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.08, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

    osc.start();
    osc.stop(now + 1.9);
  }

  playDig() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Small dirty scraping sounds
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (this.isMuted || !this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(80 + Math.random() * 40, this.ctx.currentTime);
        g.gain.setValueAtTime(0.05, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        o.start();
        o.stop(this.ctx.currentTime + 0.08);
      }, i * 150);
    }
  }

  playLevelUp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (this.isMuted || !this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(0.07, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        o.start();
        o.stop(this.ctx.currentTime + 0.3);
      }, idx * 60);
    });
  }

  startMusic() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopMusic();

    // Loop custom background audio selected from Google Drive if loaded!
    if (this.customMusicBuffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.customMusicBuffer;
        source.loop = true;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime); // customized comfortable audio mixing level
        
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0);

        this.customMusicSource = source;
        this.currentBgm = {
          oscs: [],
          gains: [],
        };
        return;
      } catch (err) {
        console.error('Error starting custom Drive music buffer:', err);
      }
    }

    const bpm = 124;
    const beatSec = 60 / bpm;
    let step = 0;

    // Melody notes (A minor key, fun energetic athletic rhythm)
    const melody = [
      440.00, 493.88, 523.25, 587.33, 659.25, 587.33, 659.25, 698.46,
      783.99, 698.46, 659.25, 587.33, 523.25, 493.88, 440.00, 392.00
    ];
    const bass = [
      110.00, 110.00, 130.81, 130.81, 146.83, 146.83, 164.81, 164.81,
      146.83, 146.83, 130.81, 130.81, 110.00, 110.00, 98.00, 98.00
    ];

    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    const playStep = () => {
      if (this.isMuted || !this.ctx) return;

      const time = this.ctx.currentTime;

      // Bass beat on every step scale
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.connect(bGain);
      bGain.connect(this.ctx.destination);
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bass[step % bass.length], time);

      bGain.gain.setValueAtTime(0.06, time);
      bGain.gain.exponentialRampToValueAtTime(0.001, time + beatSec * 0.9);

      bOsc.start(time);
      bOsc.stop(time + beatSec * 0.9);

      // Energetic melody notes on alternate beats
      if (step % 2 === 0 || Math.random() > 0.4) {
        const mOsc = this.ctx.createOscillator();
        const mGain = this.ctx.createGain();
        mOsc.connect(mGain);
        mGain.connect(this.ctx.destination);
        mOsc.type = 'sine';
        mOsc.frequency.setValueAtTime(melody[(step * 3) % melody.length], time);

        mGain.gain.setValueAtTime(0.02, time);
        mGain.gain.exponentialRampToValueAtTime(0.001, time + beatSec * 0.45);

        mOsc.start(time);
        mOsc.stop(time + beatSec * 0.45);
      }

      step = (step + 1) % 16;
    };

    // Set playing loop timer
    const intervalId = window.setInterval(playStep, beatSec * 1000);

    this.currentBgm = {
      oscs: [],
      gains: [],
      timer: intervalId
    };
  }

  stopMusic() {
    if (this.customMusicSource) {
      try {
        this.customMusicSource.stop();
      } catch (e) {}
      this.customMusicSource = null;
    }

    if (this.currentBgm) {
      if (this.currentBgm.timer) {
        clearInterval(this.currentBgm.timer);
      }
      this.currentBgm.oscs.forEach(o => { try { o.stop(); } catch(e){} });
      this.currentBgm = null;
    }
  }
}

export const GameAudio = new WebAudioSynthesizer();
