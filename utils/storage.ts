import { db } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface Event {
    id: string;
    sport: string;
    sportIcon: string;
    participation: 'houses' | 'whole_school' | 'inter_school' | 'individual';
    houses?: string[]; // e.g., ['Himalaya', 'Nilgiri']
    homeSchool?: string;
    opponentSchool?: string;
    ageCategory: string;
    time: string;
    date: string; // ISO string or specific format
    venue: string;
    teachers: string;
    title: string;
    subtext: string;
    athleticsDetail?: string; // New field for specific athletics events
    completed?: boolean;
    result?: string;
    resultDetails?: {
        winner: string;
        score: string;
        points: string;
        scorers: string;
        mvp: string;
        comments: string;
    };
}

export interface Session {
    id: string;
    activity: string;
    startTime: string;
    endTime: string;
    description: string; // "For whom"
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    activity: string;
    house: string;
    attended: boolean;
    className?: string;
}

export interface InjuryRecord {
    id: string;
    playerName: string;
    house: string;
    sport: string;
    injuryType: string;
    severity: 'Low' | 'Medium' | 'High';
    date: string;
    comments: string;
}

export interface UserProfile {
    name: string;
    role: string;
    department: string;
    email: string;
    phone: string;
    avatar: string;
}

const STORAGE_KEY = 'sanawar_events';
const SESSIONS_KEY = 'sanawar_sessions';
const ATTENDANCE_KEY = 'sanawar_attendance';
const INJURIES_KEY = 'sanawar_injuries';
const PROFILE_KEY = 'sanawar_profile';

const FIRESTORE_COLLECTION = 'sanawar_general_v1';
const FIRESTORE_DOC_PATH = 'data';

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

// --- Sync Helper ---
const syncToFirebase = async (data: Record<string, any>) => {
    try {
        await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), sanitizeForFirebase(data), { merge: true });
    } catch(e) { console.error('Firebase save error:', e); }
};

export const getEvents = (): Event[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const updateEvent = (updatedEvent: Event) => {
    const events = getEvents();
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
        events[index] = updatedEvent;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
        syncToFirebase({ events });
    }
};

export const deleteEvent = (id: string) => {
    const events = getEvents();
    const filtered = events.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    syncToFirebase({ events: filtered });
};

export const saveEvent = (event: Event) => {
    const events = getEvents();
    events.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    syncToFirebase({ events });
};

export const clearEvents = () => {
    localStorage.removeItem(STORAGE_KEY);
    syncToFirebase({ events: [] });
};

// Session Helpers
export const getSessions = (): Session[] => {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const saveSession = (session: Session) => {
    const sessions = getSessions();
    sessions.push(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    syncToFirebase({ sessions });
};

export const deleteSession = (id: string) => {
    const sessions = getSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
    syncToFirebase({ sessions: filtered });
};

// Attendance Helpers
const normalizeAttendanceRecord = (record: any): AttendanceRecord[] => {
    if (!record || typeof record !== 'object') return [];

    if (Array.isArray(record.players)) {
        return record.players.map((studentId: string, index: number) => ({
            id: `${record.id || `${record.date || 'legacy'}-${record.activity || 'session'}-${record.house || 'house'}`}-${studentId}-${index}`,
            studentId,
            studentName: '',
            date: record.date || '',
            activity: record.activity || '',
            house: record.house || '',
            attended: true,
            className: ''
        }));
    }

    if (typeof record.studentId === 'string') {
        return [{
            id: record.id || `${record.date || 'attendance'}-${record.activity || 'session'}-${record.studentId}`,
            studentId: record.studentId,
            studentName: record.studentName || '',
            date: record.date || '',
            activity: record.activity || '',
            house: record.house || '',
            attended: Boolean(record.attended),
            className: record.className || ''
        }];
    }

    return [];
};

export const getAttendance = (): AttendanceRecord[] => {
    const stored = localStorage.getItem(ATTENDANCE_KEY);
    if (!stored) return [];

    try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        return parsed.flatMap(normalizeAttendanceRecord);
    } catch {
        return [];
    }
};

export const saveAttendance = (record: AttendanceRecord) => {
    const records = getAttendance();
    const index = records.findIndex(existing =>
        existing.studentId === record.studentId &&
        existing.date === record.date &&
        existing.activity === record.activity
    );

    if (index !== -1) {
        records[index] = record;
    } else {
        records.push(record);
    }

    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
    syncToFirebase({ attendance: records });
};

export const replaceAttendance = (records: AttendanceRecord[]) => {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
    syncToFirebase({ attendance: records });
};

// Injury Helpers
export const getInjuries = (): InjuryRecord[] => {
    const stored = localStorage.getItem(INJURIES_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const saveInjury = (record: InjuryRecord) => {
    const records = getInjuries();
    records.push(record);
    localStorage.setItem(INJURIES_KEY, JSON.stringify(records));
    syncToFirebase({ injuries: records });
};

export const deleteInjury = (id: string) => {
    const records = getInjuries();
    const filtered = records.filter(r => r.id !== id);
    localStorage.setItem(INJURIES_KEY, JSON.stringify(filtered));
    syncToFirebase({ injuries: filtered });
};

// Profile Helpers
export const getUserProfile = (): UserProfile | null => {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
};

export const saveUserProfile = (profile: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    syncToFirebase({ profile });
};

// Real-time synchronization
export const subscribeToGeneralData = (callback: (data: any) => void) => {
    return onSnapshot(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.events) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.events));
            if (data.sessions) localStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions));
            if (data.attendance) localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data.attendance));
            if (data.injuries) localStorage.setItem(INJURIES_KEY, JSON.stringify(data.injuries));
            if (data.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
            callback(data);
        }
    }, (error) => {
        console.error('Snapshot listener error:', error);
    });
};
