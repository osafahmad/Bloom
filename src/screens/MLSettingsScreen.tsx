import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMLSettings} from '../contexts/MLSettingsContext';
import {YoloModelType, ModelDelegate} from '../ml/config';
import {RootStackParamList} from '../types/navigation';

type MLSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MLSettings'>;

interface MLSettingsScreenProps {
  navigation: MLSettingsScreenNavigationProp;
}

const MODEL_OPTIONS: {value: YoloModelType; label: string; description: string}[] = [
  {value: 'yolo26n_float16', label: 'YOLO Float16', description: '320x320 - Fast, lower precision'},
  {value: 'yolo26n_float32', label: 'YOLO Float32', description: '640x640 - Slower, higher precision'},
  {value: 'efficientdet_lite0', label: 'EfficientDet', description: '320x320 - Alternative model'},
];

const DELEGATE_OPTIONS: {value: ModelDelegate; label: string}[] = [
  {value: 'core-ml', label: 'GPU (CoreML)'},
  {value: 'default', label: 'CPU'},
];

const CLASS_OPTIONS: {value: number; label: string}[] = [
  {value: 32, label: 'Sports Ball (Basketball)'},
  {value: 0, label: 'Person'},
  {value: -1, label: 'All Classes'},
];

export function MLSettingsScreen({navigation}: MLSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const {settings, updateSetting, resetToDefaults} = useMLSettings();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.header}>ML Settings</Text>
          <TouchableOpacity onPress={resetToDefaults} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Model Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model</Text>
          {MODEL_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                settings.activeModel === option.value && styles.optionCardSelected,
              ]}
              onPress={() => updateSetting('activeModel', option.value)}>
              <View style={styles.optionRow}>
                <View style={styles.radioOuter}>
                  {settings.activeModel === option.value && <View style={styles.radioInner} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Delegate Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Processing</Text>
          <View style={styles.segmentedControl}>
            {DELEGATE_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentButton,
                  settings.delegate === option.value && styles.segmentButtonSelected,
                ]}
                onPress={() => updateSetting('delegate', option.value)}>
                <Text
                  style={[
                    styles.segmentText,
                    settings.delegate === option.value && styles.segmentTextSelected,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Class */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detect</Text>
          {CLASS_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                settings.targetClass === option.value && styles.optionCardSelected,
              ]}
              onPress={() => updateSetting('targetClass', option.value)}>
              <View style={styles.optionRow}>
                <View style={styles.radioOuter}>
                  {settings.targetClass === option.value && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Confidence Threshold */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Confidence Threshold</Text>
            <Text style={styles.sliderValue}>{Math.round(settings.minConfidence * 100)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.05}
            maximumValue={0.9}
            step={0.05}
            value={settings.minConfidence}
            onValueChange={(value: number) => updateSetting('minConfidence', value)}
            minimumTrackTintColor="#ff6b35"
            maximumTrackTintColor="#3a3a5e"
            thumbTintColor="#ff6b35"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>More detections</Text>
            <Text style={styles.sliderLabel}>More accurate</Text>
          </View>
        </View>

        {/* Max Results */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Max Results</Text>
            <Text style={styles.sliderValue}>{settings.maxResults}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={settings.maxResults}
            onValueChange={(value: number) => updateSetting('maxResults', value)}
            minimumTrackTintColor="#ff6b35"
            maximumTrackTintColor="#3a3a5e"
            thumbTintColor="#ff6b35"
          />
        </View>

        {/* Smoothing Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smoothing</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Smoothing</Text>
            <Switch
              value={settings.enableSmoothing}
              onValueChange={value => updateSetting('enableSmoothing', value)}
              trackColor={{false: '#3a3a5e', true: '#ff6b35'}}
              thumbColor="#ffffff"
            />
          </View>

          {settings.enableSmoothing && (
            <>
              <View style={styles.sliderHeader}>
                <Text style={styles.subLabel}>Frames to Keep</Text>
                <Text style={styles.sliderValue}>{settings.maxFramesToKeep}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={30}
                step={5}
                value={settings.maxFramesToKeep}
                onValueChange={(value: number) => updateSetting('maxFramesToKeep', value)}
                minimumTrackTintColor="#ff6b35"
                maximumTrackTintColor="#3a3a5e"
                thumbTintColor="#ff6b35"
              />

              <View style={styles.sliderHeader}>
                <Text style={styles.subLabel}>Confidence Decay</Text>
                <Text style={styles.sliderValue}>{Math.round(settings.smoothingDecay * 100)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={1.0}
                step={0.05}
                value={settings.smoothingDecay}
                onValueChange={(value: number) => updateSetting('smoothingDecay', value)}
                minimumTrackTintColor="#ff6b35"
                maximumTrackTintColor="#3a3a5e"
                thumbTintColor="#ff6b35"
              />
            </>
          )}
        </View>

        {/* Current Config Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Current Config</Text>
          <Text style={styles.summaryText}>
            Model: {settings.activeModel} ({settings.delegate === 'core-ml' ? 'GPU' : 'CPU'})
          </Text>
          <Text style={styles.summaryText}>
            Confidence: {Math.round(settings.minConfidence * 100)}% | Max: {settings.maxResults}
          </Text>
          <Text style={styles.summaryText}>
            Target: Class {settings.targetClass === -1 ? 'All' : settings.targetClass}
          </Text>
        </View>

        {/* Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteText}>
            All settings apply immediately. Go back to see changes in effect.
          </Text>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#ff6b35',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  resetButton: {
    padding: 8,
  },
  resetButtonText: {
    color: '#a0a0b0',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#ff6b35',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6b35',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: '#a0a0b0',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonSelected: {
    backgroundColor: '#ff6b35',
  },
  segmentText: {
    fontSize: 14,
    color: '#a0a0b0',
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: '#ffffff',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b35',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 11,
    color: '#a0a0b0',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 15,
    color: '#ffffff',
  },
  subLabel: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  summarySection: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b35',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#a0a0b0',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noteSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#3a3a5e',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#a0a0b0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
