import {PoseLandmarks, DetectedObject} from '../ml/types';

export type DrillStatus = 'ready' | 'countdown' | 'active' | 'paused' | 'complete';

export type DrillType =
  | 'dribble-counter'
  | 'triple-threat'
  | 'pushups'
  | 'lunges'
  | 'situps'
  | 'jump-rope'
  | 'lateral-hop'
  | 'lateral-quickness';

export interface DrillConfig {
  id: DrillType;
  title: string;
  description: string;
  category: 'dribble' | 'courtSkills' | 'conditioning' | 'agility';
  usesPoseDetection: boolean;
  usesObjectDetection: boolean;
  hasTimer: boolean;
  hasVirtualObjects: boolean;
  defaultDuration?: number; // in seconds, for timed drills
}

export interface DrillProps {
  pose: PoseLandmarks | null;
  objects: DetectedObject[];
  repCount: number;
  onRepDetected: () => void;
  status: DrillStatus;
  elapsedTime: number;
}

export interface DrillOverlayProps {
  pose: PoseLandmarks | null;
  objects: DetectedObject[];
}
