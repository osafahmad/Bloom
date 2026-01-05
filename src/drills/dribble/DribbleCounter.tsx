import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {DrillProps} from '../types';

interface DribbleCounterProps extends DrillProps {}

/**
 * Dribble Counter Drill
 *
 * MVP: Tap to count (placeholder for ball detection)
 * Future: Uses object detection to track basketball Y position
 *
 * Detection logic:
 * - Ball Y goes down past threshold → dribble started
 * - Ball Y comes back up → dribble completed, count++
 */
export function DribbleCounter({
  repCount,
  onRepDetected,
  status,
  objects,
}: DribbleCounterProps) {
  // MVP: Tap anywhere to count
  // Future: This will be replaced with automatic ball detection
  const handleTap = () => {
    if (status === 'active') {
      onRepDetected();
    }
  };

  // TODO: When ML is integrated, use this effect:
  // useEffect(() => {
  //   if (objects.length > 0) {
  //     const ball = objects.find(obj => obj.label === 'basketball');
  //     if (ball) {
  //       // Run dribble detection logic
  //       const {dribbleDetected} = detectDribble(ballPosition, dribbleState, threshold);
  //       if (dribbleDetected) {
  //         onRepDetected();
  //       }
  //     }
  //   }
  // }, [objects]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleTap}
      activeOpacity={1}>
      <View style={styles.overlay}>
        {status === 'active' && (
          <View style={styles.instructionContainer}>
            <Text style={styles.instruction}>Tap screen to count dribbles</Text>
            <Text style={styles.subInstruction}>
              (Auto-detection coming soon)
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.7)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  subInstruction: {
    fontSize: 14,
    color: '#a0a0b0',
    marginTop: 4,
  },
});
