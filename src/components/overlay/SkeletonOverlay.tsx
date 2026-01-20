import React from 'react';
import {View, StyleSheet, Dimensions, Text} from 'react-native';
import {PoseLandmarks, Point, DetectedObject} from '../../ml/types';

interface SkeletonOverlayProps {
  pose: PoseLandmarks | null;
  detectedObjects?: DetectedObject[];
  width?: number;
  height?: number;
  color?: string;
  lineWidth?: number;
  pointSize?: number;
  minConfidence?: number;
  ballColor?: string;
  mirror?: boolean; // Mirror X coordinates (for front camera)
}

// Skeleton connections for MoveNet (17 keypoints)
const SKELETON_CONNECTIONS: [keyof PoseLandmarks, keyof PoseLandmarks][] = [
  // Face
  ['nose', 'leftEye'],
  ['nose', 'rightEye'],
  ['leftEye', 'leftEar'],
  ['rightEye', 'rightEar'],

  // Upper body
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],

  // Torso
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],

  // Lower body
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

// Key points to highlight (joints)
const KEY_POINTS: (keyof PoseLandmarks)[] = [
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
];

export function SkeletonOverlay({
  pose,
  detectedObjects = [],
  width = Dimensions.get('window').width,
  height = Dimensions.get('window').height,
  color = '#00ff00',
  lineWidth = 3,
  pointSize = 8,
  minConfidence = 0.3,
  ballColor = '#ff6b35',
  mirror = false,
}: SkeletonOverlayProps) {
  // Return empty view if nothing to render
  if (!pose && detectedObjects.length === 0) {
    return null;
  }

  const isPointVisible = (point: Point): boolean => {
    return (point.visibility ?? 0) >= minConfidence;
  };

  // The resize plugin does a center-crop to square before scaling
  // We need to map the model's output back to the full screen
  const toScreenCoords = (point: Point): {x: number; y: number} => {
    // MoveNet outputs normalized coordinates (0-1) from a square center-crop

    let x = point.x;
    let y = point.y;

    // Mirror X for front camera
    if (mirror) {
      x = 1 - x;
    }

    // The resize plugin center-crops to square aspect ratio
    // For landscape (width > height): full height is visible, width is cropped from sides
    // For portrait (height > width): full width is visible, height is cropped from top/bottom
    const aspectRatio = width / height;

    let screenX: number;
    let screenY: number;

    if (aspectRatio > 1) {
      // Landscape: the square crop uses full height
      // Model's X (0-1) maps to the center portion of screen width
      // Model's Y (0-1) maps to full screen height
      const visibleWidth = height; // Square is height x height
      const xOffset = (width - visibleWidth) / 2; // Left margin

      screenX = xOffset + x * visibleWidth;
      screenY = y * height;
    } else if (aspectRatio < 1) {
      // Portrait: the square crop uses full width
      // Model's X (0-1) maps to full screen width
      // Model's Y (0-1) maps to the center portion of screen height
      const visibleHeight = width; // Square is width x width
      const yOffset = (height - visibleHeight) / 2; // Top margin

      screenX = x * width;
      screenY = yOffset + y * visibleHeight;
    } else {
      // Square: no adjustment needed
      screenX = x * width;
      screenY = y * height;
    }

    return {
      x: screenX,
      y: screenY,
    };
  };

  // For object detection - map from model's square input back to screen
  // The resize plugin center-crops the camera frame to square before scaling to 320x320
  const toObjectScreenCoords = (normalizedX: number, normalizedY: number): {x: number; y: number} => {
    const aspectRatio = width / height;

    let screenX: number;
    let screenY: number;

    if (aspectRatio < 1) {
      // Portrait mode: camera frame is taller than wide
      // The resize plugin takes a square crop from the center (width x width)
      // Model coords (0-1) map to this square region
      const squareSize = width; // The crop is width x width
      const yOffset = (height - squareSize) / 2; // Top/bottom margins

      screenX = normalizedX * width;
      screenY = yOffset + normalizedY * squareSize;
    } else if (aspectRatio > 1) {
      // Landscape mode: camera frame is wider than tall
      // The resize plugin takes a square crop from the center (height x height)
      const squareSize = height;
      const xOffset = (width - squareSize) / 2;

      screenX = xOffset + normalizedX * squareSize;
      screenY = normalizedY * height;
    } else {
      // Square: direct mapping
      screenX = normalizedX * width;
      screenY = normalizedY * height;
    }

    return {x: screenX, y: screenY};
  };

  return (
    <View style={[styles.container, {width, height}]} pointerEvents="none">
      {/* Draw skeleton lines */}
      {pose && SKELETON_CONNECTIONS.map(([from, to], index) => {
        const fromPoint = pose[from];
        const toPoint = pose[to];

        if (!isPointVisible(fromPoint) || !isPointVisible(toPoint)) {
          return null;
        }

        const fromCoords = toScreenCoords(fromPoint);
        const toCoords = toScreenCoords(toPoint);

        // Calculate line properties
        const dx = toCoords.x - fromCoords.x;
        const dy = toCoords.y - fromCoords.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={`line-${index}`}
            style={[
              styles.line,
              {
                width: length,
                height: lineWidth,
                backgroundColor: color,
                left: fromCoords.x,
                top: fromCoords.y - lineWidth / 2,
                transform: [{rotate: `${angle}deg`}],
                transformOrigin: 'left center',
              },
            ]}
          />
        );
      })}

      {/* Draw keypoints */}
      {pose && KEY_POINTS.map((pointName, index) => {
        const point = pose[pointName];

        if (!isPointVisible(point)) {
          return null;
        }

        const coords = toScreenCoords(point);

        // Highlight wrists with different color
        const isWrist = pointName === 'leftWrist' || pointName === 'rightWrist';
        const pointColor = isWrist ? '#ff6b35' : color;
        const size = isWrist ? pointSize * 1.5 : pointSize;

        return (
          <View
            key={`point-${index}`}
            style={[
              styles.point,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: pointColor,
                left: coords.x - size / 2,
                top: coords.y - size / 2,
              },
            ]}
          />
        );
      })}

      {/* Draw all detected objects as circles */}
      {detectedObjects.map((obj, index) => {
        // Calculate center of bounding box
        const centerX = obj.boundingBox.x + obj.boundingBox.width / 2;
        const centerY = obj.boundingBox.y + obj.boundingBox.height / 2;

        // Map from model coords to screen coords (accounting for center-crop)
        const center = toObjectScreenCoords(centerX, centerY);

        // Calculate circle size based on bounding box dimensions
        // In portrait mode, the square crop is width x width
        const aspectRatio = width / height;
        const squareSize = aspectRatio < 1 ? width : height;
        const boxWidth = obj.boundingBox.width * squareSize;
        const boxHeight = obj.boundingBox.height * squareSize;

        // Use average of width/height for circle diameter
        const diameter = Math.max(
          boxWidth * 0.9,
          boxHeight * 0.9,
          60 // minimum size
        );

        const isBall = obj.label === 'basketball' || obj.label === 'sports ball';
        const circleColor = isBall ? ballColor : '#00ff00';

        return (
          <View key={`obj-${index}`}>
            {/* Circle around object */}
            <View
              style={[
                styles.objectCircle,
                {
                  left: center.x - diameter / 2,
                  top: center.y - diameter / 2,
                  width: diameter,
                  height: diameter,
                  borderRadius: diameter / 2,
                  borderColor: circleColor,
                },
              ]}
            />
            {/* Label with class name */}
            <View
              style={[
                styles.labelContainer,
                {
                  left: center.x - 50,
                  top: center.y - diameter / 2 - 30,
                },
              ]}>
              <Text style={[styles.objectLabel, {color: circleColor}]}>
                {obj.label} {Math.round(obj.confidence * 100)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  line: {
    position: 'absolute',
    opacity: 0.8,
  },
  point: {
    position: 'absolute',
    opacity: 0.9,
  },
  ballBox: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  ballLabel: {
    position: 'absolute',
    top: -20,
    left: 0,
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ballCircle: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
  },
  objectCircle: {
    position: 'absolute',
    borderWidth: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 100,
  },
  objectLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
