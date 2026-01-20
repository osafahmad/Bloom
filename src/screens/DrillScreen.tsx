import React, {useCallback, useEffect, useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, StatusBar, useWindowDimensions} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Orientation from 'react-native-orientation-locker';
import {RootStackParamList} from '../types/navigation';

// Components
import {CameraView, StartCountdown, SkeletonOverlay} from '../components';

// Hooks
import {useRepCounter, useTimer, useDrillState} from '../hooks';

// ML - using ball-only detection (no pose needed)
import {useBallOnlyDribbleDetection, DetectedObject} from '../ml';

// Drills
import {DribbleCounter, getDrillConfig, DrillType} from '../drills';

type DrillScreenProps = NativeStackScreenProps<RootStackParamList, 'Drill'>;

export function DrillScreen({route, navigation}: DrillScreenProps) {
  const {drillId, title} = route.params;
  const config = getDrillConfig(drillId as DrillType);
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();

  // Lock to portrait on mount (matching camera config), unlock on unmount
  useEffect(() => {
    Orientation.lockToPortrait();
    StatusBar.setHidden(true);

    return () => {
      Orientation.unlockAllOrientations();
      StatusBar.setHidden(false);
    };
  }, []);

  // Hooks
  const {count, setCount, reset: resetCount} = useRepCounter();
  const {time, start: startTimer, pause: pauseTimer, reset: resetTimer, formatTime} = useTimer();
  const {status, startCountdown, setActive, pause, resume, reset: resetStatus} = useDrillState();

  // ML hook for ball-only dribble detection (tracks ball Y position)
  const {
    dribbleCount,
    onObjectsUpdate: onDribbleObjectsUpdate,
    startTracking,
    stopTracking,
    reset: resetDribble,
  } = useBallOnlyDribbleDetection();

  // State for detected objects (ball) with smoothing
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const lastDetectionRef = React.useRef<{objects: DetectedObject[], timestamp: number}>({objects: [], timestamp: 0});

  // Smoothing: keep showing last detection for up to 300ms after it disappears
  const DETECTION_PERSIST_MS = 300;

  // Sync dribble count with rep counter
  useEffect(() => {
    setCount(dribbleCount);
  }, [dribbleCount, setCount]);

  // Start/stop tracking based on drill status
  useEffect(() => {
    if (status === 'active') {
      startTracking();
    } else {
      stopTracking();
    }
  }, [status, startTracking, stopTracking]);

  // Handle object detection callback with smoothing and dribble detection
  const handleObjectDetected = useCallback(
    (objects: DetectedObject[]) => {
      const now = Date.now();

      // Feed objects to dribble detection
      onDribbleObjectsUpdate(objects);

      if (objects.length > 0) {
        // New detection - update state and save timestamp
        lastDetectionRef.current = {objects, timestamp: now};
        setDetectedObjects(objects);
      } else {
        // No detection - check if we should persist the last one
        const timeSinceLastDetection = now - lastDetectionRef.current.timestamp;
        if (timeSinceLastDetection < DETECTION_PERSIST_MS && lastDetectionRef.current.objects.length > 0) {
          // Keep showing last detection (don't update state - it already has it)
        } else {
          // Clear detection after persist time expires
          setDetectedObjects([]);
        }
      }
    },
    [DETECTION_PERSIST_MS, onDribbleObjectsUpdate],
  );

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle drill start
  const handleStart = useCallback(() => {
    startCountdown();
  }, [startCountdown]);

  // Handle countdown complete
  const handleCountdownComplete = useCallback(() => {
    setActive();
    startTimer();
  }, [setActive, startTimer]);

  // Handle pause/resume
  const handlePauseResume = useCallback(() => {
    if (status === 'active') {
      pause();
      pauseTimer();
    } else if (status === 'paused') {
      resume();
      startTimer();
    }
  }, [status, pause, resume, pauseTimer, startTimer]);

  // Determine if detection should be enabled
  const enableDetection = status === 'active';

  // Render the appropriate drill component
  const renderDrill = () => {
    const drillProps = {
      repCount: count,
      status,
      elapsedTime: time,
    };

    switch (drillId) {
      case 'dribble-counter':
        return <DribbleCounter {...drillProps} />;
      default:
        return <DribbleCounter {...drillProps} />;
    }
  };

  const isActive = status === 'active' || status === 'paused';

  return (
    <View style={styles.container}>
      {/* Fullscreen Camera with ML detection */}
      <CameraView
        isActive={true}
        enableDetection={enableDetection}
        onObjectDetected={handleObjectDetected}>
        {/* Ball detection overlay */}
        {enableDetection && (
          <SkeletonOverlay
            pose={null}
            detectedObjects={detectedObjects}
            width={width}
            height={height}
            color="#00ff00"
            lineWidth={3}
            pointSize={8}
          />
        )}

        {/* Drill-specific overlay */}
        {renderDrill()}

        {/* Countdown overlay */}
        {status === 'countdown' && (
          <StartCountdown onComplete={handleCountdownComplete} />
        )}

        {/* Ready state: Back button + centered Start button */}
        {status === 'ready' && (
          <>
            {/* Back button top-left */}
            <TouchableOpacity
              style={[styles.backButton, {left: insets.left + 16, top: insets.top + 16}]}
              onPress={handleBack}>
              <Text style={styles.backText}>{'‹'}</Text>
            </TouchableOpacity>

            {/* Title - center top */}
            <View style={[styles.titleContainer, {top: insets.top + 16}]}>
              <Text style={styles.titleText}>{title}</Text>
            </View>

            {/* Centered Start button */}
            <View style={styles.startContainer}>
              <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                <Text style={styles.startText}>START</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Active/Paused state: Reps (left) + Timer (right) + Pause (bottom right) */}
        {isActive && (
          <>
            {/* Back button - only visible when paused */}
            {status === 'paused' && (
              <TouchableOpacity
                style={[styles.backButton, {left: insets.left + 16, bottom: insets.bottom + 16}]}
                onPress={handleBack}>
                <Text style={styles.backText}>{'‹'}</Text>
              </TouchableOpacity>
            )}

            {/* Reps - top left */}
            <View style={[styles.statsBox, {left: insets.left + 16, top: insets.top + 16}]}>
              <Text style={styles.statsLabel}>REPS</Text>
              <Text style={styles.repsValue}>{count}</Text>
            </View>

            {/* Timer - top right */}
            <View style={[styles.statsBox, {right: insets.right + 16, top: insets.top + 16}]}>
              <Text style={styles.statsLabel}>TIME</Text>
              <Text style={styles.timerValue}>{formatTime()}</Text>
            </View>

            {/* Paused overlay */}
            {status === 'paused' && (
              <View style={styles.pausedOverlay}>
                <Text style={styles.pausedText}>PAUSED</Text>
              </View>
            )}

            {/* Pause/Resume button - bottom right */}
            <TouchableOpacity
              style={[styles.pauseButton, {right: insets.right + 16, bottom: insets.bottom + 16}]}
              onPress={handlePauseResume}>
              <Text style={styles.pauseIcon}>{status === 'paused' ? '▶' : '⏸'}</Text>
              <Text style={styles.pauseText}>{status === 'paused' ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
          </>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    zIndex: 60,
  },
  backText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '600',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  startButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    borderWidth: 4,
    borderColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  statsBox: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 60,
  },
  statsLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    marginBottom: 2,
  },
  repsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  pauseButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    zIndex: 60,
  },
  pauseIcon: {
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 4,
  },
  pauseText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 55,
  },
  pausedText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 8,
  },
});
