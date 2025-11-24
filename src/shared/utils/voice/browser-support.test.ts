/* eslint-disable @typescript-eslint/no-explicit-any */
import { isSecureContext, isBrowserSupported } from '@/features/voice/utils/browser-support';

jest.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Browser Support Utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Mock isSecureContext on existing window
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true
    });

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: jest.fn() },
      configurable: true
    });

    // Mock SpeechRecognition
    (window as any).SpeechRecognition = jest.fn();
    (window as any).webkitSpeechRecognition = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Cleanup
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  describe('isSecureContext', () => {
    it('should return true if window.isSecureContext is true', () => {
      Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
      expect(isSecureContext()).toBe(true);
    });

    it('should return false if window.isSecureContext is false', () => {
      Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
      expect(isSecureContext()).toBe(false);
    });
  });

  describe('isBrowserSupported', () => {
    it('should resolve true if APIs are present immediately', async () => {
      const promise = isBrowserSupported();
      
      jest.advanceTimersByTime(500);
      await expect(promise).resolves.toBe(true);
    });

    it('should resolve true if APIs become available eventually', async () => {
      // Initially missing SpeechRecognition
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const promise = isBrowserSupported();

      // Still fail
      jest.advanceTimersByTime(500);

      // Add it back
      (window as any).SpeechRecognition = jest.fn();

      jest.advanceTimersByTime(500);
      await expect(promise).resolves.toBe(true);
    });

    it('should resolve false if APIs are missing after max checks', async () => {
      // Remove APIs
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;
      
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {}, // No getUserMedia
        configurable: true
      });

      const promise = isBrowserSupported();

      // Advance past 5 checks * 500ms
      jest.advanceTimersByTime(3000);

      await expect(promise).resolves.toBe(false);
    });
  });
});
