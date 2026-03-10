let audioCache: HTMLAudioElement | null = null;

export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  try {
    if (!audioCache) {
      audioCache = new Audio('/sounds/notification.mp3');
      audioCache.volume = 0.5;
    }
    audioCache.currentTime = 0;
    audioCache.play().catch(() => {
      // Browser may block autoplay before user interaction
    });
  } catch {
    // Audio not supported
  }
}
