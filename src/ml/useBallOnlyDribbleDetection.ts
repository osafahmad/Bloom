import {useState, useCallback, useRef} from 'react';
import {DetectedObject} from './types';
import {DEBUG_CONFIG} from './config';

type DribblePhase = 'idle' | 'ball_down' | 'ball_up';

interface DribbleState {
  phase: DribblePhase;
  lastDribbleTime: number;
  previousBallY: number | null;
  highestBallY: number | null; // Smallest Y value (top of bounce)
  lowestBallY: number | null;  // Largest Y value (bottom of bounce)
}

interface UseBallOnlyDribbleDetectionReturn {
  dribbleCount: number;
  isTracking: boolean;
  onObjectsUpdate: (objects: DetectedObject[]) => void;
  startTracking: () => void;
  stopTracking: () => void;
  reset: () => void;
}

// Configuration for ball-only dribble detection
const BALL_DRIBBLE_CONFIG = {
  // Minimum Y movement to detect ball going down (normalized 0-1)
  // Ball must move this much down from highest point to trigger "going down"
  downThreshold: 0.08,

  // Minimum Y movement up from lowest point to count as dribble complete
  upThreshold: 0.06,

  // Minimum time between dribbles in ms (prevents double counting)
  minDribbleInterval: 200,

  // Smoothing factor for ball position (0 = no smoothing, 1 = max smoothing)
  smoothing: 0.3,
};

/**
 * Hook for dribble detection using only ball position (no pose needed)
 *
 * Detection logic:
 * 1. Track ball Y position over time
 * 2. When ball goes down significantly from peak -> "ball_down" phase
 * 3. When ball comes back up from bottom -> "ball_up" phase -> count++
 *
 * Note: Y increases downward in normalized coords (0 = top, 1 = bottom)
 */
export function useBallOnlyDribbleDetection(): UseBallOnlyDribbleDetectionReturn {
  const [dribbleCount, setDribbleCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  const stateRef = useRef<DribbleState>({
    phase: 'idle',
    lastDribbleTime: 0,
    previousBallY: null,
    highestBallY: null,
    lowestBallY: null,
  });

  // Smoothed ball Y position
  const smoothedBallY = useRef<number | null>(null);

  const onObjectsUpdate = useCallback((objects: DetectedObject[]) => {
    if (!isTracking) {
      return;
    }

    // Find basketball in detected objects
    const ball = objects.find(
      obj => obj.label === 'basketball' || obj.label === 'sports ball',
    );

    if (!ball) {
      // No ball detected - don't update state
      return;
    }

    const state = stateRef.current;
    const now = Date.now();

    // Calculate ball center Y
    const rawBallY = ball.boundingBox.y + ball.boundingBox.height / 2;

    // Apply smoothing
    if (smoothedBallY.current === null) {
      smoothedBallY.current = rawBallY;
    } else {
      smoothedBallY.current =
        smoothedBallY.current * BALL_DRIBBLE_CONFIG.smoothing +
        rawBallY * (1 - BALL_DRIBBLE_CONFIG.smoothing);
    }

    const ballY = smoothedBallY.current;

    // Initialize tracking values
    if (state.previousBallY === null) {
      state.previousBallY = ballY;
      state.highestBallY = ballY;
      state.lowestBallY = ballY;
      return;
    }

    // State machine for dribble detection
    // Note: Y increases downward (0 = top, 1 = bottom)

    if (state.phase === 'idle' || state.phase === 'ball_up') {
      // Track the highest point (smallest Y)
      if (ballY < (state.highestBallY ?? ballY)) {
        state.highestBallY = ballY;
      }

      // Check if ball is going down from the peak
      if (ballY > (state.highestBallY ?? 0) + BALL_DRIBBLE_CONFIG.downThreshold) {
        state.phase = 'ball_down';
        state.lowestBallY = ballY;

        if (DEBUG_CONFIG.logDetections) {
          console.log('[BallDribble] Ball going DOWN', {
            ballY: ballY.toFixed(3),
            highestY: state.highestBallY?.toFixed(3),
          });
        }
      }
    } else if (state.phase === 'ball_down') {
      // Track the lowest point (largest Y)
      if (ballY > (state.lowestBallY ?? 0)) {
        state.lowestBallY = ballY;
      }

      // Check if ball is coming back up from the bottom
      if (ballY < (state.lowestBallY ?? 1) - BALL_DRIBBLE_CONFIG.upThreshold) {
        // Check minimum interval between dribbles
        if (now - state.lastDribbleTime >= BALL_DRIBBLE_CONFIG.minDribbleInterval) {
          state.phase = 'ball_up';
          state.lastDribbleTime = now;
          state.highestBallY = ballY; // Reset for next dribble

          setDribbleCount(prev => prev + 1);

          if (DEBUG_CONFIG.logDetections) {
            console.log('[BallDribble] DRIBBLE COUNTED!', {
              ballY: ballY.toFixed(3),
              lowestY: state.lowestBallY?.toFixed(3),
            });
          }
        }
      }
    }

    state.previousBallY = ballY;
  }, [isTracking]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
    stateRef.current = {
      phase: 'idle',
      lastDribbleTime: 0,
      previousBallY: null,
      highestBallY: null,
      lowestBallY: null,
    };
    smoothedBallY.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const reset = useCallback(() => {
    setDribbleCount(0);
    stateRef.current = {
      phase: 'idle',
      lastDribbleTime: 0,
      previousBallY: null,
      highestBallY: null,
      lowestBallY: null,
    };
    smoothedBallY.current = null;
  }, []);

  return {
    dribbleCount,
    isTracking,
    onObjectsUpdate,
    startTracking,
    stopTracking,
    reset,
  };
}
