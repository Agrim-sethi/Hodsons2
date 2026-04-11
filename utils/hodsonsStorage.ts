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

export type HodsonsPrePhaseType = 'pending' | 'participating' | 'on_leave' | 'medically_excused' | 'left_school';
export type HodsonsQualifyingType = 'pending' | 'qualified' | 'bonus' | 'finished' | 'dnf' | 'absent' | 'medically_excused' | 'left_school';
export type HodsonsFinalsType = 'pending' | 'qualified_pos' | 'finisher' | 'dnf' | 'absent' | 'medically_excused' | 'left_school';

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
const EXTRA_STUDENTS_KEY = 'sanawar_hodsons_extra_students';
const EXTRA_CLASSES_KEY = 'sanawar_hodsons_extra_classes';

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

export const getExtraStudents = (): HodsonsStudent[] => {
    const stored = localStorage.getItem(EXTRA_STUDENTS_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const saveExtraStudents = (students: HodsonsStudent[]) => {
    localStorage.setItem(EXTRA_STUDENTS_KEY, JSON.stringify(students));
};

export const getExtraClasses = (): Record<string, string> => {
    const stored = localStorage.getItem(EXTRA_CLASSES_KEY);
    return stored ? JSON.parse(stored) : {};
};

export const saveExtraClasses = (classes: Record<string, string>) => {
    localStorage.setItem(EXTRA_CLASSES_KEY, JSON.stringify(classes));
};
