import React, {useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Linking} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';

interface CameraViewProps {
  children?: React.ReactNode;
  cameraPosition?: 'front' | 'back';
  isActive?: boolean;
}

export function CameraView({
  children,
  cameraPosition = 'front',
  isActive = true,
}: CameraViewProps) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice(cameraPosition);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centered]}>
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
        isActive={isActive}
      />
      {children}
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
