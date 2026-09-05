import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllHodsonsClasses, getAllHodsonsStudents, HodsonsStudent } from './hodsonsStorage';

export type AthleticsDepartment = 'PDB' | 'PDG' | 'BD' | 'GD';
export type AthleticsHouse = HodsonsStudent['house'];
export type AthleticsResultStatus = 'pending' | 'finished' | 'dnf' | 'absent' | 'medically_excused';
export type AthleticsEventKind = 'track' | 'field';
export type AthleticsTrackType = 'sprint' | 'middle_distance' | 'distance';

export interface AthleticsEvent {
  id: string;
  name: string;
  type: AthleticsTrackType | 'field';
  kind: AthleticsEventKind;
  unit: 'Mins&Secs&Milliseconds' | 'Metres&Centimetres';
  departments: AthleticsDepartment[];
}

export interface AthleticsEnrollment { eventId: string; studentIds: string[]; }
export interface AthleticsResult {
  eventId: string;
  studentId: string;
  status: AthleticsResultStatus;
  timing?: string;
  position?: number;
}
export interface AthleticsStudent extends HodsonsStudent { className: string; department: AthleticsDepartment; }
export interface AthleticsSnapshot { enrollments: AthleticsEnrollment[]; results: AthleticsResult[]; }

const ALL_DEPARTMENTS: AthleticsDepartment[] = ['PDB', 'PDG', 'BD', 'GD'];

export const ATHLETICS_EVENTS: AthleticsEvent[] = [
  { id: '100m', name: '100m', type: 'sprint', kind: 'track', unit: 'Mins&Secs&Milliseconds', departments: ALL_DEPARTMENTS },
  { id: '200m', name: '200m', type: 'sprint', kind: 'track', unit: 'Mins&Secs&Milliseconds', departments: ALL_DEPARTMENTS },
  { id: '400m', name: '400m', type: 'sprint', kind: 'track', unit: 'Mins&Secs&Milliseconds', departments: ALL_DEPARTMENTS },
  { id: '800m', name: '800m', type: 'middle_distance', kind: 'track', unit: 'Mins&Secs&Milliseconds', departments: ALL_DEPARTMENTS },
  { id: '1500m', name: '1500m', type: 'middle_distance', kind: 'track', unit: 'Mins&Secs&Milliseconds', departments: ALL_DEPARTMENTS },
  { id: '3000m', name: '3000m', type: 'distance', kind: 'track', unit: 'Mins&Secs&Milliseconds', departments: ALL_DEPARTMENTS },
  { id: 'long-jump', name: 'Long Jump', type: 'field', kind: 'field', unit: 'Metres&Centimetres', departments: ALL_DEPARTMENTS },
  { id: 'high-jump', name: 'High Jump', type: 'field', kind: 'field', unit: 'Metres&Centimetres', departments: ALL_DEPARTMENTS },
  { id: 'shot-put', name: 'Shot Put', type: 'field', kind: 'field', unit: 'Metres&Centimetres', departments: ALL_DEPARTMENTS },
  { id: 'discus-throw', name: 'Discus Throw', type: 'field', kind: 'field', unit: 'Metres&Centimetres', departments: ALL_DEPARTMENTS },
  { id: 'javelin-throw', name: 'Javelin Throw', type: 'field', kind: 'field', unit: 'Metres&Centimetres', departments: ALL_DEPARTMENTS },
  { id: 'triple-jump', name: 'Triple Jump', type: 'field', kind: 'field', unit: 'Metres&Centimetres', departments: ALL_DEPARTMENTS }
];

const ATHLETICS_STORAGE_KEY = 'sanawar_athletics_2026';
const FIRESTORE_COLLECTION = 'athletics_2026_v1';
const FIRESTORE_DOC_PATH = 'data';

const sanitizeForFirebase = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirebase);
  const result: any = {};
  Object.keys(obj).forEach(key => { result[key] = sanitizeForFirebase(obj[key]); });
  return result;
};

const emptySnapshot = (): AthleticsSnapshot => ({
  enrollments: ATHLETICS_EVENTS.map(event => ({ eventId: event.id, studentIds: [] })),
  results: []
});

export const getAthleticsSnapshot = (): AthleticsSnapshot => {
  const stored = localStorage.getItem(ATHLETICS_STORAGE_KEY);
  if (!stored) return emptySnapshot();
  try {
    const parsed = JSON.parse(stored);
    const oldEnrollments = Array.isArray(parsed.enrollments) ? parsed.enrollments : [];
    const resultMap = Array.isArray(parsed.results) ? parsed.results : [];
    const enrollmentMap = new Map(oldEnrollments.map((entry: AthleticsEnrollment) => [entry.eventId, entry.studentIds || []]));
    return {
      enrollments: ATHLETICS_EVENTS.map(event => ({ eventId: event.id, studentIds: enrollmentMap.get(event.id) || [] })),
      results: resultMap
    };
  } catch { return emptySnapshot(); }
};

export const saveAthleticsSnapshot = async (snapshot: AthleticsSnapshot) => {
  localStorage.setItem(ATHLETICS_STORAGE_KEY, JSON.stringify(snapshot));
  try { await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), sanitizeForFirebase(snapshot), { merge: true }); }
  catch (error) { console.error('Athletics Firebase save error:', error); }
};

export const subscribeToAthleticsData = (callback: (snapshot: AthleticsSnapshot) => void) => {
  return onSnapshot(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), snapshot => {
    if (!snapshot.exists()) { callback(getAthleticsSnapshot()); return; }
    const data = snapshot.data() as Partial<AthleticsSnapshot>;
    const next = { enrollments: data.enrollments || emptySnapshot().enrollments, results: data.results || [] };
    localStorage.setItem(ATHLETICS_STORAGE_KEY, JSON.stringify(next));
    callback(getAthleticsSnapshot());
  }, error => console.error('Athletics snapshot listener error:', error));
};

export const getAthleticsDepartment = (category: string): AthleticsDepartment => {
  if (category.startsWith('PDB')) return 'PDB';
  if (category.startsWith('PDG')) return 'PDG';
  if (category.startsWith('BD')) return 'BD';
  if (category.startsWith('GD')) return 'GD';
  return 'PDB';
};

export const getAthleticsStudents = (baseClasses: Record<string, string> = {}): AthleticsStudent[] => {
  const classes = getAllHodsonsClasses(baseClasses);
  return getAllHodsonsStudents().map(student => ({ ...student, department: getAthleticsDepartment(student.category), className: classes[student.id] || 'N/A' }));
};

export const getPrepAthleticsStudents = getAthleticsStudents;
