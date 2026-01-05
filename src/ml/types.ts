// MediaPipe Pose Detection landmarks (33 points)
export interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PoseLandmarks {
  nose: Point;
  leftEyeInner: Point;
  leftEye: Point;
  leftEyeOuter: Point;
  rightEyeInner: Point;
  rightEye: Point;
  rightEyeOuter: Point;
  leftEar: Point;
  rightEar: Point;
  mouthLeft: Point;
  mouthRight: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftWrist: Point;
  rightWrist: Point;
  leftPinky: Point;
  rightPinky: Point;
  leftIndex: Point;
  rightIndex: Point;
  leftThumb: Point;
  rightThumb: Point;
  leftHip: Point;
  rightHip: Point;
  leftKnee: Point;
  rightKnee: Point;
  leftAnkle: Point;
  rightAnkle: Point;
  leftHeel: Point;
  rightHeel: Point;
  leftFootIndex: Point;
  rightFootIndex: Point;
}

// Object detection result
export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Ball tracking specific
export interface BallPosition {
  x: number;
  y: number;
  timestamp: number;
}
