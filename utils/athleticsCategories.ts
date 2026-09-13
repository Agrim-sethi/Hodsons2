import { getManagedStudents } from './studentStorage';

export type AthleticsDepartment = 'PDB' | 'PDG' | 'BD' | 'GD';
export type AthleticsCategory = 'PDB Under 11' | 'PDB Under 12' | 'PDG Under 11' | 'PDG Under 12' | 'BD Under 13' | 'BD Under 14' | 'BD Under 16' | 'BD Opens' | 'GD Under 13' | 'GD Under 14' | 'GD Under 16' | 'GD Opens';
export interface AthleticsCategoryStudent {
  id: string;
  name: string;
  house: 'Vindhya' | 'Himalaya' | 'Nilgiri' | 'Siwalik';
  category: AthleticsCategory;
  department: AthleticsDepartment;
}

const departmentForCategory = (category: AthleticsCategory): AthleticsDepartment =>
  category.startsWith('PDB') ? 'PDB' :
  category.startsWith('PDG') ? 'PDG' :
  category.startsWith('BD') ? 'BD' : 'GD';

// Student data is loaded from the Hodsons master list and any staff-managed
// additions/updates stored in localStorage. The old hard-coded CSV delta is
// intentionally no longer applied because the category is now verified from
// the student's DOB + department for 4 October 2026.
export const getAthleticsCategoryStudents = (): AthleticsCategoryStudent[] =>
  getManagedStudents().map((student) => ({
    id: student.id,
    name: student.name,
    house: student.house,
    category: student.category as AthleticsCategory,
    department: departmentForCategory(student.category as AthleticsCategory),
  }));

export const ATHLETICS_CATEGORY_STUDENTS: AthleticsCategoryStudent[] = getAthleticsCategoryStudents();
export const ATHLETICS_STUDENT_BY_ID = new Map(ATHLETICS_CATEGORY_STUDENTS.map(student => [student.id, student]));
export const ATHLETICS_CATEGORIES: AthleticsCategory[] = ['PDB Under 11','PDB Under 12','PDG Under 11','PDG Under 12','BD Under 13','BD Under 14','BD Under 16','BD Opens','GD Under 13','GD Under 14','GD Under 16','GD Opens'];
export const getAthleticsStudentsForCategory = (category: AthleticsCategory) => getAthleticsCategoryStudents().filter(student => student.category === category);
export const getAthleticsDepartment = (category: AthleticsCategory) => departmentForCategory(category);
