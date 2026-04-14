declare const wx: any;
declare const tt: any;

const _api = typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null;
const THROTTLE_MS = 50;

interface SoundEntry { src: string; volume: number; }

class AudioManagerClass {
  private _sounds: Map<string, SoundEntry> = new Map();
  private _bgm: any = null;
  private _muted = false;
  private _bgmPending: { src: string; volume: number } | null = null;
  private _lastPlayTime: Map<string, number> = new Map();

  register(name: string, src: string, volume = 1): void {
    this._sounds.set(name, { src, volume });
  }

  play(name: string): void {
    if (this._muted || !_api) return;
    const entry = this._sounds.get(name);
    if (!entry) return;

    const now = Date.now();
    const last = this._lastPlayTime.get(name) || 0;
    if (now - last < THROTTLE_MS) return;
    this._lastPlayTime.set(name, now);

    try {
      const audio = _api.createInnerAudioContext();
      if (!audio) return;
      let done = false;
      const cleanup = () => { if (done) return; done = true; try { audio.destroy(); } catch {} };
      audio.volume = entry.volume;
      audio.onError(() => cleanup());
      audio.onEnded(() => cleanup());
      audio.src = entry.src;
      try { audio.play(); } catch { cleanup(); }
    } catch {}
  }

  playBGM(src: string, volume = 0.5): void {
    if (!_api) return;
    this.stopBGM();
    this._bgmPending = { src, volume };
    try {
      this._bgm = _api.createInnerAudioContext();
      if (!this._bgm) return;
      this._bgm.loop = true;
      this._bgm.volume = volume;
      this._bgm.onError(() => { try { this._bgm?.destroy?.(); } catch {} this._bgm = null; });
      this._bgm.onPlay(() => { this._bgmPending = null; });
      this._bgm.src = src;
      if (!this._muted) {
        try { this._bgm.play(); } catch {}
      }
    } catch { this._bgm = null; }
  }

  resumeOnInteraction(): void {
    if (this._bgmPending && !this._bgm) {
      this.playBGM(this._bgmPending.src, this._bgmPending.volume);
    } else if (this._bgm && this._bgmPending) {
      try { this._bgm.play(); } catch {}
      this._bgmPending = null;
    }
  }

  stopBGM(): void {
    if (this._bgm) {
      try { this._bgm.stop(); this._bgm.destroy(); } catch {}
      this._bgm = null;
    }
  }

  get muted(): boolean { return this._muted; }
  set muted(val: boolean) {
    this._muted = val;
    if (this._bgm) { try { val ? this._bgm.pause() : this._bgm.play(); } catch {} }
  }
}

export const AudioManager = new AudioManagerClass();
