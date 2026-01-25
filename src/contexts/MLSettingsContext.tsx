import React, {createContext, useContext, useState, useCallback, ReactNode} from 'react';
import {YOLO_CONFIG, YOLO_MODELS, YoloModelType, ModelDelegate} from '../ml/config';

// Settings state type
export interface MLSettings {
  // Model selection
  activeModel: YoloModelType;
  delegate: ModelDelegate;

  // Detection settings
  minConfidence: number;
  maxResults: number;
  targetClass: number;

  // Smoothing settings
  enableSmoothing: boolean;
  maxFramesToKeep: number;
  smoothingDecay: number;
}

// Context type with settings and update functions
interface MLSettingsContextType {
  settings: MLSettings;
  updateSetting: <K extends keyof MLSettings>(key: K, value: MLSettings[K]) => void;
  resetToDefaults: () => void;
  getModelConfig: () => typeof YOLO_MODELS[YoloModelType];
}

// Default settings from config
const defaultSettings: MLSettings = {
  activeModel: YOLO_CONFIG.activeModel,
  delegate: YOLO_CONFIG.delegate,
  minConfidence: YOLO_CONFIG.minConfidence,
  maxResults: YOLO_CONFIG.maxResults,
  targetClass: YOLO_CONFIG.targetClass,
  enableSmoothing: YOLO_CONFIG.enableSmoothing,
  maxFramesToKeep: YOLO_CONFIG.maxFramesToKeep,
  smoothingDecay: YOLO_CONFIG.smoothingDecay,
};

const MLSettingsContext = createContext<MLSettingsContextType | undefined>(undefined);

interface MLSettingsProviderProps {
  children: ReactNode;
}

export function MLSettingsProvider({children}: MLSettingsProviderProps) {
  const [settings, setSettings] = useState<MLSettings>(defaultSettings);

  const updateSetting = useCallback(<K extends keyof MLSettings>(key: K, value: MLSettings[K]) => {
    setSettings(prev => ({...prev, [key]: value}));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const getModelConfig = useCallback(() => {
    return YOLO_MODELS[settings.activeModel];
  }, [settings.activeModel]);

  return (
    <MLSettingsContext.Provider value={{settings, updateSetting, resetToDefaults, getModelConfig}}>
      {children}
    </MLSettingsContext.Provider>
  );
}

export function useMLSettings() {
  const context = useContext(MLSettingsContext);
  if (!context) {
    throw new Error('useMLSettings must be used within MLSettingsProvider');
  }
  return context;
}
