import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ALL_STUDENTS } from './studentsData';

export type StudentDepartment = 'PDB' | 'PDG' | 'BD' | 'GD';
export type StudentCategory =
  | 'PDB Under 11' | 'PDB Under 12'
  | 'PDG Under 11' | 'PDG Under 12'
  | 'BD Under 13' | 'BD Under 14' | 'BD Under 16' | 'BD Opens'
  | 'GD Under 13' | 'GD Under 14' | 'GD Under 16' | 'GD Opens';

export interface ManagedStudent {
  id: string;
  name: string;
  house: 'Vindhya' | 'Himalaya' | 'Nilgiri' | 'Siwalik';
  department: StudentDepartment;
  category: StudentCategory;
  dob: string;
  className: string;
  updatedAt?: string;
}

const STUDENTS_STORAGE_KEY = 'sanawar_students';
const FIRESTORE_COLLECTION = 'sanawar_general_v1';
const FIRESTORE_DOC_PATH = 'data';
const ATHLETICS_DATE = new Date(2026, 9, 4);

const baseDepartmentForCategory = (category: string): StudentDepartment => {
  if (category.startsWith('PDB')) return 'PDB';
  if (category.startsWith('PDG')) return 'PDG';
  if (category.startsWith('BD')) return 'BD';
  return 'GD';
};

const sanitize = (value: any): any => {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  const result: Record<string, any> = {};
  Object.entries(value).forEach(([key, val]) => {
    if (val !== undefined) result[key] = sanitize(val);
  });
  return result;
};

const getAgeOnAthleticsDate = (dob: string): number | null => {
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  let age = ATHLETICS_DATE.getFullYear() - date.getFullYear();
  const beforeBirthday =
    ATHLETICS_DATE.getMonth() < date.getMonth() ||
    (ATHLETICS_DATE.getMonth() === date.getMonth() && ATHLETICS_DATE.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
};

export const getAthleticsCategoryForStudent = (department: StudentDepartment, dob: string): StudentCategory | null => {
  const age = getAgeOnAthleticsDate(dob);
  if (age === null) return null;

  if (department === 'PDB') {
    if (age < 11) return 'PDB Under 11';
    if (age === 11) return 'PDB Under 12';
    return 'BD Under 13';
  }
  if (department === 'PDG') {
    if (age < 11) return 'PDG Under 11';
    if (age === 11) return 'PDG Under 12';
    return 'GD Under 13';
  }

  const seniorPrefix = department === 'BD' ? 'BD' : 'GD';
  if (age < 13) return `${seniorPrefix} Under 13` as StudentCategory;
  if (age < 14) return `${seniorPrefix} Under 14` as StudentCategory;
  if (age < 16) return `${seniorPrefix} Under 16` as StudentCategory;
  return `${seniorPrefix} Opens` as StudentCategory;
};

export const getStudentAgeOnAthleticsDate = (dob: string): number | null => getAgeOnAthleticsDate(dob);

const baseStudents: ManagedStudent[] = (ALL_STUDENTS as any[]).map((student) => ({
  id: String(student.id),
  name: String(student.name),
  house: student.house,
  department: baseDepartmentForCategory(student.category),
  category: student.category as StudentCategory,
  dob: '',
  className: '',
}));

const getStoredStudents = (): ManagedStudent[] | null => {
  const stored = localStorage.getItem(STUDENTS_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const getManagedStudents = (): ManagedStudent[] => {
  const stored = getStoredStudents();
  if (stored) return stored;
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(baseStudents));
  return baseStudents;
};

export const getManagedStudentById = (id: string) =>
  getManagedStudents().find((student) => String(student.id) === String(id)) || null;

export const saveManagedStudent = async (student: ManagedStudent): Promise<void> => {
  const students = [...getManagedStudents()];
  const index = students.findIndex((existing) => String(existing.id) === String(student.id));
  if (index >= 0) students[index] = student;
  else students.push(student);

  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  await setDoc(
    doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH),
    sanitize({ students }),
    { merge: true }
  );
};

export const deleteManagedStudent = async (id: string): Promise<void> => {
  const students = getManagedStudents().filter((student) => String(student.id) !== String(id));
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  await setDoc(
    doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH),
    sanitize({ students }),
    { merge: true }
  );
};

export const replaceManagedStudents = async (students: ManagedStudent[]): Promise<void> => {
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  await setDoc(
    doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH),
    sanitize({ students }),
    { merge: true }
  );
};
