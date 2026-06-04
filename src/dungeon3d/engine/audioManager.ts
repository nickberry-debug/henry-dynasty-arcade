// dungeon3d/engine/audioManager.ts — Audio manager for music and SFX
import * as THREE from 'three';

export class AudioManager {
  listener: THREE.AudioListener;
  currentMusic: THREE.Audio | null = null;
  sfxVolume: number = 0.7;
  musicVolume: number = 0.5;
  muted: boolean = false;

  private audioLoader: THREE.AudioLoader;

  constructor(listener: THREE.AudioListener) {
    this.listener = listener;
    this.audioLoader = new THREE.AudioLoader();
  }

  /**
   * Play background music (loops by default)
   */
  playMusic(url: string, volume?: number): THREE.Audio {
    // Stop previous music if playing
    if (this.currentMusic) {
      this.currentMusic.stop();
    }

    const music = new THREE.Audio(this.listener);
    const vol = volume !== undefined ? volume : this.musicVolume;

    this.audioLoader.load(url, (buffer) => {
      music.setBuffer(buffer);
      music.setLoop(true);
      music.setVolume(this.muted ? 0 : vol);
      music.play();
    });

    this.currentMusic = music;
    return music;
  }

  /**
   * Stop current music
   */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  /**
   * Fade out current music
   */
  fadeOutMusic(duration: number = 1000) {
    if (!this.currentMusic) return;

    const startVolume = this.currentMusic.getVolume();
    const startTime = Date.now();

    const fadeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        this.stopMusic();
        clearInterval(fadeInterval);
      } else {
        const newVolume = startVolume * (1 - progress);
        if (this.currentMusic) {
          this.currentMusic.setVolume(newVolume);
        }
      }
    }, 50);
  }

  /**
   * Play a sound effect (one-shot)
   */
  playSFX(url: string, volume?: number): THREE.Audio {
    const sfx = new THREE.Audio(this.listener);
    const vol = volume !== undefined ? volume : this.sfxVolume;

    this.audioLoader.load(url, (buffer) => {
      sfx.setBuffer(buffer);
      sfx.setVolume(this.muted ? 0 : vol);
      sfx.play();
    });

    return sfx;
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.muted ? 0 : this.musicVolume);
    }
  }

  /**
   * Set SFX volume (0-1)
   */
  setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Toggle mute all audio
   */
  toggleMute() {
    this.muted = !this.muted;
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.muted ? 0 : this.musicVolume);
    }
  }

  /**
   * Mute audio
   */
  mute() {
    this.muted = true;
    if (this.currentMusic) {
      this.currentMusic.setVolume(0);
    }
  }

  /**
   * Unmute audio
   */
  unmute() {
    this.muted = false;
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.musicVolume);
    }
  }

  /**
   * Get current music volume
   */
  getMusicVolume(): number {
    return this.musicVolume;
  }

  /**
   * Get current SFX volume
   */
  getSFXVolume(): number {
    return this.sfxVolume;
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }
}
