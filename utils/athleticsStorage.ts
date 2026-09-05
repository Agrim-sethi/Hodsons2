import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllHodsonsClasses, getAllHodsonsStudents, HodsonsStudent } from './hodsonsStorage';

export type AthleticsDepartment = 'PDB' | 'PDG' | 'BD' | 'GD';
export type AthleticsHouse = HodsonsStudent['house'];
export type AthleticsResultStatus = 'pending' | 'finished' | 'dnf' | 'absent' | 'medically_excused';
export type AthleticsEventKind = 'track' | 'field';
export type AthleticsTrackType = 'sprint' | 'middle_distance' | 'distance';
export type AthleticsStage = 'qualifying' | 'finals';

export interface AthleticsEvent {
  id: string;
  name: string;
  type: AthleticsTrackType | 'field';
  kind: AthleticsEventKind;
  unit: 'Mins&Secs&Milliseconds' | 'Metres&Centimetres';
  departments: AthleticsDepartment[];
}

export interface AthleticsEnrollment { eventId: string; studentIds: string[]; }
export interface AthleticsFinalsConfig { eventId: string; enabled: boolean; studentIds: string[]; }
export interface AthleticsResult {
  eventId: string;
  studentId: string;
  stage?: AthleticsStage;
  status: AthleticsResultStatus;
  timing?: string;
  position?: number;
}
export interface AthleticsStudent extends HodsonsStudent { className: string; department: AthleticsDepartment; }
export interface AthleticsSnapshot {
  enrollments: AthleticsEnrollment[];
  results: AthleticsResult[];
  finals: AthleticsFinalsConfig[];
}

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
  results: [],
  finals: ATHLETICS_EVENTS.map(event => ({ eventId: event.id, enabled: false, studentIds: [] }))
});

const normalizeSnapshot = (raw: Partial<AthleticsSnapshot> | null | undefined): AthleticsSnapshot => {
  const sourceEnrollments = Array.isArray(raw?.enrollments) ? raw!.enrollments! : [];
  const enrollmentMap = new Map(sourceEnrollments.map(entry => [entry.eventId, entry.studentIds || []]));
  const sourceFinals = Array.isArray(raw?.finals) ? raw!.finals! : [];
  const finalsMap = new Map(sourceFinals.map(entry => [entry.eventId, entry]));
  const sourceResults = Array.isArray(raw?.results) ? raw!.results! : [];

  return {
    enrollments: ATHLETICS_EVENTS.map(event => ({
      eventId: event.id,
      studentIds: enrollmentMap.get(event.id) || []
    })),
    finals: ATHLETICS_EVENTS.map(event => {
      const existing = finalsMap.get(event.id);
      return {
        eventId: event.id,
        enabled: Boolean(existing?.enabled),
        studentIds: Array.isArray(existing?.studentIds) ? existing!.studentIds : []
      };
    }),
    results: sourceResults.map(result => ({
      ...result,
      stage: result.stage === 'finals' ? 'finals' : 'qualifying'
    }))
  };
};

export const getAthleticsSnapshot = (): AthleticsSnapshot => {
  const stored = localStorage.getItem(ATHLETICS_STORAGE_KEY);
  if (!stored) return emptySnapshot();
  try {
    return normalizeSnapshot(JSON.parse(stored));
  } catch {
    return emptySnapshot();
  }
};

export const saveAthleticsSnapshot = async (snapshot: AthleticsSnapshot) => {
  const normalized = normalizeSnapshot(snapshot);
  localStorage.setItem(ATHLETICS_STORAGE_KEY, JSON.stringify(normalized));
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), sanitizeForFirebase(normalized), { merge: true });
  } catch (error) {
    console.error('Athletics Firebase save error:', error);
  }
};

export const subscribeToAthleticsData = (callback: (snapshot: AthleticsSnapshot) => void) => {
  return onSnapshot(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), snapshot => {
    if (!snapshot.exists()) {
      callback(getAthleticsSnapshot());
      return;
    }
    const data = snapshot.data() as Partial<AthleticsSnapshot>;
    const next = normalizeSnapshot(data);
    localStorage.setItem(ATHLETICS_STORAGE_KEY, JSON.stringify(next));
    callback(next);
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
  return getAllHodsonsStudents().map(student => ({
    ...student,
    department: getAthleticsDepartment(student.category),
    className: classes[student.id] || 'N/A'
  }));
};

export const getPrepAthleticsStudents = getAthleticsStudents;
