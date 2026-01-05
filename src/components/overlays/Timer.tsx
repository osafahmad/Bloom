import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface TimerProps {
  formattedTime: string;
  label?: string;
}

export function Timer({formattedTime, label = 'TIME'}: TimerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time}>{formattedTime}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#a0a0b0',
    letterSpacing: 2,
    marginBottom: 2,
  },
  time: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
});
