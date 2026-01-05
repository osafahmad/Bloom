import React from 'react';
import {DrillConfig, DrillType} from './types';

// Drill configurations
export const DRILL_CONFIGS: Record<DrillType, DrillConfig> = {
  'dribble-counter': {
    id: 'dribble-counter',
    title: 'Dribble Counter',
    description: 'Count your dribbles with ball tracking',
    category: 'dribble',
    usesPoseDetection: false,
    usesObjectDetection: true,
    hasTimer: true,
    hasVirtualObjects: false,
  },
  'triple-threat': {
    id: 'triple-threat',
    title: 'Triple Threat',
    description: 'Track ball, pose and target overlays',
    category: 'courtSkills',
    usesPoseDetection: true,
    usesObjectDetection: true,
    hasTimer: true,
    hasVirtualObjects: true,
  },
  pushups: {
    id: 'pushups',
    title: 'Pushups',
    description: 'Rep counter with form tracking',
    category: 'conditioning',
    usesPoseDetection: true,
    usesObjectDetection: false,
    hasTimer: true,
    hasVirtualObjects: false,
  },
  lunges: {
    id: 'lunges',
    title: 'Lunges',
    description: 'Rep counter with form tracking',
    category: 'conditioning',
    usesPoseDetection: true,
    usesObjectDetection: false,
    hasTimer: true,
    hasVirtualObjects: false,
  },
  situps: {
    id: 'situps',
    title: 'Abs / Situps',
    description: 'Rep counter with form tracking',
    category: 'conditioning',
    usesPoseDetection: true,
    usesObjectDetection: false,
    hasTimer: true,
    hasVirtualObjects: false,
  },
  'jump-rope': {
    id: 'jump-rope',
    title: 'Jump Rope',
    description: 'Jump counter with pose tracking',
    category: 'conditioning',
    usesPoseDetection: true,
    usesObjectDetection: false,
    hasTimer: true,
    hasVirtualObjects: false,
  },
  'lateral-hop': {
    id: 'lateral-hop',
    title: 'Lateral Hop',
    description: 'Hop over a virtual cone',
    category: 'agility',
    usesPoseDetection: true,
    usesObjectDetection: false,
    hasTimer: true,
    hasVirtualObjects: true,
    defaultDuration: 30,
  },
  'lateral-quickness': {
    id: 'lateral-quickness',
    title: 'Lateral Quickness',
    description: 'Side-to-side between 2 cones',
    category: 'agility',
    usesPoseDetection: true,
    usesObjectDetection: false,
    hasTimer: true,
    hasVirtualObjects: true,
    defaultDuration: 30,
  },
};

/**
 * Get drill config by ID
 */
export function getDrillConfig(drillId: DrillType): DrillConfig {
  return DRILL_CONFIGS[drillId];
}

/**
 * Get all drills by category
 */
export function getDrillsByCategory(category: DrillConfig['category']): DrillConfig[] {
  return Object.values(DRILL_CONFIGS).filter(drill => drill.category === category);
}
