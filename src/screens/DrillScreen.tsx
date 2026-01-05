import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Linking, Platform} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import {RootStackParamList} from '../types/navigation';

type DrillScreenProps = NativeStackScreenProps<RootStackParamList, 'Drill'>;

export function DrillScreen({route, navigation}: DrillScreenProps) {
  const {title} = route.params;
  const insets = useSafeAreaInsets();
  const {hasPermission, requestPermission} = useCameraPermission();
  const [repCount, setRepCount] = useState(0);
  const device = useCameraDevice('front');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={[styles.header, {paddingTop: insets.top + 10}]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>{'‹ Back'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Bloom needs camera access to track your exercise form and count reps.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />

      <View style={[styles.header, {paddingTop: insets.top + 10}]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>{'‹ Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.footer, {paddingBottom: insets.bottom + 20}]}>
        <View style={styles.repContainer}>
          <Text style={styles.repLabel}>REPS</Text>
          <Text style={styles.repCount}>{repCount}</Text>
        </View>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => setRepCount(0)}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 18,
    color: '#ff6b35',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  placeholder: {
    width: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    paddingTop: 20,
    alignItems: 'center',
  },
  repContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  repLabel: {
    fontSize: 14,
    color: '#a0a0b0',
    letterSpacing: 2,
    marginBottom: 4,
  },
  repCount: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ff6b35',
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
  permissionContainer: {
    padding: 32,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#a0a0b0',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  settingsButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  settingsButtonText: {
    color: '#ff6b35',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
  },
});
