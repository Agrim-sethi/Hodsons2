import { HOUSE_COLORS } from '../../constants';
import { AccessScopeConfig, DepartmentConfig, HouseAccessScope } from './types';

export const RESULTS_DEPARTMENTS: readonly DepartmentConfig[] = [
  {
    key: 'BD',
    label: "Boys' Department",
    shortLabel: 'BD',
    icon: 'male',
    accent: 'text-[#d7bf86]',
    chip: 'border-primary/20 bg-primary/10',
    buttonActive: 'border-primary/30 bg-[linear-gradient(135deg,rgba(201,163,74,0.16),rgba(255,255,255,0.03))] text-[#fff4d4] shadow-lg shadow-primary/10',
    buttonIdle: 'border-primary/10 bg-white/[0.03] text-slate-400 hover:border-primary/20 hover:text-white hover:bg-primary/[0.05]'
  },
  {
    key: 'GD',
    label: "Girls' Department",
    shortLabel: 'GD',
    icon: 'female',
    accent: 'text-[#f0d8a1]',
    chip: 'border-[#e2c98d]/20 bg-[#e2c98d]/10',
    buttonActive: 'border-[#e2c98d]/30 bg-[linear-gradient(135deg,rgba(226,201,141,0.16),rgba(255,255,255,0.03))] text-[#fff4d4] shadow-lg shadow-[#e2c98d]/10',
    buttonIdle: 'border-primary/10 bg-white/[0.03] text-slate-400 hover:border-[#e2c98d]/20 hover:text-white hover:bg-[#e2c98d]/[0.05]'
  },
  {
    key: 'PD',
    label: 'Prep Department',
    shortLabel: 'PD',
    icon: 'child_care',
    accent: 'text-[#eed59a]',
    chip: 'border-amber-400/20 bg-amber-500/10',
    buttonActive: 'border-amber-400/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(255,255,255,0.03))] text-[#fff4d4] shadow-lg shadow-amber-500/10',
    buttonIdle: 'border-primary/10 bg-white/[0.03] text-slate-400 hover:border-amber-400/20 hover:text-white hover:bg-amber-500/[0.05]'
  }
] as const;

export const ACCESS_SCOPE_CONFIG: Record<HouseAccessScope, AccessScopeConfig> = {
  Vindhya: {
    key: 'Vindhya',
    label: 'Vindhya List',
    icon: 'terrain',
    passcode: '1010',
    allowedPhases: ['pre_qualifying', 'pre_finals'],
    scopeType: 'house',
    houseKey: 'vindhya',
    visual: {
      accentClass: HOUSE_COLORS.vindhya.text,
      topBarClass: HOUSE_COLORS.vindhya.bg,
      glowHex: HOUSE_COLORS.vindhya.hex,
      badgeLabel: 'House Access'
    }
  },
  Siwalik: {
    key: 'Siwalik',
    label: 'Siwalik List',
    icon: 'landscape',
    passcode: '2121',
    allowedPhases: ['pre_qualifying', 'pre_finals'],
    scopeType: 'house',
    houseKey: 'siwalik',
    visual: {
      accentClass: HOUSE_COLORS.siwalik.text,
      topBarClass: HOUSE_COLORS.siwalik.bg,
      glowHex: HOUSE_COLORS.siwalik.hex,
      badgeLabel: 'House Access'
    }
  },
  Nilgiri: {
    key: 'Nilgiri',
    label: 'Nilgiri List',
    icon: 'filter_hdr',
    passcode: '3232',
    allowedPhases: ['pre_qualifying', 'pre_finals'],
    scopeType: 'house',
    houseKey: 'nilgiri',
    visual: {
      accentClass: HOUSE_COLORS.nilgiri.text,
      topBarClass: HOUSE_COLORS.nilgiri.bg,
      glowHex: HOUSE_COLORS.nilgiri.hex,
      badgeLabel: 'House Access'
    }
  },
  Himalaya: {
    key: 'Himalaya',
    label: 'Himalaya List',
    icon: 'ac_unit',
    passcode: '4343',
    allowedPhases: ['pre_qualifying', 'pre_finals'],
    scopeType: 'house',
    houseKey: 'himalaya',
    visual: {
      accentClass: HOUSE_COLORS.himalaya.text,
      topBarClass: HOUSE_COLORS.himalaya.bg,
      glowHex: HOUSE_COLORS.himalaya.hex,
      badgeLabel: 'House Access'
    }
  },
  All: {
    key: 'All',
    label: 'Full Houses',
    icon: 'groups',
    passcode: '5454',
    allowedPhases: ['pre_qualifying', 'qualifying', 'pre_finals', 'finals'],
    scopeType: 'all',
    visual: {
      accentClass: 'text-primary',
      topBarClass: 'bg-gradient-to-r from-[#f1d386] via-primary to-[#8d6b23]',
      glowHex: '#c9a34a',
      badgeLabel: 'All Houses'
    }
  }
};

export const ACCESS_OPTIONS = Object.values(ACCESS_SCOPE_CONFIG);
