import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RepCounter} from '../overlays/RepCounter';
import {Timer} from '../overlays/Timer';

interface DrillFooterProps {
  repCount: number;
  formattedTime?: string;
  showTimer?: boolean;
  onReset: () => void;
  onPause?: () => void;
  isPaused?: boolean;
}

export function DrillFooter({
  repCount,
  formattedTime,
  showTimer = true,
  onReset,
  onPause,
  isPaused,
}: DrillFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom + 20}]}>
      {showTimer && formattedTime && (
        <View style={styles.timerContainer}>
          <Timer formattedTime={formattedTime} />
        </View>
      )}

      <RepCounter count={repCount} />

      <View style={styles.buttonRow}>
        {onPause && (
          <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
            <Text style={styles.pauseText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    paddingTop: 16,
    alignItems: 'center',
  },
  timerContainer: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  pauseButton: {
    backgroundColor: '#3d3d5c',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  pauseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#2d2d44',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  resetText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
