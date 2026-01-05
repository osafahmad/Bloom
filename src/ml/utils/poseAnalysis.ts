import {Point, PoseLandmarks} from '../types';

/**
 * Calculate angle between three points (in degrees)
 * Used for joint angle calculations (elbow, knee, etc.)
 */
export function getAngle(a: Point, b: Point, c: Point): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Calculate distance between two points
 */
export function getDistance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

/**
 * Get the midpoint between two points
 */
export function getMidpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

// ============ Pushup Detection ============

export function getElbowAngle(pose: PoseLandmarks, side: 'left' | 'right'): number {
  if (side === 'left') {
    return getAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist);
  }
  return getAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist);
}

export function isInPushupUp(pose: PoseLandmarks): boolean {
  const leftElbowAngle = getElbowAngle(pose, 'left');
  const rightElbowAngle = getElbowAngle(pose, 'right');
  const avgAngle = (leftElbowAngle + rightElbowAngle) / 2;
  return avgAngle > 150; // Arms nearly straight
}

export function isInPushupDown(pose: PoseLandmarks): boolean {
  const leftElbowAngle = getElbowAngle(pose, 'left');
  const rightElbowAngle = getElbowAngle(pose, 'right');
  const avgAngle = (leftElbowAngle + rightElbowAngle) / 2;
  return avgAngle < 100; // Arms bent
}

// ============ Lunge Detection ============

export function getKneeAngle(pose: PoseLandmarks, side: 'left' | 'right'): number {
  if (side === 'left') {
    return getAngle(pose.leftHip, pose.leftKnee, pose.leftAnkle);
  }
  return getAngle(pose.rightHip, pose.rightKnee, pose.rightAnkle);
}

export function isInLungeDown(pose: PoseLandmarks): boolean {
  const leftKneeAngle = getKneeAngle(pose, 'left');
  const rightKneeAngle = getKneeAngle(pose, 'right');
  // At least one knee should be bent significantly
  return leftKneeAngle < 110 || rightKneeAngle < 110;
}

export function isInLungeUp(pose: PoseLandmarks): boolean {
  const leftKneeAngle = getKneeAngle(pose, 'left');
  const rightKneeAngle = getKneeAngle(pose, 'right');
  // Both knees should be relatively straight
  return leftKneeAngle > 150 && rightKneeAngle > 150;
}

// ============ Situp Detection ============

export function getTorsoAngle(pose: PoseLandmarks): number {
  const hip = getMidpoint(pose.leftHip, pose.rightHip);
  const shoulder = getMidpoint(pose.leftShoulder, pose.rightShoulder);
  // Angle relative to horizontal
  const radians = Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x);
  return Math.abs((radians * 180) / Math.PI);
}

export function isInSitupDown(pose: PoseLandmarks): boolean {
  const torsoAngle = getTorsoAngle(pose);
  return torsoAngle < 30; // Lying down
}

export function isInSitupUp(pose: PoseLandmarks): boolean {
  const torsoAngle = getTorsoAngle(pose);
  return torsoAngle > 60; // Sitting up
}

// ============ Jump Detection ============

export function getAverageAnkleY(pose: PoseLandmarks): number {
  return (pose.leftAnkle.y + pose.rightAnkle.y) / 2;
}

// ============ Lateral Movement Detection ============

export function getHipCenterX(pose: PoseLandmarks): number {
  return (pose.leftHip.x + pose.rightHip.x) / 2;
}

export function isLeftOfThreshold(pose: PoseLandmarks, threshold: number): boolean {
  return getHipCenterX(pose) < threshold;
}

export function isRightOfThreshold(pose: PoseLandmarks, threshold: number): boolean {
  return getHipCenterX(pose) > threshold;
}
