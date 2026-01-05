import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface RepCounterProps {
  count: number;
  label?: string;
}

export function RepCounter({count, label = 'REPS'}: RepCounterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#a0a0b0',
    letterSpacing: 2,
    marginBottom: 4,
  },
  count: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
});
