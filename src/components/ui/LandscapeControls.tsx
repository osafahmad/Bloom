import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

interface LandscapeControlsProps {
  title: string;
  repCount: number;
  formattedTime?: string;
  showTimer?: boolean;
  onBack: () => void;
  onReset: () => void;
  onPause?: () => void;
  isPaused?: boolean;
}

export function LandscapeControls({
  title,
  repCount,
  formattedTime,
  showTimer = true,
  onBack,
  onReset,
  onPause,
  isPaused,
}: LandscapeControlsProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingTop: insets.top + 8}]}>
      {/* Left side - Back button */}
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>{'‹'}</Text>
      </TouchableOpacity>

      {/* Center - Title, Timer, Rep Count */}
      <View style={styles.centerSection}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.statsRow}>
          {showTimer && formattedTime && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.timerValue}>{formattedTime}</Text>
            </View>
          )}

          <View style={styles.repItem}>
            <Text style={styles.statLabel}>REPS</Text>
            <Text style={styles.repValue}>{repCount}</Text>
          </View>
        </View>
      </View>

      {/* Right side - Control buttons */}
      <View style={styles.controlsSection}>
        {onPause && (
          <TouchableOpacity style={styles.controlButton} onPress={onPause}>
            <Text style={styles.controlText}>{isPaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.controlButton} onPress={onReset}>
          <Text style={styles.controlText}>↺</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    backgroundColor: 'rgba(26, 26, 46, 0.75)',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: '#ff6b35',
    fontWeight: '600',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#a0a0b0',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  repItem: {
    alignItems: 'center',
  },
  repValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  controlsSection: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(45, 45, 68, 0.8)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    fontSize: 18,
    color: '#ffffff',
  },
});
