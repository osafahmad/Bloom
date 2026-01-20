import {useCallback, useEffect, useState} from 'react';
import {useTensorflowModel, TensorflowModel} from 'react-native-fast-tflite';
import {PoseLandmarks, LandmarkPoint} from './types';

// MoveNet Lightning outputs 17 keypoints
// Each keypoint has [y, x, confidence] in normalized coordinates (0-1)
const MOVENET_KEYPOINTS = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const;

interface UseTFLitePoseDetectionReturn {
  model: TensorflowModel | null;
  isLoading: boolean;
  error: string | null;
  processOutput: (output: Float32Array) => PoseLandmarks | null;
}

/**
 * Hook for TFLite-based pose detection using MoveNet Lightning model
 *
 * MoveNet Lightning is optimized for real-time inference on mobile devices.
 * It detects 17 body keypoints.
 */
export function useTFLitePoseDetection(): UseTFLitePoseDetectionReturn {
  const [error, setError] = useState<string | null>(null);

  // Load the MoveNet Lightning model
  const model = useTensorflowModel(
    require('../../assets/models/movenet_lightning.tflite'),
  );

  const isLoading = model.state === 'loading';

  useEffect(() => {
    if (model.state === 'error') {
      setError(`Failed to load pose model: ${model.error?.message}`);
    } else {
      setError(null);
    }
  }, [model.state, model.error]);

  // Process model output to PoseLandmarks
  const processOutput = useCallback((output: Float32Array): PoseLandmarks | null => {
    if (!output || output.length < 51) {
      // MoveNet outputs 17 keypoints * 3 values = 51 values
      return null;
    }

    // Create landmark point from MoveNet output
    const createPoint = (index: number): LandmarkPoint => {
      const baseIdx = index * 3;
      // MoveNet outputs [y, x, confidence]
      return {
        x: output[baseIdx + 1], // x is second
        y: output[baseIdx],     // y is first
        visibility: output[baseIdx + 2], // confidence/score
      };
    };

    // Map MoveNet 17 keypoints to our PoseLandmarks structure
    // MoveNet doesn't have all 33 MediaPipe landmarks, so we'll map what we have
    // and use placeholder values for the rest
    const nose = createPoint(0);
    const leftEye = createPoint(1);
    const rightEye = createPoint(2);
    const leftEar = createPoint(3);
    const rightEar = createPoint(4);
    const leftShoulder = createPoint(5);
    const rightShoulder = createPoint(6);
    const leftElbow = createPoint(7);
    const rightElbow = createPoint(8);
    const leftWrist = createPoint(9);
    const rightWrist = createPoint(10);
    const leftHip = createPoint(11);
    const rightHip = createPoint(12);
    const leftKnee = createPoint(13);
    const rightKnee = createPoint(14);
    const leftAnkle = createPoint(15);
    const rightAnkle = createPoint(16);

    // Create placeholder point for landmarks MoveNet doesn't detect
    const placeholder: LandmarkPoint = {x: 0, y: 0, visibility: 0};

    return {
      nose,
      leftEyeInner: leftEye, // Use leftEye as approximation
      leftEye,
      leftEyeOuter: leftEye, // Use leftEye as approximation
      rightEyeInner: rightEye, // Use rightEye as approximation
      rightEye,
      rightEyeOuter: rightEye, // Use rightEye as approximation
      leftEar,
      rightEar,
      mouthLeft: placeholder,
      mouthRight: placeholder,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftPinky: placeholder,
      rightPinky: placeholder,
      leftIndex: placeholder,
      rightIndex: placeholder,
      leftThumb: placeholder,
      rightThumb: placeholder,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
      leftHeel: placeholder,
      rightHeel: placeholder,
      leftFootIndex: placeholder,
      rightFootIndex: placeholder,
    };
  }, []);

  return {
    model: model.state === 'loaded' ? model.model : null,
    isLoading,
    error,
    processOutput,
  };
}

/**
 * Resize frame data for MoveNet input (192x192 for Lightning)
 * This is a worklet function to run on the frame processor thread
 */
export function resizeForMoveNet(
  frameData: Uint8Array,
  frameWidth: number,
  frameHeight: number,
): Float32Array {
  'worklet';

  const targetSize = 192; // MoveNet Lightning input size
  const output = new Float32Array(targetSize * targetSize * 3);

  const scaleX = frameWidth / targetSize;
  const scaleY = frameHeight / targetSize;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * frameWidth + srcX) * 4; // Assuming RGBA
      const dstIdx = (y * targetSize + x) * 3;

      // Normalize to 0-1 range
      output[dstIdx] = frameData[srcIdx] / 255.0;     // R
      output[dstIdx + 1] = frameData[srcIdx + 1] / 255.0; // G
      output[dstIdx + 2] = frameData[srcIdx + 2] / 255.0; // B
    }
  }

  return output;
}
