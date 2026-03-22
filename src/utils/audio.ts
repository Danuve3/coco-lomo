const BASE = import.meta.env.BASE_URL;

const TRACKS = [
  `${BASE}sounds/music/music-1.mp3`,
  `${BASE}sounds/music/music-2.mp3`,
];

class AudioManager {
  private audio: HTMLAudioElement;
  private currentTrack = 0;
  private _muted: boolean;
  private started = false;

  private readonly TARGET_VOLUME = 0.4;
  private readonly FADE_DURATION = 4; // seconds

  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this._muted = localStorage.getItem('audio-muted') === 'true';
    this.audio = new Audio();
    this.audio.volume = this.TARGET_VOLUME;
    this.audio.muted = this._muted;
    this.audio.addEventListener('loadedmetadata', () => this.scheduleFade());
    this.audio.addEventListener('ended', () => this.playNext());
    this.audio.src = TRACKS[0];
  }

  private scheduleFade(): void {
    this.clearFade();
    const { duration } = this.audio;
    if (!isFinite(duration) || duration <= this.FADE_DURATION + 1) return;

    const delay = Math.max(0, (duration - this.FADE_DURATION - this.audio.currentTime) * 1000);
    this.fadeTimer = setTimeout(() => {
      this.fadeInterval = setInterval(() => {
        const timeLeft = this.audio.duration - this.audio.currentTime;
        if (timeLeft <= 0) { this.clearFade(); return; }
        this.audio.volume = Math.min(this.TARGET_VOLUME, Math.max(0, (timeLeft / this.FADE_DURATION) * this.TARGET_VOLUME));
      }, 100);
    }, delay);
  }

  private clearFade(): void {
    if (this.fadeTimer !== null) { clearTimeout(this.fadeTimer); this.fadeTimer = null; }
    if (this.fadeInterval !== null) { clearInterval(this.fadeInterval); this.fadeInterval = null; }
  }

  private playNext(): void {
    this.clearFade();
    this.audio.volume = this.TARGET_VOLUME;
    this.currentTrack = (this.currentTrack + 1) % TRACKS.length;
    this.audio.src = TRACKS[this.currentTrack];
    this.audio.play().catch(() => {});
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.audio.play().catch(() => { this.started = false; });
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    this.audio.muted = this._muted;
    localStorage.setItem('audio-muted', String(this._muted));
    if (!this._muted && (!this.started || this.audio.paused)) {
      this.started = true;
      this.audio.play().catch(() => { this.started = false; });
    }
    return this._muted;
  }

  get muted(): boolean {
    return this._muted;
  }

  muteIcon(): string {
    return this._muted ? '🔇' : '🔊';
  }

  private sfxCache = new Map<string, HTMLAudioElement>();

  playSfx(src: string, volume = 1.0): void {
    if (this._muted) return;
    let sfx = this.sfxCache.get(src);
    if (!sfx) {
      sfx = new Audio(src);
      this.sfxCache.set(src, sfx);
    }
    sfx.volume = volume;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }
}

export const audioManager = new AudioManager();
