import {useState, useCallback, useRef} from 'react';
import {PoseLandmarks} from './types';
import {DEBUG_CONFIG} from './config';

type DribblePhase = 'idle' | 'hand_down' | 'hand_up';
type HandSide = 'left' | 'right';

interface DribbleState {
  phase: DribblePhase;
  lastDribbleTime: number;
  activeSide: HandSide | null;
  previousWristY: number | null;
  lowestWristY: number | null;
}

interface UsePoseOnlyDribbleDetectionReturn {
  dribbleCount: number;
  isTracking: boolean;
  activeSide: HandSide | null;
  currentPose: PoseLandmarks | null;
  onPoseUpdate: (pose: PoseLandmarks | null) => void;
  startTracking: () => void;
  stopTracking: () => void;
  reset: () => void;
}

// Configuration for pose-only dribble detection
const POSE_DRIBBLE_CONFIG = {
  // Minimum Y movement to detect hand going down (normalized 0-1)
  downThreshold: 0.08,
  // Minimum Y movement up from lowest point to count as dribble
  upThreshold: 0.06,
  // Minimum time between dribbles in ms
  minDribbleInterval: 200,
  // Smoothing factor for wrist position
  smoothing: 0.4,
  // Minimum confidence for wrist detection
  minWristConfidence: 0.3,
};

/**
 * Hook for dribble detection using only pose (wrist motion)
 *
 * Detection logic:
 * 1. Track wrist Y position over time
 * 2. When wrist goes down significantly -> "hand_down" phase
 * 3. When wrist comes back up -> "hand_up" phase -> count++
 *
 * This works without ball detection by tracking the dribbling hand motion.
 */
export function usePoseOnlyDribbleDetection(): UsePoseOnlyDribbleDetectionReturn {
  const [dribbleCount, setDribbleCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [activeSide, setActiveSide] = useState<HandSide | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseLandmarks | null>(null);

  const stateRef = useRef<DribbleState>({
    phase: 'idle',
    lastDribbleTime: 0,
    activeSide: null,
    previousWristY: null,
    lowestWristY: null,
  });

  // Smoothed wrist positions
  const smoothedLeftWristY = useRef<number | null>(null);
  const smoothedRightWristY = useRef<number | null>(null);

  const onPoseUpdate = useCallback((pose: PoseLandmarks | null) => {
    setCurrentPose(pose);

    if (!pose || !isTracking) {
      return;
    }

    const state = stateRef.current;
    const now = Date.now();

    // Get wrist positions with confidence check
    const leftWrist = pose.leftWrist;
    const rightWrist = pose.rightWrist;

    const leftConfident = (leftWrist.visibility ?? 0) >= POSE_DRIBBLE_CONFIG.minWristConfidence;
    const rightConfident = (rightWrist.visibility ?? 0) >= POSE_DRIBBLE_CONFIG.minWristConfidence;

    if (!leftConfident && !rightConfident) {
      return;
    }

    // Apply smoothing to wrist Y positions
    if (leftConfident) {
      if (smoothedLeftWristY.current === null) {
        smoothedLeftWristY.current = leftWrist.y;
      } else {
        smoothedLeftWristY.current =
          smoothedLeftWristY.current * POSE_DRIBBLE_CONFIG.smoothing +
          leftWrist.y * (1 - POSE_DRIBBLE_CONFIG.smoothing);
      }
    }

    if (rightConfident) {
      if (smoothedRightWristY.current === null) {
        smoothedRightWristY.current = rightWrist.y;
      } else {
        smoothedRightWristY.current =
          smoothedRightWristY.current * POSE_DRIBBLE_CONFIG.smoothing +
          rightWrist.y * (1 - POSE_DRIBBLE_CONFIG.smoothing);
      }
    }

    // Determine which hand to track (the one that's lower / more active)
    let wristY: number;
    let side: HandSide;

    if (leftConfident && rightConfident) {
      // Track the hand that's currently lower (likely dribbling)
      if ((smoothedLeftWristY.current ?? 0) > (smoothedRightWristY.current ?? 0)) {
        wristY = smoothedLeftWristY.current!;
        side = 'left';
      } else {
        wristY = smoothedRightWristY.current!;
        side = 'right';
      }
    } else if (leftConfident) {
      wristY = smoothedLeftWristY.current!;
      side = 'left';
    } else {
      wristY = smoothedRightWristY.current!;
      side = 'right';
    }

    // Update active side
    if (state.activeSide !== side) {
      state.activeSide = side;
      setActiveSide(side);
    }

    // Initialize previous wrist Y
    if (state.previousWristY === null) {
      state.previousWristY = wristY;
      state.lowestWristY = wristY;
      return;
    }

    // State machine for dribble detection
    // Note: In normalized coords, Y increases downward (0 = top, 1 = bottom)

    if (state.phase === 'idle' || state.phase === 'hand_up') {
      // Check if hand is going down
      if (wristY > state.previousWristY + POSE_DRIBBLE_CONFIG.downThreshold) {
        state.phase = 'hand_down';
        state.lowestWristY = wristY;

        if (DEBUG_CONFIG.logDetections) {
          console.log('[PoseDribble] Hand going DOWN', {
            wristY: wristY.toFixed(3),
            side,
          });
        }
      }
    } else if (state.phase === 'hand_down') {
      // Track the lowest point
      if (wristY > (state.lowestWristY ?? 0)) {
        state.lowestWristY = wristY;
      }

      // Check if hand is coming back up from lowest point
      if (wristY < (state.lowestWristY ?? 0) - POSE_DRIBBLE_CONFIG.upThreshold) {
        // Check minimum interval between dribbles
        if (now - state.lastDribbleTime >= POSE_DRIBBLE_CONFIG.minDribbleInterval) {
          state.phase = 'hand_up';
          state.lastDribbleTime = now;

          setDribbleCount(prev => prev + 1);

          if (DEBUG_CONFIG.logDetections) {
            console.log('[PoseDribble] DRIBBLE COUNTED!', {
              wristY: wristY.toFixed(3),
              lowestY: state.lowestWristY?.toFixed(3),
              side,
            });
          }
        }
      }
    }

    state.previousWristY = wristY;
  }, [isTracking]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
    stateRef.current = {
      phase: 'idle',
      lastDribbleTime: 0,
      activeSide: null,
      previousWristY: null,
      lowestWristY: null,
    };
    smoothedLeftWristY.current = null;
    smoothedRightWristY.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const reset = useCallback(() => {
    setDribbleCount(0);
    setActiveSide(null);
    setCurrentPose(null);
    stateRef.current = {
      phase: 'idle',
      lastDribbleTime: 0,
      activeSide: null,
      previousWristY: null,
      lowestWristY: null,
    };
    smoothedLeftWristY.current = null;
    smoothedRightWristY.current = null;
  }, []);

  return {
    dribbleCount,
    isTracking,
    activeSide,
    currentPose,
    onPoseUpdate,
    startTracking,
    stopTracking,
    reset,
  };
}
