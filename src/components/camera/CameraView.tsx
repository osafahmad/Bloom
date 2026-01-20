import React, {useCallback, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Linking} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {useRunOnJS} from 'react-native-worklets-core';
import {useTensorflowModel} from 'react-native-fast-tflite';
import {
  CAMERA_CONFIG,
  FRAME_PROCESSING_CONFIG,
  OBJECT_DETECTION_CONFIG,
} from '../../ml/config';
import {PoseLandmarks, DetectedObject, Point} from '../../ml/types';

interface CameraViewProps {
  children?: React.ReactNode;
  cameraPosition?: 'front' | 'back';
  isActive?: boolean;
  enableDetection?: boolean;
  onPoseDetected?: (pose: PoseLandmarks | null) => void;
  onObjectDetected?: (objects: DetectedObject[]) => void;
}

// MoveNet Lightning expects 192x192 input
const POSE_MODEL_INPUT_SIZE = 192;

// This model expects 640x640 input (based on error: expects 4915200 bytes = 640x640x3x4)
const OBJECT_MODEL_INPUT_SIZE = 640;

export function CameraView({
  children,
  cameraPosition = CAMERA_CONFIG.position,
  isActive = true,
  enableDetection = false,
  onPoseDetected,
  onObjectDetected,
}: CameraViewProps) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice(cameraPosition);

  // Load MoveNet Lightning model with GPU acceleration
  const poseModel = useTensorflowModel(
    require('../../../assets/models/movenet_lightning.tflite'),
    'core-ml', // Use CoreML for GPU acceleration on iOS
  );

  // Load EfficientDet-Lite0 model for object detection
  // Note: Using default delegate (CPU) as CoreML may have compatibility issues with some models
  const objectModel = useTensorflowModel(
    require('../../../assets/models/efficientdet_lite0.tflite'),
  );

  // Get resize plugin instance
  const {resize} = useResizePlugin();

  useEffect(() => {
    if (poseModel.state === 'loaded') {
      console.log('[CameraView] Pose model loaded successfully');
      console.log('[CameraView] Model inputs:', poseModel.model.inputs);
      console.log('[CameraView] Model outputs:', poseModel.model.outputs);
    } else if (poseModel.state === 'error') {
      console.error('[CameraView] Failed to load pose model:', (poseModel as {error: Error}).error);
    }
  }, [poseModel]);

  useEffect(() => {
    console.log('[CameraView] Object model state:', objectModel.state);
    if (objectModel.state === 'loaded') {
      console.log('[CameraView] Object detection model loaded successfully');
      console.log('[CameraView] Object model inputs:', JSON.stringify(objectModel.model.inputs));
      console.log('[CameraView] Object model outputs:', JSON.stringify(objectModel.model.outputs));
    } else if (objectModel.state === 'error') {
      console.error('[CameraView] Failed to load object model:', (objectModel as {error: Error}).error);
    }
  }, [objectModel]);

  // Callback to send pose results to JS thread
  const handlePoseResult = useCallback((pose: PoseLandmarks | null) => {
    if (onPoseDetected) {
      onPoseDetected(pose);
    }
  }, [onPoseDetected]);

  // Callback to send object detection results to JS thread
  const handleObjectResult = useCallback((objects: DetectedObject[]) => {
    if (onObjectDetected) {
      onObjectDetected(objects);
    }
  }, [onObjectDetected]);

  const runPoseOnJS = useRunOnJS(handlePoseResult, [handlePoseResult]);
  const runObjectOnJS = useRunOnJS(handleObjectResult, [handleObjectResult]);

  // Frame processor for pose and object detection
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    const frameStart = Date.now();

    const poseModelLoaded = poseModel.state === 'loaded' && poseModel.model;
    const objectModelLoaded = objectModel.state === 'loaded' && objectModel.model;

    // Log frame processor status every second
    if (frameStart % 1000 < 50) {
      console.log('[FrameProcessor] Running - pose:', poseModelLoaded, 'object:', objectModelLoaded);
    }

    // Skip if no models loaded
    if (!poseModelLoaded && !objectModelLoaded) {
      return;
    }

    try {
      // Pose detection disabled for now - focusing on object detection
      // if (poseModelLoaded) { ... }

      // Run object detection
      if (objectModelLoaded) {
        console.log('[Frame] Starting resize...');
        const resizeStart = Date.now();
        const objectResized = resize(frame, {
          scale: {
            width: OBJECT_MODEL_INPUT_SIZE,
            height: OBJECT_MODEL_INPUT_SIZE,
          },
          pixelFormat: 'rgb',
          dataType: 'float32',
        });
        const resizeTime = Date.now() - resizeStart;
        console.log('[Frame] Resize done in ' + resizeTime + 'ms');

        console.log('[Frame] Starting inference...');
        const inferenceStart = Date.now();
        const objectOutputs = objectModel.model.runSync([objectResized]);
        const inferenceTime = Date.now() - inferenceStart;
        console.log('[Frame] Inference done in ' + inferenceTime + 'ms');

        // YOLO model output format: [1, 9, 8400] - TRANSPOSED format
        // Row 0-3: x_center, y_center, width, height for all 8400 anchors
        // Row 4-8: class scores for all 8400 anchors
        // Data layout: output[row * 8400 + anchor_idx]

        if (objectOutputs && objectOutputs.length >= 1) {
          const output = objectOutputs[0] as Float32Array;
          const numAnchors = 8400;
          const numClasses = 5; // 9 total - 4 bbox = 5 classes

          const minConfidence = 0.25;
          const detectedObjects: DetectedObject[] = [];

          // Find best detection
          let bestScore = 0;
          let bestIdx = -1;
          let bestClassIdx = 0;

          for (let i = 0; i < numAnchors; i++) {
            // Get max class score (rows 4-8 contain class scores)
            let maxClassScore = 0;
            let maxClassIdx = 0;
            for (let c = 0; c < numClasses; c++) {
              const classScore = output[(4 + c) * numAnchors + i];
              if (classScore > maxClassScore) {
                maxClassScore = classScore;
                maxClassIdx = c;
              }
            }

            if (maxClassScore > bestScore) {
              bestScore = maxClassScore;
              bestIdx = i;
              bestClassIdx = maxClassIdx;
            }
          }

          // Log best detection with bbox values
          if (bestIdx >= 0) {
            const xc = output[0 * numAnchors + bestIdx];
            const yc = output[1 * numAnchors + bestIdx];
            const w = output[2 * numAnchors + bestIdx];
            const h = output[3 * numAnchors + bestIdx];
            console.log('[YOLO] Best: class=' + bestClassIdx + ' score=' + bestScore.toFixed(3) +
              ' bbox=[' + xc.toFixed(1) + ',' + yc.toFixed(1) + ',' + w.toFixed(1) + ',' + h.toFixed(1) + ']');
          }

          if (bestScore >= minConfidence && bestIdx >= 0) {
            // YOLO format (transposed): values are already normalized 0-1
            const xCenter = output[0 * numAnchors + bestIdx];
            const yCenter = output[1 * numAnchors + bestIdx];
            const w = output[2 * numAnchors + bestIdx];
            const h = output[3 * numAnchors + bestIdx];

            // Convert center coords to top-left corner
            const x = Math.max(0, Math.min(1, xCenter - w / 2));
            const y = Math.max(0, Math.min(1, yCenter - h / 2));
            const width = Math.max(0.01, Math.min(1, w));
            const height = Math.max(0.01, Math.min(1, h));

            // Class 0 is basketball in this custom model
            const label = bestClassIdx === 0 ? 'basketball' : 'class_' + bestClassIdx;

            detectedObjects.push({
              label: label,
              confidence: bestScore,
              boundingBox: {x, y, width, height},
            });
          }

          runObjectOnJS(detectedObjects);

          const totalTime = Date.now() - frameStart;
          console.log('[Frame] total=' + totalTime + 'ms, detections=' + detectedObjects.length);
        }
      }
    } catch (e: any) {
      console.log('[CameraView] Frame processor error:', e?.message || e?.toString() || 'unknown error');
    }
  }, [poseModel, objectModel, resize, runPoseOnJS, runObjectOnJS]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Bloom needs camera access to track your exercise form and count reps.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  const isPoseModelReady = poseModel.state === 'loaded';
  const isObjectModelReady = objectModel.state === 'loaded';
  const isAnyModelReady = isPoseModelReady || isObjectModelReady;

  // Loading status text
  const getLoadingText = () => {
    const loading = [];
    if (poseModel.state === 'loading') loading.push('pose');
    if (objectModel.state === 'loading') loading.push('object');
    if (loading.length === 0) return null;
    return `Loading ${loading.join(' & ')} model...`;
  };

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        frameProcessor={enableDetection && isAnyModelReady ? frameProcessor : undefined}
        fps={FRAME_PROCESSING_CONFIG.targetFps}
        pixelFormat="yuv"
      />
      {enableDetection && !isAnyModelReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>{getLoadingText() || 'Loading models...'}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

// Process MoveNet output to PoseLandmarks (worklet function)
function processMoveNetOutput(output: Float32Array): PoseLandmarks {
  'worklet';

  const createPoint = (index: number): Point => {
    const baseIdx = index * 3;
    return {
      x: output[baseIdx + 1], // x is second
      y: output[baseIdx],     // y is first
      visibility: output[baseIdx + 2],
    };
  };

  const placeholder: Point = {x: 0, y: 0, visibility: 0};

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

  return {
    nose,
    leftEyeInner: leftEye,
    leftEye,
    leftEyeOuter: leftEye,
    rightEyeInner: rightEye,
    rightEye,
    rightEyeOuter: rightEye,
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
}

// TypedArray type for TFLite outputs
type TypedArray = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array;

// COCO class indices we care about
const PERSON_CLASS = 0;
const SPORTS_BALL_CLASS = 37; // sports ball in COCO

// Process anchor-based model output (19206 anchors x 90 classes)
function processAnchorBasedOutput(
  outputs: TypedArray[],
  minConfidence: number,
): DetectedObject[] {
  'worklet';

  const results: DetectedObject[] = [];

  // Model outputs:
  // [0] classScores: [1, 19206, 90] - class scores per anchor
  // [1] boxes: [1, 19206, 4] - bounding boxes per anchor
  const classScores = outputs[0];
  const boxes = outputs[1];

  const numAnchors = 19206;
  const numClasses = 90;

  // Debug: Find max scores for person and ball
  let maxPersonScore = 0;
  let maxBallScore = 0;

  // Find best detections
  for (let i = 0; i < numAnchors; i += 5) {
    const scoreOffset = i * numClasses;

    // Check sports ball class
    const ballScore = classScores[scoreOffset + SPORTS_BALL_CLASS];
    if (ballScore > maxBallScore) maxBallScore = ballScore;
    if (ballScore > minConfidence) {
      const boxOffset = i * 4;
      results.push({
        label: 'sports ball',
        confidence: ballScore,
        boundingBox: {
          x: boxes[boxOffset + 1],
          y: boxes[boxOffset],
          width: boxes[boxOffset + 3] - boxes[boxOffset + 1],
          height: boxes[boxOffset + 2] - boxes[boxOffset],
        },
      });
    }

    // Check person class
    const personScore = classScores[scoreOffset + PERSON_CLASS];
    if (personScore > maxPersonScore) maxPersonScore = personScore;
    if (personScore > minConfidence) {
      const boxOffset = i * 4;
      results.push({
        label: 'person',
        confidence: personScore,
        boundingBox: {
          x: boxes[boxOffset + 1],
          y: boxes[boxOffset],
          width: boxes[boxOffset + 3] - boxes[boxOffset + 1],
          height: boxes[boxOffset + 2] - boxes[boxOffset],
        },
      });
    }

    if (results.length >= 10) break;
  }

  // Log max scores every frame for debugging
  console.log('[ObjectDetection] MaxScores person=' + maxPersonScore.toFixed(3) + ' ball=' + maxBallScore.toFixed(3));

  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, 5);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    padding: 32,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#a0a0b0',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  settingsButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  settingsButtonText: {
    color: '#ff6b35',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
