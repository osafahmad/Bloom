import {DrillType as DrillTypeFromDrills} from '../drills/types';

export type DrillType = DrillTypeFromDrills;

export type RootStackParamList = {
  Home: undefined;
  Drill: {
    drillId: DrillType;
    title: string;
  };
  MLSettings: undefined;
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
