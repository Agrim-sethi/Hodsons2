import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllHodsonsClasses, getAllHodsonsStudents, HodsonsStudent } from './hodsonsStorage';

export type AthleticsDepartment = 'PDB' | 'PDG' | 'BD' | 'GD';
export type AthleticsHouse = HodsonsStudent['house'];
export type AthleticsResultStatus = 'pending' | 'finished' | 'dnf' | 'absent' | 'medically_excused';

export interface AthleticsEvent {
  id: string;
  name: string;
  distanceMeters: number;
  type: 'sprint' | 'middle_distance' | 'distance' | 'relay';
  departments: AthleticsDepartment[];
}

export interface AthleticsEnrollment {
  eventId: string;
  studentIds: string[];
}

export interface AthleticsResult {
  eventId: string;
  studentId: string;
  status: AthleticsResultStatus;
  timing?: string;
  position?: number;
}

export interface AthleticsStudent extends HodsonsStudent {
  className: string;
  department: AthleticsDepartment;
}

export interface AthleticsSnapshot {
  enrollments: AthleticsEnrollment[];
  results: AthleticsResult[];
}

export const ATHLETICS_EVENTS: AthleticsEvent[] = [
  { id: '100m', name: '100 Metres', distanceMeters: 100, type: 'sprint', departments: ['PDB', 'PDG', 'BD', 'GD'] },
  { id: '200m', name: '200 Metres', distanceMeters: 200, type: 'sprint', departments: ['PDB', 'PDG', 'BD', 'GD'] },
  { id: '400m', name: '400 Metres', distanceMeters: 400, type: 'sprint', departments: ['PDB', 'PDG', 'BD', 'GD'] },
  { id: '800m', name: '800 Metres', distanceMeters: 800, type: 'middle_distance', departments: ['PDB', 'PDG', 'BD', 'GD'] },
  { id: '1500m', name: '1500 Metres', distanceMeters: 1500, type: 'middle_distance', departments: ['PDB', 'PDG', 'BD', 'GD'] },
  { id: '3000m', name: '3000 Metres', distanceMeters: 3000, type: 'distance', departments: ['PDB', 'PDG', 'BD', 'GD'] },
  { id: '4x100m-relay', name: '4 x 100 Metres Relay', distanceMeters: 400, type: 'relay', departments: ['PDB', 'PDG', 'BD', 'GD'] }
];

const ATHLETICS_STORAGE_KEY = 'sanawar_athletics_2026';
const FIRESTORE_COLLECTION = 'athletics_2026_v1';
const FIRESTORE_DOC_PATH = 'data';

const sanitizeForFirebase = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => sanitizeForFirebase(v)).filter(v => v !== undefined);

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      result[key] = sanitizeForFirebase(obj[key]);
    }
  }
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
    const enrollments = Array.isArray(parsed.enrollments) ? parsed.enrollments : [];
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    const enrollmentMap = new Map(enrollments.map((entry: AthleticsEnrollment) => [entry.eventId, entry.studentIds || []]));

    return {
      enrollments: ATHLETICS_EVENTS.map(event => ({
        eventId: event.id,
        studentIds: enrollmentMap.get(event.id) || []
      })),
      results
    };
  } catch {
    return emptySnapshot();
  }
};

export const saveAthleticsSnapshot = async (snapshot: AthleticsSnapshot) => {
  localStorage.setItem(ATHLETICS_STORAGE_KEY, JSON.stringify(snapshot));
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), sanitizeForFirebase(snapshot), { merge: true });
  } catch (error) {
    console.error('Athletics Firebase save error:', error);
  }
};

export const subscribeToAthleticsData = (callback: (snapshot: AthleticsSnapshot) => void) => {
  return onSnapshot(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), (snapshot) => {
    if (!snapshot.exists()) {
      callback(getAthleticsSnapshot());
      return;
    }

    const data = snapshot.data() as Partial<AthleticsSnapshot>;
    const nextSnapshot = {
      enrollments: data.enrollments || emptySnapshot().enrollments,
      results: data.results || []
    };
    localStorage.setItem(ATHLETICS_STORAGE_KEY, JSON.stringify(nextSnapshot));
    callback(getAthleticsSnapshot());
  }, (error) => {
    console.error('Athletics snapshot listener error:', error);
  });
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
