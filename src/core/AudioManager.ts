declare const wx: any;
declare const tt: any;

const _api = typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null;
const THROTTLE_MS = 50;
const MUSIC_MUTED_KEY = 'caizhu_audio_music_muted';
const SFX_MUTED_KEY = 'caizhu_audio_sfx_muted';

interface SoundEntry { src: string; volume: number; }

class AudioManagerClass {
  private _sounds: Map<string, SoundEntry> = new Map();
  private _bgm: any = null;
  private _musicMuted = this._readMuted(MUSIC_MUTED_KEY);
  private _sfxMuted = this._readMuted(SFX_MUTED_KEY);
  private _bgmPending: { src: string; volume: number } | null = null;
  private _bgmSrc = '';
  private _lastPlayTime: Map<string, number> = new Map();

  register(name: string, src: string, volume = 1): void {
    this._sounds.set(name, { src, volume });
  }

  play(name: string): void {
    if (this._sfxMuted || !_api) return;
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
    if (this._bgm && this._bgmSrc === src) {
      try { this._bgm.volume = volume; } catch {}
      if (!this._musicMuted) {
        try { this._bgm.play(); } catch {}
      }
      return;
    }
    if (!this._bgm && this._bgmPending?.src === src) {
      this._bgmPending.volume = volume;
      return;
    }
    this.stopBGM();
    this._bgmPending = { src, volume };
    try {
      this._bgm = _api.createInnerAudioContext();
      if (!this._bgm) return;
      this._bgmSrc = src;
      this._bgm.loop = true;
      this._bgm.volume = volume;
      this._bgm.onError(() => {
        try { this._bgm?.destroy?.(); } catch {}
        this._bgm = null;
        this._bgmSrc = '';
      });
      this._bgm.onPlay(() => { this._bgmPending = null; });
      this._bgm.src = src;
      if (!this._musicMuted) {
        try { this._bgm.play(); } catch {}
      }
    } catch { this._bgm = null; }
  }

  resumeOnInteraction(): void {
    if (this._musicMuted) return;
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
    this._bgmSrc = '';
  }

  get muted(): boolean { return this._musicMuted && this._sfxMuted; }
  set muted(val: boolean) {
    this.musicMuted = val;
    this.sfxMuted = val;
  }

  get musicMuted(): boolean { return this._musicMuted; }
  set musicMuted(val: boolean) {
    this._musicMuted = val;
    this._writeMuted(MUSIC_MUTED_KEY, val);
    if (this._bgm) { try { val ? this._bgm.pause() : this._bgm.play(); } catch {} }
  }

  get sfxMuted(): boolean { return this._sfxMuted; }
  set sfxMuted(val: boolean) {
    this._sfxMuted = val;
    this._writeMuted(SFX_MUTED_KEY, val);
  }

  private _readMuted(key: string): boolean {
    try {
      const api = _api || (typeof localStorage !== 'undefined' ? localStorage : null);
      const value = api?.getStorageSync ? api.getStorageSync(key) : api?.getItem?.(key);
      return value === '1' || value === 'true';
    } catch {
      return false;
    }
  }

  private _writeMuted(key: string, muted: boolean): void {
    try {
      const api = _api || (typeof localStorage !== 'undefined' ? localStorage : null);
      const value = muted ? '1' : '0';
      if (api?.setStorageSync) api.setStorageSync(key, value);
      else api?.setItem?.(key, value);
    } catch {}
  }
}

export const AudioManager = new AudioManagerClass();
