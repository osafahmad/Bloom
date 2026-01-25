import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CategorySection} from '../components/CategorySection';
import {DrillCategory, DrillItem, RootStackParamList} from '../types/navigation';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const DRILL_CATEGORIES: DrillCategory[] = [
  {
    title: 'Dribble',
    drills: [
      {
        id: 'dribble-counter',
        title: 'Dribble Counter',
        description: 'Count your dribbles with pose tracking',
      },
    ],
  },
  {
    title: 'Court Skills',
    drills: [
      {
        id: 'triple-threat',
        title: 'Triple Threat',
        description: 'Track ball, pose and target overlays',
      },
    ],
  },
  {
    title: 'Conditioning',
    drills: [
      {
        id: 'pushups',
        title: 'Pushups',
        description: 'Rep counter with form tracking',
      },
      {
        id: 'lunges',
        title: 'Lunges',
        description: 'Rep counter with form tracking',
      },
      {
        id: 'situps',
        title: 'Abs / Situps',
        description: 'Rep counter with form tracking',
      },
      {
        id: 'jump-rope',
        title: 'Jump Rope',
        description: 'Jump counter with pose tracking',
      },
    ],
  },
  {
    title: 'Agility',
    drills: [
      {
        id: 'lateral-hop',
        title: 'Lateral Hop',
        description: 'Hop over a virtual cone',
      },
      {
        id: 'lateral-quickness',
        title: 'Lateral Quickness',
        description: 'Side-to-side between 2 cones',
      },
    ],
  },
];

export function HomeScreen({navigation}: HomeScreenProps) {
  const insets = useSafeAreaInsets();

  const handleDrillPress = (drill: DrillItem) => {
    navigation.navigate('Drill', {
      drillId: drill.id,
      title: drill.title,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>BLOOM</Text>
            <Text style={styles.subheader}>Choose your workout</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('MLSettings')}>
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {DRILL_CATEGORIES.map(category => (
          <CategorySection
            key={category.title}
            category={category}
            onDrillPress={handleDrillPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6b35',
    letterSpacing: 4,
    marginBottom: 4,
  },
  subheader: {
    fontSize: 16,
    color: '#a0a0b0',
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  settingsButton: {
    padding: 8,
    marginTop: 4,
  },
  settingsIcon: {
    fontSize: 24,
    color: '#a0a0b0',
  },
});
