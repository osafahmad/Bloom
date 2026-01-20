import {useState, useCallback, useRef} from 'react';
import {DetectedObject, BallPosition} from './types';
import {DEBUG_CONFIG} from './config';

interface UseObjectDetectionReturn {
  objects: DetectedObject[];
  ballPosition: BallPosition | null;
  isDetecting: boolean;
  error: string | null;
  setObjects: (objects: DetectedObject[]) => void;
  startDetection: () => void;
  stopDetection: () => void;
  reset: () => void;
}

/**
 * Hook for managing object detection state
 *
 * The actual detection happens in CameraView via react-native-mediapipe.
 * This hook manages the state and tracks ball position for dribble detection.
 */
export function useObjectDetection(): UseObjectDetectionReturn {
  const [objects, setObjectsState] = useState<DetectedObject[]>([]);
  const [ballPosition, setBallPosition] = useState<BallPosition | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLogTime = useRef<number>(0);

  const setObjects = useCallback((newObjects: DetectedObject[]) => {
    setObjectsState(newObjects);

    // Find basketball/sports ball and track its center position
    const ball = newObjects.find(
      obj => obj.label === 'sports ball' || obj.label === 'basketball',
    );

    if (ball) {
      const centerX = ball.boundingBox.x + ball.boundingBox.width / 2;
      const centerY = ball.boundingBox.y + ball.boundingBox.height / 2;

      setBallPosition({
        x: centerX,
        y: centerY,
        timestamp: Date.now(),
      });

      if (DEBUG_CONFIG.logDetections) {
        const now = Date.now();
        if (now - lastLogTime.current > 1000) {
          console.log('[ObjectDetection] Ball detected:', {
            label: ball.label,
            confidence: ball.confidence.toFixed(2),
            position: {x: centerX.toFixed(3), y: centerY.toFixed(3)},
          });
          lastLogTime.current = now;
        }
      }
    } else {
      setBallPosition(null);
    }
  }, []);

  const startDetection = useCallback(() => {
    setIsDetecting(true);
    setError(null);
  }, []);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setObjectsState([]);
    setBallPosition(null);
  }, []);

  const reset = useCallback(() => {
    setObjectsState([]);
    setBallPosition(null);
    setError(null);
  }, []);

  return {
    objects,
    ballPosition,
    isDetecting,
    error,
    setObjects,
    startDetection,
    stopDetection,
    reset,
  };
}
