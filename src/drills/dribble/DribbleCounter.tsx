import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {DrillStatus} from '../../hooks/useDrillState';

interface DribbleCounterProps {
  repCount: number;
  status: DrillStatus;
  elapsedTime: number;
}

/**
 * Dribble Counter Drill Overlay
 *
 * Detection is handled by useDribbleDetection hook in DrillScreen.
 * This component just provides visual feedback/instructions.
 */
export function DribbleCounter({
  repCount,
  status,
}: DribbleCounterProps) {
  return (
    <View style={styles.container}>
      {status === 'active' && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instruction}>Dribble the ball</Text>
          <Text style={styles.subInstruction}>
            Detection active
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
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
    color: '#4ade80',
    marginTop: 4,
  },
});
