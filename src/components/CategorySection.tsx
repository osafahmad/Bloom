import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {DrillCard} from './DrillCard';
import {DrillCategory, DrillItem} from '../types/navigation';

interface CategorySectionProps {
  category: DrillCategory;
  onDrillPress: (drill: DrillItem) => void;
}

export function CategorySection({category, onDrillPress}: CategorySectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.categoryTitle}>{category.title}</Text>
      {category.drills.map(drill => (
        <DrillCard
          key={drill.id}
          drill={drill}
          onPress={() => onDrillPress(drill)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6b35',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },
});
