/**
 * ML Detection Configuration
 *
 * Centralized settings for pose detection and object detection models.
 * Adjust these values to optimize performance vs accuracy tradeoff.
 */

// Delegate options for model execution
export type Delegate = 'CPU' | 'GPU';

// Camera resolution presets
export type CameraResolution = '480p' | '720p' | '1080p' | '4k';

// ============================================
// CAMERA SETTINGS
// ============================================
export const CAMERA_CONFIG = {
  // Camera resolution preset
  // Lower = faster processing, less battery
  // Higher = better accuracy, more detail
  resolution: '720p' as CameraResolution,

  // Camera position ('front' for selfie, 'back' for rear)
  position: 'back' as 'front' | 'back',

  // Video format (for iOS)
  format: {
    // Target frame rate
    fps: 30,

    // Photo/video resolution (width x height)
    // 480p:  640 x 480
    // 720p:  1280 x 720
    // 1080p: 1920 x 1080
    // 4k:    3840 x 2160
    photoWidth: 1280,
    photoHeight: 720,
    videoWidth: 1280,
    videoHeight: 720,
  },

  // Enable HDR (may affect performance)
  enableHdr: false,

  // Enable low light boost
  lowLightBoost: false,

  // Video stabilization mode
  videoStabilizationMode: 'off' as 'off' | 'standard' | 'cinematic',

  // Orientation lock (landscape for drills)
  orientation: 'portrait' as 'portrait' | 'landscape',

  // Mirror front camera output
  mirrorFrontCamera: true,
};

// Resolution preset mappings
export const RESOLUTION_PRESETS = {
  '480p': {width: 640, height: 480, fps: 30},
  '720p': {width: 1280, height: 720, fps: 30},
  '1080p': {width: 1920, height: 1080, fps: 30},
  '4k': {width: 3840, height: 2160, fps: 30},
};

// ============================================
// POSE DETECTION SETTINGS
// ============================================
export const POSE_DETECTION_CONFIG = {
  // Model file name (must be in ios bundle / android assets)
  modelPath: 'pose_landmarker_lite.task',

  // Execution delegate
  delegate: 'GPU' as Delegate,

  // Maximum number of poses to detect (1 for single player)
  maxResults: 1,

  // Minimum confidence score for pose detection (0.0 - 1.0)
  minPoseDetectionConfidence: 0.5,

  // Minimum confidence score for pose presence (0.0 - 1.0)
  minPosePresenceConfidence: 0.5,

  // Minimum confidence score for tracking between frames (0.0 - 1.0)
  minTrackingConfidence: 0.5,

  // Enable segmentation mask (for body outline - not needed for dribbling)
  enableSegmentation: false,
};

// ============================================
// OBJECT DETECTION SETTINGS
// ============================================
export const OBJECT_DETECTION_CONFIG = {
  // Model file name (must be in ios bundle / android assets)
  modelPath: 'efficientdet-lite0.tflite',

  // Execution delegate
  delegate: 'GPU' as Delegate,

  // Maximum number of objects to detect
  maxResults: 5,

  // Minimum confidence score for detection (0.0 - 1.0)
  minConfidence: 0.3,

  // Categories to detect (COCO dataset labels)
  // 'sports ball' is label 37 in COCO - covers basketball
  categoryAllowlist: ['sports ball'],

  // Alternative: block list (empty = allow all)
  categoryDenylist: [],
};

// ============================================
// DRIBBLE DETECTION SETTINGS
// ============================================
export const DRIBBLE_DETECTION_CONFIG = {
  // Y-axis threshold for detecting ball going down (normalized 0-1)
  // Ball must go this far below wrist to count as "down"
  downThreshold: 0.15,

  // Minimum time between dribbles in ms (prevents double counting)
  minDribbleInterval: 150,

  // Which wrist to track for dribbling ('left' | 'right' | 'auto')
  // 'auto' will detect based on which hand is closer to the ball
  handPreference: 'auto' as 'left' | 'right' | 'auto',

  // Smoothing factor for ball position (0 = no smoothing, 1 = full smoothing)
  positionSmoothing: 0.1,
};

// ============================================
// FRAME PROCESSING SETTINGS
// ============================================
export const FRAME_PROCESSING_CONFIG = {
  // Target FPS for frame processing (higher = smoother tracking)
  targetFps: 30,

  // Skip frames when processing is slow
  enableFrameSkipping: true,

  // Maximum processing time per frame in ms before skipping
  maxProcessingTime: 50,
};

// ============================================
// DEBUG SETTINGS
// ============================================
export const DEBUG_CONFIG = {
  // Log detection results to console
  logDetections: __DEV__,

  // Show FPS counter overlay
  showFpsCounter: __DEV__,

  // Draw bounding boxes around detected objects
  showBoundingBoxes: false,

  // Draw pose landmarks (skeleton)
  showPoseLandmarks: false,
};
