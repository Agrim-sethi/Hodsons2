import { HodsonsCategory, HodsonsStudent } from '../../utils/hodsonsStorage';

export type HouseName = HodsonsStudent['house'];
export type ResultsDepartmentKey = 'BD' | 'GD' | 'PD';
export type StandingsScopeKey = 'Overall' | ResultsDepartmentKey;
export type HouseAccessScope = HouseName | 'All';
export type EditorPhase = 'pre_qualifying' | 'qualifying' | 'pre_finals' | 'finals';

export interface PodiumPlayer {
  id: string;
  name: string;
  house: HouseName;
  position: number;
  timing?: string;
  class?: string;
  rank: number;
}

export interface BestTimingRecord {
  name: string;
  timing: string;
  house: HouseName;
}

export interface CategoryHouseStats {
  total: number;
  partQual: number;
  qual: number;
  bonusQual: number;
  finishedQual: number;
  dnfQual: number;
  medExcused: number;
  absentQual: number;
  onLeaveQual: number;
  partFinals: number;
  qualFinals: number;
  qualPosFinals: number;
  finishedFinals: number;
  dnfFinals: number;
  absentFinals: number;
  medExcusedFinals: number;
  onLeaveFinals: number;
  preQualMedExcused: number;
  preQualOnLeave: number;
  preFinalsMedExcused: number;
  preFinalsOnLeave: number;
  points: number;
  qualifyingPoints: number;
  finalsPoints: number;
}

export interface CategoryStatsSummary {
  qualified: number;
  bonusQualified: number;
  participants: number;
  total: number;
  dnfCount: number;
  preQualMedExcused: number;
  preQualOnLeave: number;
  qualMedExcused: number;
  preFinalsMedExcused: number;
  preFinalsOnLeave: number;
  finalsMedExcused: number;
  totalPoints: number;
  qualifyingPoints: number;
  finalsPoints: number;
  qualificationRate?: string;
  totalParticipation?: number;
  qualifiedCount?: number;
  totalCount?: number;
  preQualOk?: number;
  preFinalsOk?: number;
  totalAbsent?: number;
  totalMedExcused?: number;
  totalOnLeave?: number;
  skipsQualifying?: boolean;
  houseStats?: CategoryHouseStatsMap;
}

export type CategoryHouseStatsMap = Record<HouseName, CategoryHouseStats>;

export interface CategoryData {
  name: HodsonsCategory;
  top3: Array<PodiumPlayer | null>;
  stats: CategoryStatsSummary;
  houseStats: CategoryHouseStatsMap;
  bestTiming: BestTimingRecord | null;
  skipsQualifying: boolean;
}

export interface DepartmentHouseStats {
  total: number;
  part: number;
  qual: number;
  bonusQual: number;
  absent: number;
  medExcused: number;
  onLeave: number;
  dnf: number;
  finished: number;
  points: number;
}

export interface DepartmentStatsSummary {
  qualified: number;
  bonusQualified: number;
  participants: number;
  total: number;
  onLeave: number;
  absent: number;
  medExcused: number;
  dnfCount: number;
  finishedCount: number;
  qualificationRate: string;
}

export interface CategoryPointsRow {
  name: string;
  Vindhya: number;
  Himalaya: number;
  Nilgiri: number;
  Siwalik: number;
}

export interface DepartmentStandingsData {
  title: string;
  stats: DepartmentStatsSummary;
  houseStats: Record<HouseName, DepartmentHouseStats>;
  categoryPointsMap: Record<string, CategoryPointsRow>;
  breakdown: CategoryPointsRow[];
}

export interface HouseStandingsDatum {
  name: HouseName;
  points: number;
  color: string;
}

export interface DerivedHodsonsData {
  standings: HouseStandingsDatum[];
  bdStandings: HouseStandingsDatum[];
  gdStandings: HouseStandingsDatum[];
  pdStandings: HouseStandingsDatum[];
  categoriesData: CategoryData[];
  standingsDetailsMap: Record<StandingsScopeKey, DepartmentStandingsData>;
}

export interface DepartmentConfig {
  key: ResultsDepartmentKey;
  label: string;
  shortLabel: string;
  icon: string;
  accent: string;
  chip: string;
  buttonActive: string;
  buttonIdle: string;
}

export interface AccessScopeConfig {
  key: HouseAccessScope;
  label: string;
  icon: string;
  passcode: string;
  allowedPhases: EditorPhase[];
  scopeType: 'all' | 'house';
  houseKey?: Lowercase<Exclude<HouseAccessScope, 'All'>>;
  visual: {
    accentClass: string;
    topBarClass: string;
    glowHex: string;
    badgeLabel: string;
  };
}
