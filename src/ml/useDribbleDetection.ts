import {useState, useCallback, useRef, useEffect} from 'react';
import {PoseLandmarks, BallPosition, DetectedObject} from './types';
import {DRIBBLE_DETECTION_CONFIG, DEBUG_CONFIG} from './config';

type DribblePhase = 'idle' | 'ball_down' | 'ball_up';
type HandSide = 'left' | 'right';

interface DribbleState {
  phase: DribblePhase;
  lastDribbleTime: number;
  activeSide: HandSide | null;
  previousBallY: number | null;
}

interface UseDribbleDetectionReturn {
  dribbleCount: number;
  isTracking: boolean;
  activeSide: HandSide | null;
  onPoseUpdate: (pose: PoseLandmarks | null) => void;
  onObjectsUpdate: (objects: DetectedObject[]) => void;
  startTracking: () => void;
  stopTracking: () => void;
  reset: () => void;
}

/**
 * Hook for dribble detection by combining pose and object detection
 *
 * Detection logic:
 * 1. Track wrist position from pose detection
 * 2. Track ball position from object detection
 * 3. When ball Y goes below wrist Y → "ball_down" phase
 * 4. When ball Y comes back up to wrist Y → "ball_up" phase → count++
 */
export function useDribbleDetection(): UseDribbleDetectionReturn {
  const [dribbleCount, setDribbleCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [activeSide, setActiveSide] = useState<HandSide | null>(null);

  const poseRef = useRef<PoseLandmarks | null>(null);
  const ballPositionRef = useRef<BallPosition | null>(null);
  const stateRef = useRef<DribbleState>({
    phase: 'idle',
    lastDribbleTime: 0,
    activeSide: null,
    previousBallY: null,
  });

  // Smoothed ball position
  const smoothedBallY = useRef<number | null>(null);

  const onPoseUpdate = useCallback((pose: PoseLandmarks | null) => {
    poseRef.current = pose;
  }, []);

  const onObjectsUpdate = useCallback((objects: DetectedObject[]) => {
    // Find ball in detected objects
    const ball = objects.find(
      obj => obj.label === 'sports ball' || obj.label === 'basketball',
    );

    if (ball) {
      const centerY = ball.boundingBox.y + ball.boundingBox.height / 2;
      ballPositionRef.current = {
        x: ball.boundingBox.x + ball.boundingBox.width / 2,
        y: centerY,
        timestamp: Date.now(),
      };

      // Apply smoothing
      if (smoothedBallY.current === null) {
        smoothedBallY.current = centerY;
      } else {
        smoothedBallY.current =
          smoothedBallY.current * DRIBBLE_DETECTION_CONFIG.positionSmoothing +
          centerY * (1 - DRIBBLE_DETECTION_CONFIG.positionSmoothing);
      }

      // Process dribble detection
      if (isTracking) {
        processDribble();
      }
    } else {
      ballPositionRef.current = null;
    }
  }, [isTracking]);

  const processDribble = useCallback(() => {
    const pose = poseRef.current;
    const ballY = smoothedBallY.current;
    const state = stateRef.current;

    if (!pose || ballY === null) {
      return;
    }

    // Determine which wrist to track
    let wristY: number;
    let side: HandSide;

    if (DRIBBLE_DETECTION_CONFIG.handPreference === 'auto') {
      // Use the wrist closest to the ball (in X direction)
      const ballX = ballPositionRef.current?.x || 0.5;
      const leftDist = Math.abs(pose.leftWrist.x - ballX);
      const rightDist = Math.abs(pose.rightWrist.x - ballX);

      if (leftDist < rightDist) {
        wristY = pose.leftWrist.y;
        side = 'left';
      } else {
        wristY = pose.rightWrist.y;
        side = 'right';
      }
    } else {
      side = DRIBBLE_DETECTION_CONFIG.handPreference;
      wristY = side === 'left' ? pose.leftWrist.y : pose.rightWrist.y;
    }

    // Update active side
    if (state.activeSide !== side) {
      state.activeSide = side;
      setActiveSide(side);
    }

    const threshold = DRIBBLE_DETECTION_CONFIG.downThreshold;
    const now = Date.now();

    // State machine for dribble detection
    // Note: In normalized coords, Y increases downward (0 = top, 1 = bottom)
    if (state.phase === 'idle' || state.phase === 'ball_up') {
      // Check if ball went below wrist (ball_down)
      if (ballY > wristY + threshold) {
        state.phase = 'ball_down';

        if (DEBUG_CONFIG.logDetections) {
          console.log('[Dribble] Ball going DOWN', {
            ballY: ballY.toFixed(3),
            wristY: wristY.toFixed(3),
            side,
          });
        }
      }
    } else if (state.phase === 'ball_down') {
      // Check if ball came back up to wrist level (dribble complete)
      if (ballY <= wristY + threshold * 0.5) {
        // Check minimum interval between dribbles
        if (now - state.lastDribbleTime >= DRIBBLE_DETECTION_CONFIG.minDribbleInterval) {
          state.phase = 'ball_up';
          state.lastDribbleTime = now;

          setDribbleCount(prev => prev + 1);

          if (DEBUG_CONFIG.logDetections) {
            console.log('[Dribble] DRIBBLE COUNTED!', {
              ballY: ballY.toFixed(3),
              wristY: wristY.toFixed(3),
              side,
            });
          }
        }
      }
    }

    state.previousBallY = ballY;
  }, []);

  const startTracking = useCallback(() => {
    setIsTracking(true);
    stateRef.current = {
      phase: 'idle',
      lastDribbleTime: 0,
      activeSide: null,
      previousBallY: null,
    };
    smoothedBallY.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const reset = useCallback(() => {
    setDribbleCount(0);
    setActiveSide(null);
    stateRef.current = {
      phase: 'idle',
      lastDribbleTime: 0,
      activeSide: null,
      previousBallY: null,
    };
    smoothedBallY.current = null;
  }, []);

  return {
    dribbleCount,
    isTracking,
    activeSide,
    onPoseUpdate,
    onObjectsUpdate,
    startTracking,
    stopTracking,
    reset,
  };
}
