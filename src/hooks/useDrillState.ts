import {useState, useCallback} from 'react';
import {DrillStatus} from '../drills/types';

interface UseDrillStateReturn {
  status: DrillStatus;
  setReady: () => void;
  startCountdown: () => void;
  setActive: () => void;
  pause: () => void;
  resume: () => void;
  complete: () => void;
  reset: () => void;
}

export function useDrillState(initialStatus: DrillStatus = 'ready'): UseDrillStateReturn {
  const [status, setStatus] = useState<DrillStatus>(initialStatus);

  const setReady = useCallback(() => setStatus('ready'), []);
  const startCountdown = useCallback(() => setStatus('countdown'), []);
  const setActive = useCallback(() => setStatus('active'), []);
  const pause = useCallback(() => setStatus('paused'), []);
  const complete = useCallback(() => setStatus('complete'), []);

  const resume = useCallback(() => {
    if (status === 'paused') {
      setStatus('active');
    }
  }, [status]);

  const reset = useCallback(() => {
    setStatus('ready');
  }, []);

  return {
    status,
    setReady,
    startCountdown,
    setActive,
    pause,
    resume,
    complete,
    reset,
  };
}
