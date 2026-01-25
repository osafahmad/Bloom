import React, {useCallback, useEffect, useMemo} from 'react';
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
  YOLO_MODELS,
} from '../../ml/config';
import {PoseLandmarks, DetectedObject, Point} from '../../ml/types';
import {useMLSettings} from '../../contexts/MLSettingsContext';

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

// Store last known detection for smoothing (using Worklet-safe shared values)
let lastDetection: DetectedObject | null = null;
let framesSinceLastDetection = 0;
let lastDetectionConfidence = 0; // Track original confidence before decay

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

  // Get ML settings from context
  const {settings} = useMLSettings();

  // Load MoveNet Lightning model with GPU acceleration
  const poseModel = useTensorflowModel(
    require('../../../assets/models/movenet_lightning.tflite'),
    'core-ml',
  );

  // Load ALL YOLO models upfront so we can switch between them
  const yoloFloat16Model = useTensorflowModel(
    require('../../../assets/models/yolo26n_float16.tflite'),
    settings.delegate,
  );

  const yoloFloat32Model = useTensorflowModel(
    require('../../../assets/models/yolo26n_float32.tflite'),
    settings.delegate,
  );

  const efficientdetModel = useTensorflowModel(
    require('../../../assets/models/efficientdet_lite0.tflite'),
    settings.delegate,
  );

  // Select the active model based on settings
  const objectModel = useMemo(() => {
    switch (settings.activeModel) {
      case 'yolo26n_float32':
        return yoloFloat32Model;
      case 'efficientdet_lite0':
        return efficientdetModel;
      case 'yolo26n_float16':
      default:
        return yoloFloat16Model;
    }
  }, [settings.activeModel, yoloFloat16Model, yoloFloat32Model, efficientdetModel]);

  // Get the config for the active model
  const activeModelConfig = YOLO_MODELS[settings.activeModel];
  const inputSize = activeModelConfig.inputSize;
  const numDetections = activeModelConfig.numDetections;
  const valuesPerDetection = activeModelConfig.valuesPerDetection;
  const outputFormat = activeModelConfig.outputFormat;

  // Get resize plugin instance
  const {resize} = useResizePlugin();

  useEffect(() => {
    if (poseModel.state === 'loaded') {
      console.log('[CameraView] Pose model loaded successfully');
    } else if (poseModel.state === 'error') {
      console.error('[CameraView] Failed to load pose model:', (poseModel as {error: Error}).error);
    }
  }, [poseModel]);

  useEffect(() => {
    console.log('[CameraView] Active model:', settings.activeModel);
    console.log('[CameraView] Model state:', objectModel.state);
    console.log('[CameraView] Delegate:', settings.delegate);
    console.log('[CameraView] Input size:', inputSize);
    if (objectModel.state === 'loaded') {
      console.log('[CameraView] Object detection model loaded successfully');
      console.log('[CameraView] Model inputs:', JSON.stringify(objectModel.model.inputs));
      console.log('[CameraView] Model outputs:', JSON.stringify(objectModel.model.outputs));
    } else if (objectModel.state === 'error') {
      console.error('[CameraView] Failed to load object model:', (objectModel as {error: Error}).error);
    }
  }, [objectModel, settings.activeModel, settings.delegate, inputSize]);

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
        // Resize to model input size
        const resizeStart = Date.now();
        const objectResized = resize(frame, {
          scale: {
            width: inputSize,
            height: inputSize,
          },
          pixelFormat: 'rgb',
          dataType: 'float32',
        });
        const resizeTime = Date.now() - resizeStart;

        // Run inference
        const inferenceStart = Date.now();
        const objectOutputs = objectModel.model.runSync([objectResized]);
        const inferenceTime = Date.now() - inferenceStart;

        // Log timing occasionally (once per second) - always log regardless of outputs
        if (frameStart % 1000 < 50) {
          console.log('[Timing] resize=' + resizeTime + 'ms, inference=' + inferenceTime + 'ms, total=' + (resizeTime + inferenceTime) + 'ms');
          console.log('[Model] format=' + outputFormat + ', outputs=' + (objectOutputs ? objectOutputs.length : 0));
          if (objectOutputs) {
            for (let i = 0; i < objectOutputs.length; i++) {
              const arr = objectOutputs[i] as Float32Array;
              console.log('[Output ' + i + '] length=' + arr.length + ' first3=' + Array.from(arr.slice(0, 3)).map(v => v.toFixed(3)).join(','));
            }
          }
        }

        if (objectOutputs && objectOutputs.length >= 1) {
          // Use settings values
          const minConfidence = settings.minConfidence;
          const targetClass = settings.targetClass;
          const maxFramesToKeep = settings.maxFramesToKeep;
          const smoothingDecay = settings.smoothingDecay;

          const detectedObjects: DetectedObject[] = [];

          let bestScore = 0;
          let bestIdx = -1;
          let bestBox = {x1: 0, y1: 0, x2: 0, y2: 0};

          if (outputFormat === 'yolo') {
            // YOLO format: single output [1, 300, 6] with [x1, y1, x2, y2, conf, class]
            const output = objectOutputs[0] as Float32Array;

            // Log output details occasionally
            if (frameStart % 1000 < 50) {
              console.log('[YOLO] Output length:', output.length);
              for (let i = 0; i < 3; i++) {
                const offset = i * valuesPerDetection;
                const conf = output[offset + 4];
                const cls = Math.round(output[offset + 5]);
                console.log('[YOLO] Det' + i + ': class=' + cls + ' conf=' + conf.toFixed(2));
              }
            }

            // Find best detection matching target class
            for (let i = 0; i < numDetections; i++) {
              const offset = i * valuesPerDetection;
              const confidence = output[offset + 4];
              const classId = Math.round(output[offset + 5]);

              const matchesTarget = targetClass === -1 || classId === targetClass;
              if (matchesTarget && confidence > bestScore && confidence >= minConfidence) {
                bestScore = confidence;
                bestIdx = i;
                bestBox = {
                  x1: output[offset + 0],
                  y1: output[offset + 1],
                  x2: output[offset + 2],
                  y2: output[offset + 3],
                };
              }
            }
          } else if (outputFormat === 'efficientdet') {
            // EfficientDet format: multiple outputs
            // [0] boxes: [1, 25, 4] - y1, x1, y2, x2 (normalized)
            // [1] classes: [1, 25] - class ids
            // [2] scores: [1, 25] - confidence scores
            // [3] num_detections: [1] - number of valid detections
            const boxes = objectOutputs[0] as Float32Array;
            const classes = objectOutputs[1] as Float32Array;
            const scores = objectOutputs[2] as Float32Array;

            // Log output details occasionally
            if (frameStart % 1000 < 50) {
              console.log('[EfficientDet] boxes:', boxes.length, 'classes:', classes.length, 'scores:', scores.length);
              for (let i = 0; i < 3; i++) {
                const conf = scores[i];
                const cls = Math.round(classes[i]);
                console.log('[EfficientDet] Det' + i + ': class=' + cls + ' conf=' + conf.toFixed(2));
              }
            }

            // Find best detection matching target class
            for (let i = 0; i < numDetections; i++) {
              const confidence = scores[i];
              const classId = Math.round(classes[i]);

              const matchesTarget = targetClass === -1 || classId === targetClass;
              if (matchesTarget && confidence > bestScore && confidence >= minConfidence) {
                bestScore = confidence;
                bestIdx = i;
                // EfficientDet boxes are [y1, x1, y2, x2]
                const boxOffset = i * 4;
                bestBox = {
                  x1: boxes[boxOffset + 1], // x1
                  y1: boxes[boxOffset + 0], // y1
                  x2: boxes[boxOffset + 3], // x2
                  y2: boxes[boxOffset + 2], // y2
                };
              }
            }
          }

          // Add best detection
          if (bestIdx >= 0) {
            // Convert corner coords to x, y, width, height (already normalized 0-1)
            const x = Math.max(0, Math.min(1, bestBox.x1));
            const y = Math.max(0, Math.min(1, bestBox.y1));
            const width = Math.max(0.01, Math.min(1, bestBox.x2 - bestBox.x1));
            const height = Math.max(0.01, Math.min(1, bestBox.y2 - bestBox.y1));

            const detection: DetectedObject = {
              label: 'basketball',
              confidence: bestScore,
              boundingBox: {x, y, width, height},
            };

            detectedObjects.push(detection);
            lastDetection = detection;
            lastDetectionConfidence = bestScore; // Store original confidence
            framesSinceLastDetection = 0;
          } else {
            // No detection - use last known position for a few frames
            framesSinceLastDetection++;
            if (lastDetection && framesSinceLastDetection <= maxFramesToKeep) {
              // Show last known position with gradual decay
              // Use slower decay: confidence drops by (1 - smoothingDecay) per frame
              const decayFactor = Math.pow(smoothingDecay, framesSinceLastDetection);
              const decayedConfidence = lastDetectionConfidence * decayFactor;

              detectedObjects.push({
                ...lastDetection,
                confidence: decayedConfidence,
              });
            }
          }

          runObjectOnJS(detectedObjects);
        }
      }
    } catch (e: any) {
      console.log('[CameraView] Frame processor error:', e?.message || e?.toString() || 'unknown error');
    }
  }, [poseModel, objectModel, resize, runPoseOnJS, runObjectOnJS, inputSize, numDetections, valuesPerDetection, outputFormat, settings]);

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
        enableZoomGesture={false}
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
