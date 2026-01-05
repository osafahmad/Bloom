import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

interface DrillHeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
}

export function DrillHeader({title, onBack, rightElement}: DrillHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingTop: insets.top + 10}]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>{'‹ Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rightContainer}>
        {rightElement || <View style={styles.placeholder} />}
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    minWidth: 60,
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
    flex: 1,
    textAlign: 'center',
  },
  rightContainer: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 60,
  },
});
