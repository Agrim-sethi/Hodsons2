import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

const AUG30_STUDENT_DETAILS: Record<string, {
  name: string;
  dob: string;
  house: ManagedStudent['house'];
  department: StudentDepartment;
  category: StudentCategory;
  className: string;
}> = {
  "05592": {
    "name": "SASHREEK BHARDWAJ",
    "dob": "2012-08-03",
    "house": "Vindhya",
    "department": "BD",
    "category": "BD Under 16",
    "className": "9 A"
  },
  "06008": {
    "name": "AKEERA GUPTA",
    "dob": "2013-10-04",
    "house": "Vindhya",
    "department": "GD",
    "category": "GD Under 14",
    "className": "7 B"
  },
  "06028": {
    "name": "MYRA BRAR",
    "dob": "2015-11-22",
    "house": "Nilgiri",
    "department": "PDG",
    "category": "PDG Under 11",
    "className": "5 C"
  },
  "06032": {
    "name": "INAAYA SINGH",
    "dob": "2010-03-30",
    "house": "Siwalik",
    "department": "GD",
    "category": "GD Opens",
    "className": "11 A"
  },
  "06034": {
    "name": "NIHAAL SINGH WALIA",
    "dob": "2015-08-16",
    "house": "Nilgiri",
    "department": "PDB",
    "category": "PDB Under 12",
    "className": "5 B"
  },
  "06036": {
    "name": "AIRA KAUR SETHI",
    "dob": "2011-12-26",
    "house": "Nilgiri",
    "department": "GD",
    "category": "GD Under 16",
    "className": "9 B"
  },
  "06037": {
    "name": "GURSAHIB SINGH PLAHA",
    "dob": "2011-10-30",
    "house": "Vindhya",
    "department": "BD",
    "category": "BD Under 16",
    "className": "8 A"
  },
  "06038": {
    "name": "VIHAAN AGRAWAL",
    "dob": "2016-03-25",
    "house": "Vindhya",
    "department": "PDB",
    "category": "PDB Under 11",
    "className": "5 A"
  },
  "06039": {
    "name": "ANAISHA NAIR",
    "dob": "2013-08-25",
    "house": "Vindhya",
    "department": "GD",
    "category": "GD Under 14",
    "className": "8 A"
  },
  "06040": {
    "name": "ZOYA NAIR",
    "dob": "2016-02-01",
    "house": "Vindhya",
    "department": "PDG",
    "category": "PDG Under 11",
    "className": "6 B"
  },
  "06041": {
    "name": "MEHNOOR KAUR BRAR",
    "dob": "2009-11-16",
    "house": "Siwalik",
    "department": "GD",
    "category": "GD Opens",
    "className": "11 A"
  },
  "06042": {
    "name": "SAMAYA CHADHA",
    "dob": "2015-02-09",
    "house": "Nilgiri",
    "department": "PDG",
    "category": "PDG Under 12",
    "className": "6 B"
  },
  "06043": {
    "name": "RIDUL SHARMA",
    "dob": "2012-08-05",
    "house": "Vindhya",
    "department": "BD",
    "category": "BD Under 16",
    "className": "9 C"
  },
  "06044": {
    "name": "DIVIJA RANJEET DAREKAR",
    "dob": "2009-09-24",
    "house": "Siwalik",
    "department": "GD",
    "category": "GD Opens",
    "className": "11 B"
  },
  "06045": {
    "name": "ANSHITA MUNJRAL",
    "dob": "2011-08-22",
    "house": "Nilgiri",
    "department": "GD",
    "category": "GD Under 16",
    "className": "9 D"
  },
  "06046": {
    "name": "NIRBHAY SINGH KARKI",
    "dob": "2014-12-12",
    "house": "Himalaya",
    "department": "BD",
    "category": "BD Under 13",
    "className": "7 B"
  },
  "06047": {
    "name": "SAIRAB KUKKAR",
    "dob": "2013-11-19",
    "house": "Nilgiri",
    "department": "BD",
    "category": "BD Under 13",
    "className": "8 D"
  },
  "06048": {
    "name": "GAURANG GARG",
    "dob": "2010-01-09",
    "house": "Vindhya",
    "department": "BD",
    "category": "BD Opens",
    "className": "11 A"
  },
  "06049": {
    "name": "JAZZLYN RAI",
    "dob": "2010-10-21",
    "house": "Nilgiri",
    "department": "GD",
    "category": "GD Under 16",
    "className": "11 B"
  },
  "06050": {
    "name": "KUVUTOLI ISAAC ZHIMOMI",
    "dob": "2010-04-03",
    "house": "Nilgiri",
    "department": "GD",
    "category": "GD Opens",
    "className": "11 D"
  },
  "06051": {
    "name": "MAHREEN MAKKAR",
    "dob": "2015-11-09",
    "house": "Nilgiri",
    "department": "PDG",
    "category": "PDG Under 11",
    "className": "6 B"
  },
  "06052": {
    "name": "AASHRITA MIGLANI",
    "dob": "2014-10-19",
    "house": "Nilgiri",
    "department": "PDG",
    "category": "PDG Under 12",
    "className": "6 B"
  },
  "06053": {
    "name": "EBADAT DHILLON",
    "dob": "2012-01-26",
    "house": "Vindhya",
    "department": "GD",
    "category": "GD Under 16",
    "className": "8 D"
  },
  "06054": {
    "name": "AARIV GAHLOT",
    "dob": "2016-07-02",
    "house": "Siwalik",
    "department": "PDB",
    "category": "PDB Under 11",
    "className": "5 A"
  },
  "06055": {
    "name": "ISHAAN MALHOTRA",
    "dob": "2012-06-12",
    "house": "Nilgiri",
    "department": "BD",
    "category": "BD Under 16",
    "className": "8 C"
  },
  "06056": {
    "name": "ZORAWAR SINGH",
    "dob": "2012-09-09",
    "house": "Siwalik",
    "department": "BD",
    "category": "BD Under 16",
    "className": "9 A"
  },
  "06057": {
    "name": "GURJAAP SINGH",
    "dob": "2012-09-08",
    "house": "Himalaya",
    "department": "BD",
    "category": "BD Under 16",
    "className": "8 B"
  }
};

const baseStudents: ManagedStudent[] = (ALL_STUDENTS as any[]).map((student) => {
  const id = String(student.id);
  const seeded = AUG30_STUDENT_DETAILS[id];
  return seeded ? {
    id,
    name: seeded.name,
    house: seeded.house,
    department: seeded.department,
    category: seeded.category,
    dob: seeded.dob,
    className: seeded.className,
  } : {
    id,
    name: String(student.name),
    house: student.house,
    department: baseDepartmentForCategory(student.category),
    category: student.category as StudentCategory,
    dob: '',
    className: '',
  };
});

const seededStudents: ManagedStudent[] = Object.entries(AUG30_STUDENT_DETAILS).map(([id, seeded]) => ({
  id,
  name: seeded.name,
  house: seeded.house,
  department: seeded.department,
  category: seeded.category,
  dob: seeded.dob,
  className: seeded.className,
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
  const source = stored ? [...stored] : [...baseStudents];

  // Ensure the Aug 30 additions exist locally and carry the exact verified details.
  seededStudents.forEach((seeded) => {
    const index = source.findIndex((student) => String(student.id) === String(seeded.id));
    if (index >= 0) source[index] = seeded;
    else source.push(seeded);
  });

  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(source));
  return source;
};

export const getManagedStudentById = (id: string) =>
  getManagedStudents().find((student) => String(student.id) === String(id)) || null;

export const syncAug30StudentsToFirestore = async (): Promise<void> => {
  const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_PATH);
  const current = await getDoc(ref);
  const existingStudents = current.exists() && Array.isArray(current.data()?.students)
    ? current.data()?.students as ManagedStudent[]
    : [];

  const byId = new Map(existingStudents.map((student) => [String(student.id), student]));
  seededStudents.forEach((student) => byId.set(String(student.id), student));

  const merged = Array.from(byId.values());
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(getManagedStudents()));
  await setDoc(ref, sanitize({ students: merged }), { merge: true });
};

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
