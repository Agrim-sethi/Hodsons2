import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllHodsonsClasses, getAllHodsonsStudents, HodsonsStudent } from './hodsonsStorage';

export type AthleticsCategory = 
  | 'PDB Under 11' | 'PDB Under 12' | 'PDG Under 11' | 'PDG Under 12'
  | 'BD Under 13' | 'BD Under 14' | 'BD Under 16' | 'BD Opens'
  | 'GD Under 13' | 'GD Under 14' | 'GD Under 16' | 'GD Opens';

export const ALL_ATHLETICS_CATEGORIES: AthleticsCategory[] = [
  'PDB Under 11', 'PDB Under 12', 'PDG Under 11', 'PDG Under 12',
  'BD Under 13', 'BD Under 14', 'BD Under 16', 'BD Opens',
  'GD Under 13', 'GD Under 14', 'GD Under 16', 'GD Opens'
];

export type AthleticsHouse = HodsonsStudent['house'];
export type AthleticsResultStatus = 'pending' | 'finished' | 'dnf' | 'absent' | 'medically_excused';

export interface AthleticsEvent {
  id: string;
  name: string;
  category: 'track' | 'field';
  type: 'sprint' | 'middle_distance' | 'distance' | 'relay' | 'jump' | 'throw';
  categories: AthleticsCategory[]; // All categories this event is available for
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
  athleticsCategory: AthleticsCategory;
}

export interface AthleticsSnapshot {
  enrollments: AthleticsEnrollment[];
  results: AthleticsResult[];
}

export const ATHLETICS_EVENTS: AthleticsEvent[] = [
  // Track Events
  { id: '100m', name: '100 Metres', category: 'track', type: 'sprint', categories: ALL_ATHLETICS_CATEGORIES },
  { id: '200m', name: '200 Metres', category: 'track', type: 'sprint', categories: ALL_ATHLETICS_CATEGORIES },
  { id: '400m', name: '400 Metres', category: 'track', type: 'sprint', categories: ALL_ATHLETICS_CATEGORIES },
  { id: '800m', name: '800 Metres', category: 'track', type: 'middle_distance', categories: ALL_ATHLETICS_CATEGORIES },
  { id: '1500m', name: '1500 Metres', category: 'track', type: 'middle_distance', categories: ALL_ATHLETICS_CATEGORIES },
  { id: '3000m', name: '3000 Metres', category: 'track', type: 'distance', categories: ALL_ATHLETICS_CATEGORIES },
  // Field Events
  { id: 'long_jump', name: 'Long Jump', category: 'field', type: 'jump', categories: ALL_ATHLETICS_CATEGORIES },
  { id: 'high_jump', name: 'High Jump', category: 'field', type: 'jump', categories: ALL_ATHLETICS_CATEGORIES },
  { id: 'shot_put', name: 'Shot Put', category: 'field', type: 'throw', categories: ALL_ATHLETICS_CATEGORIES },
  { id: 'discus_throw', name: 'Discus Throw', category: 'field', type: 'throw', categories: ALL_ATHLETICS_CATEGORIES },
  { id: 'javelin_throw', name: 'Javelin Throw', category: 'field', type: 'throw', categories: ALL_ATHLETICS_CATEGORIES },
  { id: 'triple_jump', name: 'Triple Jump', category: 'field', type: 'jump', categories: ALL_ATHLETICS_CATEGORIES },
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

const getAgeAsOfOct4_2026 = (dobString: string): number => {
  const dob = new Date(dobString);
  const target = new Date('2026-10-04');
  let age = target.getFullYear() - dob.getFullYear();
  const m = target.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && target.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

export const getDynamicAthleticsCategory = (student: HodsonsStudent): AthleticsCategory => {
  let category = student.category as AthleticsCategory;

  if (student.dob) {
    const age = getAgeAsOfOct4_2026(student.dob);
    const isBD = category.startsWith('BD');
    const isGD = category.startsWith('GD');
    const isPDB = category.startsWith('PDB');
    const isPDG = category.startsWith('PDG');

    // Rule 1: Students in BD/GD that are < 12 years old should be routed to BD/GD Under 13
    if ((isBD || isGD) && age < 12) {
      return isBD ? 'BD Under 13' : 'GD Under 13';
    }

    // Rule 2: Students in PD that are >= 12 and < 13 should be routed to BD/GD Under 13
    if ((isPDB || isPDG) && age >= 12 && age < 13) {
      return isPDB ? 'BD Under 13' : 'GD Under 13';
    }
  }

  return category;
};

export const getAthleticsStudents = (baseClasses: Record<string, string> = {}): AthleticsStudent[] => {
  const classes = getAllHodsonsClasses(baseClasses);
  return getAllHodsonsStudents().map(student => ({
    ...student,
    athleticsCategory: getDynamicAthleticsCategory(student),
    className: classes[student.id] || 'N/A'
  }));
};

export const getPrepAthleticsStudents = getAthleticsStudents; // Keeping alias for backwards compatibility if needed
