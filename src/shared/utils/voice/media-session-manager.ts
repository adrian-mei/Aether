import { logger } from '@/shared/lib/logger';

export class MediaSessionManager {
  constructor(
    private onPlay: () => Promise<void>,
    private onPause: () => Promise<void>,
    private onStop: () => void
  ) {
    this.setupHandlers();
  }

  private setupHandlers() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', async () => {
      logger.info('AUDIO', 'MediaSession: Play');
      await this.onPlay();
    });

    navigator.mediaSession.setActionHandler('pause', async () => {
      logger.info('AUDIO', 'MediaSession: Pause');
      await this.onPause();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      logger.info('AUDIO', 'MediaSession: Stop');
      this.onStop();
    });
  }

  public updateMetadata(isPlaying: boolean) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (isPlaying) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Aether',
        artist: 'Voice Companion',
        artwork: [
          { src: '/icons/globe.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
    } else {
      navigator.mediaSession.playbackState = 'paused';
    }
  }
}
