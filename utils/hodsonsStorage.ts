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
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const mockStudents: HodsonsStudent[] = ALL_STUDENTS as unknown as HodsonsStudent[];

const STORAGE_KEY = 'sanawar_hodsons_results';
const SKIP_QUALIFYING_KEY = 'sanawar_hodsons_skip_qualifying_categories';
const EXTRA_STUDENTS_KEY = 'sanawar_hodsons_extra_students';
const EXTRA_CLASSES_KEY = 'sanawar_hodsons_extra_classes';

const FIRESTORE_DOC_PATH = 'data';
const FIRESTORE_COLLECTION = 'hodsons_production_v1';

const sanitizeForFirebase = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(v => sanitizeForFirebase(v)).filter(v => v !== undefined);
    }
    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            if (val !== undefined) {
                result[key] = sanitizeForFirebase(val);
            }
        }
    }
    return result;
};

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

export const saveHodsonsResults = async (results: HodsonsResult[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    try {
        await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), { results: sanitizeForFirebase(results) }, { merge: true });
        console.log('Firebase Sync: successfully pushed results to cloud');
    } catch(e) { console.error('Firebase save error:', e); }
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

export const saveSkipQualifyingCategories = async (categories: HodsonsCategory[]) => {
    localStorage.setItem(SKIP_QUALIFYING_KEY, JSON.stringify(categories));
    try {
        await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), { skipQualifyingCategories: sanitizeForFirebase(categories) }, { merge: true });
    } catch(e) { console.error('Firebase save error:', e); }
};

export const getExtraStudents = (): HodsonsStudent[] => {
    const stored = localStorage.getItem(EXTRA_STUDENTS_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const saveExtraStudents = async (students: HodsonsStudent[]) => {
    localStorage.setItem(EXTRA_STUDENTS_KEY, JSON.stringify(students));
    try {
        await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), { extraStudents: sanitizeForFirebase(students) }, { merge: true });
    } catch(e) { console.error('Firebase save error:', e); }
};

export const getExtraClasses = (): Record<string, string> => {
    const stored = localStorage.getItem(EXTRA_CLASSES_KEY);
    return stored ? JSON.parse(stored) : {};
};

export const saveExtraClasses = async (classes: Record<string, string>) => {
    localStorage.setItem(EXTRA_CLASSES_KEY, JSON.stringify(classes));
    try {
        await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), { extraClasses: sanitizeForFirebase(classes) }, { merge: true });
    } catch(e) { console.error('Firebase save error:', e); }
};

// Real-time synchronization
export const subscribeToHodsonsData = (callback: (data: any) => void) => {
    console.log('Firebase Sync: Connecting listener to cloud...');
    return onSnapshot(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), (snapshot) => {
        if (snapshot.exists()) {
            console.log('Firebase Sync: Data changed in cloud, updating local device!');
            const data = snapshot.data();
            // Update local storage so it stays perfectly in sync offline
            if (data.results) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.results));
            if (data.skipQualifyingCategories) localStorage.setItem(SKIP_QUALIFYING_KEY, JSON.stringify(data.skipQualifyingCategories));
            if (data.extraStudents) localStorage.setItem(EXTRA_STUDENTS_KEY, JSON.stringify(data.extraStudents));
            if (data.extraClasses) localStorage.setItem(EXTRA_CLASSES_KEY, JSON.stringify(data.extraClasses));
            callback(data);
        } else {
            console.log('Firebase Sync: Database is currently empty.');
        }
    }, (error) => {
        console.error('Snapshot listener error:', error);
    });
};
