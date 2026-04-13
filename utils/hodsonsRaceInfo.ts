import { HodsonsCategory } from './hodsonsStorage';

export interface HodsonsRaceInfo {
  category: HodsonsCategory;
  division: string;
  ageGroup: string;
  distanceKm: number;
  route: string;
  qualifyingTiming: string;
  bonusTiming: string;
  finishedTiming: string;
  recordTiming: string;
  recordYear: string;
  recordHolder: string;
}

const addMinutes = (timing: string, minutesToAdd: number) => {
  const [mmRaw, ssRaw] = timing.split(':');
  const totalSeconds = (parseInt(mmRaw, 10) || 0) * 60 + (parseInt(ssRaw, 10) || 0) + minutesToAdd * 60;
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const createRaceInfo = (
  category: HodsonsCategory,
  division: string,
  ageGroup: string,
  distanceKm: number,
  route: string,
  qualifyingTiming: string,
  recordTiming: string,
  recordYear: string,
  recordHolder: string
): HodsonsRaceInfo => ({
  category,
  division,
  ageGroup,
  distanceKm,
  route,
  qualifyingTiming,
  bonusTiming: addMinutes(qualifyingTiming, 1),
  finishedTiming: addMinutes(qualifyingTiming, 2),
  recordTiming,
  recordYear,
  recordHolder
});

export const HODSONS_RACE_INFO: Record<HodsonsCategory, HodsonsRaceInfo> = {
  'PDG Under 11': createRaceInfo('PDG Under 11', 'PD Girls', 'U-11', 0.9, 'Bank-Short Back-Arch', '05:00', '03:10:20', '1982', 'Naina Dhillon (H)'),
  'PDG Under 12': createRaceInfo('PDG Under 12', 'PD Girls', 'U-12', 1.2, 'HSB-Short Back-Arch', '05:30', '04:51:23', '2025', 'Japneet Kaur Gill-S'),
  'PDB Under 11': createRaceInfo('PDB Under 11', 'PD Boys', 'U-11', 1.2, 'HSB-Short Back-Arch', '05:30', '03:59:00', '1954', 'Jaspal Singh Mann (S)'),
  'PDB Under 12': createRaceInfo('PDB Under 12', 'PD Boys', 'U-12', 1.5, 'Ropes-Short Back-Arch', '07:00', '05:54:58', '2024', 'Ashwary Kumar (S)'),
  'GD Under 13': createRaceInfo('GD Under 13', 'Girls', 'U-13', 1.5, 'Ropes-Short Back-Arch', '08:30', '06:30:32', '2018', 'Ustat Kaur Jatana (V)'),
  'GD Under 14': createRaceInfo('GD Under 14', 'Girls', 'U-14', 1.5, 'Ropes-Short Back-Arch', '07:50', '06:16:47', '2005', 'Himani Rana (H)'),
  'GD Under 16': createRaceInfo('GD Under 16', 'Girls', 'U-16', 1.5, 'Ropes-Short Back-Arch', '07:20', '05:34:35', '1982', 'Shalini Bhoyar (H)'),
  'GD Opens': createRaceInfo('GD Opens', 'Girls', 'Opens', 1.5, 'Ropes-Short Back-Arch', '07:00', '05:42:01', '1981', 'Seema Jamwal (H)'),
  'BD Under 13': createRaceInfo('BD Under 13', 'Boys', 'U-13', 1.5, 'Ropes-Short Back-Arch', '06:30', '05:01:42', '2015', 'Rahil Nazir (S)'),
  'BD Under 14': createRaceInfo('BD Under 14', 'Boys', 'U-14', 2.2, 'Engr.-Ropes SB-Arch', '09:30', '07:48:03', '2024', 'Vito N. Zhimomi (V)'),
  'BD Under 16': createRaceInfo('BD Under 16', 'Boys', 'U-16', 2.5, 'Ropes-Long Back-Arch', '10:35', '08:42:00', '1983', 'Ravneet Chaudhary'),
  'BD Opens': createRaceInfo('BD Opens', 'Boys', 'Opens', 3.3, 'Engr.-Ropes LB-Arch', '13:30', '10:44:50', '1980', 'HS Purewal (V)')
};

export const timingToSeconds = (timing?: string) => {
  if (!timing) return Number.POSITIVE_INFINITY;
  const [mmRaw, ssRaw] = timing.split(':');
  const mm = parseInt(mmRaw, 10);
  const ss = parseInt(ssRaw, 10);
  if (Number.isNaN(mm) || Number.isNaN(ss)) return Number.POSITIVE_INFINITY;
  return mm * 60 + ss;
};

export const classifyQualifyingTiming = (
  category: HodsonsCategory,
  timing?: string
): 'qualified' | 'bonus' | 'finished' | 'dnf' | 'pending' => {
  if (!timing) return 'pending';
  const raceInfo = HODSONS_RACE_INFO[category];
  const secs = timingToSeconds(timing);
  if (!Number.isFinite(secs)) return 'pending';

  if (secs <= timingToSeconds(raceInfo.qualifyingTiming)) return 'qualified';
  if (secs <= timingToSeconds(raceInfo.bonusTiming)) return 'bonus';
  if (secs <= timingToSeconds(raceInfo.finishedTiming)) return 'finished';
  return 'dnf';
};
