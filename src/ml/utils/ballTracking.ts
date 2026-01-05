import {BallPosition} from '../types';

interface DribbleState {
  isGoingDown: boolean;
  lastPosition: BallPosition | null;
  dribbleCount: number;
}

/**
 * Dribble detection based on ball Y position oscillation
 *
 * A dribble is counted when:
 * 1. Ball moves down past a threshold (going down)
 * 2. Ball moves back up past the threshold (coming up)
 * 3. This complete cycle = 1 dribble
 */
export function detectDribble(
  currentPosition: BallPosition,
  state: DribbleState,
  threshold: number = 0.5, // Normalized Y threshold (0-1)
): {newState: DribbleState; dribbleDetected: boolean} {
  const {lastPosition, isGoingDown, dribbleCount} = state;

  if (!lastPosition) {
    return {
      newState: {
        ...state,
        lastPosition: currentPosition,
      },
      dribbleDetected: false,
    };
  }

  const currentY = currentPosition.y;
  const lastY = lastPosition.y;

  let newIsGoingDown = isGoingDown;
  let dribbleDetected = false;
  let newDribbleCount = dribbleCount;

  // Detect direction change
  if (!isGoingDown && currentY > threshold && lastY <= threshold) {
    // Ball just went below threshold (going down)
    newIsGoingDown = true;
  } else if (isGoingDown && currentY < threshold && lastY >= threshold) {
    // Ball just came back up above threshold (completed dribble)
    newIsGoingDown = false;
    dribbleDetected = true;
    newDribbleCount = dribbleCount + 1;
  }

  return {
    newState: {
      isGoingDown: newIsGoingDown,
      lastPosition: currentPosition,
      dribbleCount: newDribbleCount,
    },
    dribbleDetected,
  };
}

/**
 * Calculate ball velocity (for advanced dribble analysis)
 */
export function getBallVelocity(
  current: BallPosition,
  previous: BallPosition,
): {vx: number; vy: number} {
  const dt = (current.timestamp - previous.timestamp) / 1000; // Convert to seconds
  if (dt === 0) return {vx: 0, vy: 0};

  return {
    vx: (current.x - previous.x) / dt,
    vy: (current.y - previous.y) / dt,
  };
}

/**
 * Smooth ball position using simple moving average
 */
export function smoothBallPosition(
  positions: BallPosition[],
  windowSize: number = 3,
): BallPosition | null {
  if (positions.length === 0) return null;

  const window = positions.slice(-windowSize);
  const avgX = window.reduce((sum, p) => sum + p.x, 0) / window.length;
  const avgY = window.reduce((sum, p) => sum + p.y, 0) / window.length;

  return {
    x: avgX,
    y: avgY,
    timestamp: positions[positions.length - 1].timestamp,
  };
}

/**
 * Initialize dribble tracking state
 */
export function createDribbleState(): DribbleState {
  return {
    isGoingDown: false,
    lastPosition: null,
    dribbleCount: 0,
  };
}
