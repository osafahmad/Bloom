import {useState, useCallback, useRef} from 'react';
import {PoseLandmarks} from './types';
import {DEBUG_CONFIG} from './config';

interface UsePoseDetectionReturn {
  pose: PoseLandmarks | null;
  isDetecting: boolean;
  error: string | null;
  setPose: (pose: PoseLandmarks | null) => void;
  startDetection: () => void;
  stopDetection: () => void;
  reset: () => void;
}

/**
 * Hook for managing pose detection state
 *
 * The actual detection happens in CameraView via react-native-mediapipe.
 * This hook manages the state and provides callbacks for drill components.
 */
export function usePoseDetection(): UsePoseDetectionReturn {
  const [pose, setPose] = useState<PoseLandmarks | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPoseTime = useRef<number>(0);

  const handleSetPose = useCallback((newPose: PoseLandmarks | null) => {
    setPose(newPose);

    if (DEBUG_CONFIG.logDetections && newPose) {
      const now = Date.now();
      if (now - lastPoseTime.current > 1000) {
        console.log('[PoseDetection] Pose detected:', {
          leftWrist: newPose.leftWrist,
          rightWrist: newPose.rightWrist,
        });
        lastPoseTime.current = now;
      }
    }
  }, []);

  const startDetection = useCallback(() => {
    setIsDetecting(true);
    setError(null);
  }, []);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setPose(null);
  }, []);

  const reset = useCallback(() => {
    setPose(null);
    setError(null);
  }, []);

  return {
    pose,
    isDetecting,
    error,
    setPose: handleSetPose,
    startDetection,
    stopDetection,
    reset,
  };
}
