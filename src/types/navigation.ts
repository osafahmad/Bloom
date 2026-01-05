export type DrillType =
  | 'dribble-counter'
  | 'triple-threat'
  | 'pushups'
  | 'lunges'
  | 'situps'
  | 'jump-rope'
  | 'lateral-hop'
  | 'lateral-quickness';

export type RootStackParamList = {
  Home: undefined;
  Drill: {
    drillId: DrillType;
    title: string;
  };
};

export interface DrillItem {
  id: DrillType;
  title: string;
  description: string;
}

export interface DrillCategory {
  title: string;
  drills: DrillItem[];
}
