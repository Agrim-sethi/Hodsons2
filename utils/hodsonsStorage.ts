export type HodsonsCategory = 
    | 'BD Under 13' | 'BD Under 14' | 'BD Under 16' | 'BD Opens'
    | 'PDB Under 11' | 'PDB Under 12' | 'PDG Under 11' | 'PDG Under 12'
    | 'GD Under 13' | 'GD Under 14' | 'GD Under 16' | 'GD Opens';

export interface HodsonsStudent {
    id: string; // Computer number
    name: string;
    house: 'Vindhya' | 'Himalaya' | 'Nilgiri' | 'Siwalik';
    category: HodsonsCategory;
}

export type HodsonsPrePhaseType = 'pending' | 'participating' | 'on_leave' | 'medically_excused';
export type HodsonsQualifyingType = 'pending' | 'qualified' | 'finished' | 'dnf' | 'absent' | 'medically_excused';
export type HodsonsFinalsType = 'pending' | 'qualified_pos' | 'finisher' | 'dnf' | 'absent' | 'medically_excused';

export interface HodsonsResult {
    studentId: string;
    preQualifyingType?: HodsonsPrePhaseType;
    preFinalsType?: HodsonsPrePhaseType;
    qualifyingType: HodsonsQualifyingType;
    qualifyingPosition?: number;
    qualifyingTiming?: string;
    finalsType: HodsonsFinalsType;
    finalsPosition?: number;
    finalsTiming?: string;
}

export const CATEGORIES_LIST: HodsonsCategory[] = [ // Ordered list
    'BD Under 13', 'BD Under 14', 'BD Under 16', 'BD Opens',
    'PDB Under 11', 'PDB Under 12', 'PDG Under 11', 'PDG Under 12',
    'GD Under 13', 'GD Under 14', 'GD Under 16', 'GD Opens'
];

import { ALL_STUDENTS } from './studentsData';

export const mockStudents: HodsonsStudent[] = ALL_STUDENTS as unknown as HodsonsStudent[];

const STORAGE_KEY = 'sanawar_hodsons_results';
const SKIP_QUALIFYING_KEY = 'sanawar_hodsons_skip_qualifying_categories';

export const getHodsonsResults = (): HodsonsResult[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    // Return default initial mock results
    return mockStudents.map(s => ({
        studentId: s.id,
        preQualifyingType: 'pending',
        preFinalsType: 'pending',
        qualifyingType: 'pending',
        finalsType: 'pending'
    }));
};

export const saveHodsonsResults = (results: HodsonsResult[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
};

export const getSkipQualifyingCategories = (): HodsonsCategory[] => {
    const stored = localStorage.getItem(SKIP_QUALIFYING_KEY);
    if (!stored) return [];

    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed as HodsonsCategory[] : [];
    } catch {
        return [];
    }
};

export const saveSkipQualifyingCategories = (categories: HodsonsCategory[]) => {
    localStorage.setItem(SKIP_QUALIFYING_KEY, JSON.stringify(categories));
};
