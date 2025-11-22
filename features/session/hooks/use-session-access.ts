import { useState, useEffect } from 'react';
import { logger } from '@/shared/lib/logger';
import { verifyAccessCode as verifyHash } from '@/features/rate-limit/utils/access-code';

const MAX_INTERACTIONS = 10;
const RESET_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface SessionAccessState {
  interactionCount: number;
  isUnlocked: boolean;
  accessCode: string;
  isLimitReached: boolean;
  isReady: boolean;
}

export interface SessionAccessActions {
  incrementInteraction: () => boolean; // returns true if allowed, false if limit reached
  verifyAccessCode: (code: string) => Promise<boolean>;
  resetInteractions: () => void;
  checkLimits: () => void;
}

export function useSessionAccess() {
  const [interactionCount, setInteractionCount] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState<string>('');
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Load rate limit state with reset logic
  useEffect(() => {
    const storedCount = localStorage.getItem('aether_interaction_count');
    const storedTimestamp = localStorage.getItem('aether_limit_timestamp');
    
    if (storedTimestamp) {
      const timestamp = parseInt(storedTimestamp, 10);
      const now = Date.now();
      
      if (now - timestamp > RESET_WINDOW_MS) {
        // Reset window has passed
        setInteractionCount(0);
        localStorage.setItem('aether_interaction_count', '0');
        localStorage.removeItem('aether_limit_timestamp'); 
        setIsReady(true);
        return;
      }
    }

    if (storedCount) {
      const count = parseInt(storedCount, 10);
      setInteractionCount(count);
      if (count >= MAX_INTERACTIONS) {
        setIsLimitReached(true);
      }
    }
    setIsReady(true);
  }, []);

  const checkLimits = () => {
    if (!isUnlocked && interactionCount >= MAX_INTERACTIONS) {
        setIsLimitReached(true);
    }
  };

  const incrementInteraction = (): boolean => {
    // Check rate limit first (unless unlocked)
    if (!isUnlocked && interactionCount >= MAX_INTERACTIONS) {
        setIsLimitReached(true);
        return false;
    }

    // Update count (even if unlocked, we track it, but don't limit)
    const newCount = interactionCount + 1;
    setInteractionCount(newCount);
    localStorage.setItem('aether_interaction_count', newCount.toString());

    // Set timestamp on first interaction if not set
    if (!localStorage.getItem('aether_limit_timestamp')) {
      localStorage.setItem('aether_limit_timestamp', Date.now().toString());
    }

    return true;
  };

  const verifyAccessCode = async (code: string): Promise<boolean> => {
    const isValid = await verifyHash(code);
    if (isValid) {
      setIsUnlocked(true);
      setAccessCode(code); // Store in memory only
      if (isLimitReached) {
          setIsLimitReached(false);
      }
      logger.info('SESSION', 'Access code verified successfully');
      return true;
    }
    return false;
  };

  const resetInteractions = () => {
      // This is used when the session resets/clears context, but typically we don't
      // reset the *rate limit count* here unless 12 hours passed.
      // If we want to support manual reset for debugging:
      // setInteractionCount(0);
      // localStorage.setItem('aether_interaction_count', '0');
  };

  return {
    state: {
      interactionCount,
      isUnlocked,
      accessCode,
      isLimitReached,
      isReady
    },
    actions: {
      incrementInteraction,
      verifyAccessCode,
      resetInteractions,
      checkLimits
    }
  };
}
