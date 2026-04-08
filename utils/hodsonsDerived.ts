import { HOUSE_COLORS } from '../constants';
import studentClasses from './studentClasses.json';
import { CATEGORIES_LIST, HodsonsCategory, HodsonsResult, mockStudents } from './hodsonsStorage';
import {
  CategoryData,
  CategoryHouseStatsMap,
  CategoryPointsRow,
  CategoryStatsSummary,
  DepartmentStandingsData,
  DerivedHodsonsData,
  HouseName,
  HouseStandingsDatum,
  StandingsScopeKey
} from '../components/hodsons/types';

const HOUSES: HouseName[] = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'];

const createCategoryHouseStats = (): CategoryHouseStatsMap => ({
  Vindhya: { total: 0, partQual: 0, qual: 0, bonusQual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 },
  Himalaya: { total: 0, partQual: 0, qual: 0, bonusQual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 },
  Nilgiri: { total: 0, partQual: 0, qual: 0, bonusQual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 },
  Siwalik: { total: 0, partQual: 0, qual: 0, bonusQual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 }
});

const createCategoryStats = (): CategoryStatsSummary => ({
  qualified: 0,
  bonusQualified: 0,
  participants: 0,
  total: 0,
  dnfCount: 0,
  preQualMedExcused: 0,
  preQualOnLeave: 0,
  preFinalsMedExcused: 0,
  preFinalsOnLeave: 0,
  totalPoints: 0,
  qualifyingPoints: 0,
  finalsPoints: 0
});

const createDepartmentStandings = (title: string): DepartmentStandingsData => ({
  title,
  stats: { qualified: 0, bonusQualified: 0, participants: 0, total: 0, onLeave: 0, absent: 0, medExcused: 0, dnfCount: 0, finishedCount: 0, qualificationRate: '0%' },
  houseStats: {
    Vindhya: { total: 0, part: 0, qual: 0, bonusQual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 },
    Himalaya: { total: 0, part: 0, qual: 0, bonusQual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 },
    Nilgiri: { total: 0, part: 0, qual: 0, bonusQual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 },
    Siwalik: { total: 0, part: 0, qual: 0, bonusQual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 }
  },
  categoryPointsMap: {},
  breakdown: []
});

export const buildDerivedHodsonsData = (
  storedResults: HodsonsResult[],
  skippedCategories: HodsonsCategory[]
): DerivedHodsonsData => {
  const housePoints: Record<HouseName, number> = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
  const bdPoints: Record<HouseName, number> = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
  const gdPoints: Record<HouseName, number> = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
  const pdPoints: Record<HouseName, number> = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };

  const catsMap = Object.fromEntries(
    CATEGORIES_LIST.map((category) => [
      category,
      {
        name: category,
        top3: [null, null, null] as CategoryData['top3'],
        stats: createCategoryStats(),
        houseStats: createCategoryHouseStats(),
        bestTiming: null,
        skipsQualifying: skippedCategories.includes(category)
      }
    ])
  ) as Record<HodsonsCategory, CategoryData>;

  const deptDataMap: Record<StandingsScopeKey, DepartmentStandingsData> = {
    Overall: createDepartmentStandings('Overall House Standings'),
    BD: createDepartmentStandings('BD Department Standings'),
    GD: createDepartmentStandings('GD Department Standings'),
    PD: createDepartmentStandings('PD Department Standings')
  };

  const updateDeptStats = (deptKey: StandingsScopeKey, stu: typeof mockStudents[number], res: HodsonsResult, pts = 0) => {
    const department = deptDataMap[deptKey];
    department.stats.total += 1;
    department.houseStats[stu.house].total += 1;

    if (!department.categoryPointsMap[stu.category]) {
      department.categoryPointsMap[stu.category] = { name: stu.category, Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
    }

    if (['qualified', 'bonus', 'finished', 'dnf', 'late'].includes(res.qualifyingType as string)) {
      department.stats.participants += 1;
      department.houseStats[stu.house].part += 1;
    }

    if (res.qualifyingType === 'qualified') {
      department.stats.qualified += 1;
      department.houseStats[stu.house].qual += 1;
    }

    if (res.qualifyingType === 'bonus') {
      department.stats.bonusQualified += 1;
      department.houseStats[stu.house].bonusQual += 1;
    }

    if (res.qualifyingType === 'finished' || res.finalsType === 'finisher') {
      department.stats.finishedCount += 1;
      department.houseStats[stu.house].finished += 1;
    }

    if (res.qualifyingType === 'dnf' || (res.qualifyingType as string) === 'late' || res.finalsType === 'dnf') {
      department.stats.dnfCount += 1;
      department.houseStats[stu.house].dnf += 1;
    }

    if (res.qualifyingType === 'absent' || res.finalsType === 'absent') {
      department.stats.absent += 1;
      department.houseStats[stu.house].absent += 1;
    }

    if (
      res.qualifyingType === 'medically_excused' ||
      res.finalsType === 'medically_excused' ||
      res.preQualifyingType === 'medically_excused' ||
      res.preFinalsType === 'medically_excused'
    ) {
      department.stats.medExcused += 1;
      department.houseStats[stu.house].medExcused += 1;
    }

    if (res.preQualifyingType === 'on_leave' || res.preFinalsType === 'on_leave') {
      department.stats.onLeave += 1;
      department.houseStats[stu.house].onLeave += 1;
    }

    department.categoryPointsMap[stu.category][stu.house] += pts;
    department.houseStats[stu.house].points += pts;
  };

  mockStudents.forEach((student) => {
    const result = storedResults.find((entry) => entry.studentId === student.id) || { studentId: student.id, qualifyingType: 'pending', finalsType: 'pending' };
    const category = catsMap[student.category];
    const house = category.houseStats[student.house];
    const skipsQualifying = skippedCategories.includes(student.category);

    category.stats.total += 1;
    house.total += 1;

    let totalPoints = 0;
    let qualifyingPoints = 0;

    if (result.qualifyingType !== 'pending') {
      if (result.qualifyingType === 'absent') {
        house.absentQual += 1;
        totalPoints -= 1;
      } else if (result.qualifyingType === 'medically_excused') {
        house.medExcused += 1;
      } else if (result.preQualifyingType === 'on_leave') {
        house.onLeaveQual += 1;
      } else {
        house.partQual += 1;
        if (result.qualifyingType === 'dnf' || (result.qualifyingType as string) === 'late') {
          house.dnfQual += 1;
          totalPoints -= 1;
          category.stats.dnfCount += 1;
        }
        if (result.qualifyingType === 'finished') {
          house.finishedQual += 1;
          totalPoints += 1;
        }
        if (result.qualifyingType === 'qualified') {
          house.qual += 1;
        }
        if (result.qualifyingType === 'bonus') {
          house.bonusQual += 1;
          category.stats.bonusQualified += 1;
        }
      }

      if (result.qualifyingTiming && (!category.bestTiming || result.qualifyingTiming < category.bestTiming.timing)) {
        category.bestTiming = { name: student.name, timing: result.qualifyingTiming, house: student.house };
      }

      house.qualifyingPoints += totalPoints;
      category.stats.qualifyingPoints += totalPoints;
      qualifyingPoints = totalPoints;
    }

    const progressed = skipsQualifying || result.qualifyingType === 'qualified' || result.qualifyingType === 'bonus';

    if (progressed) {
      if (result.finalsType === 'qualified_pos') {
        category.stats.qualified += 1;
        category.stats.participants += 1;
        house.partFinals += 1;
        house.qualFinals += 1;

        let points = 5;
        const position = result.finalsPosition || 0;
        if (position >= 1 && position <= 15) points += (16 - position);
        totalPoints += points;

        if (position === 1) category.top3[0] = { ...student, position: 1, timing: result.finalsTiming, class: (studentClasses as Record<string, string>)[student.id] || '—', rank: 1 };
        if (position === 2) category.top3[1] = { ...student, position: 2, timing: result.finalsTiming, class: (studentClasses as Record<string, string>)[student.id] || '—', rank: 2 };
        if (position === 3) category.top3[2] = { ...student, position: 3, timing: result.finalsTiming, class: (studentClasses as Record<string, string>)[student.id] || '—', rank: 3 };

        if (result.finalsTiming && (!category.bestTiming || result.finalsTiming < category.bestTiming.timing)) {
          category.bestTiming = { name: student.name, timing: result.finalsTiming, house: student.house };
        }
      } else if (result.finalsType === 'finisher') {
        category.stats.participants += 1;
        house.partFinals += 1;
        house.finishedFinals += 1;
        totalPoints += 1;

        if (result.finalsTiming && (!category.bestTiming || result.finalsTiming < category.bestTiming.timing)) {
          category.bestTiming = { name: student.name, timing: result.finalsTiming, house: student.house };
        }
      } else if (result.finalsType === 'absent') {
        house.absentFinals += 1;
        totalPoints -= 1;
      } else if (result.finalsType === 'dnf') {
        house.dnfFinals += 1;
        totalPoints -= 1;
      } else if (result.finalsType === 'medically_excused') {
        house.medExcusedFinals += 1;
      } else if (result.preFinalsType === 'on_leave') {
        house.onLeaveFinals += 1;
      }

      const finalsPoints = totalPoints - qualifyingPoints;
      house.finalsPoints += finalsPoints;
      category.stats.finalsPoints += finalsPoints;
    }

    if (result.preQualifyingType === 'medically_excused') { category.stats.preQualMedExcused += 1; house.preQualMedExcused += 1; }
    if (result.preQualifyingType === 'on_leave') { category.stats.preQualOnLeave += 1; house.preQualOnLeave += 1; }
    if (result.preFinalsType === 'medically_excused') { category.stats.preFinalsMedExcused += 1; house.preFinalsMedExcused += 1; }
    if (result.preFinalsType === 'on_leave') { category.stats.preFinalsOnLeave += 1; house.preFinalsOnLeave += 1; }

    category.stats.totalPoints += totalPoints;
    house.points += totalPoints;

    if (totalPoints !== 0) {
      housePoints[student.house] += totalPoints;
      if (student.category.startsWith('BD')) bdPoints[student.house] += totalPoints;
      else if (student.category.startsWith('GD')) gdPoints[student.house] += totalPoints;
      else if (student.category.startsWith('PD')) pdPoints[student.house] += totalPoints;
    }

    updateDeptStats('Overall', student, result, totalPoints);
    if (student.category.startsWith('BD')) updateDeptStats('BD', student, result, totalPoints);
    else if (student.category.startsWith('GD')) updateDeptStats('GD', student, result, totalPoints);
    else if (student.category.startsWith('PD')) updateDeptStats('PD', student, result, totalPoints);
  });

  Object.values(deptDataMap).forEach((department) => {
    department.breakdown = Object.values(department.categoryPointsMap);
    department.stats.qualificationRate = department.stats.total > 0
      ? `${Math.round((department.stats.qualified / department.stats.total) * 100)}%`
      : '0%';
  });

  const createStandingsData = (points: Record<HouseName, number>): HouseStandingsDatum[] => (
    HOUSES.map((house) => ({
      name: house,
      points: points[house],
      color: HOUSE_COLORS[house.toLowerCase() as keyof typeof HOUSE_COLORS].hex
    })).sort((a, b) => b.points - a.points)
  );

  const categoriesData: CategoryData[] = CATEGORIES_LIST.map((categoryName) => {
    const category = catsMap[categoryName];
    const qualificationRate = category.stats.total > 0 ? Math.round((category.stats.qualified / category.stats.total) * 100) : 0;

    let totalPoints = 0;
    let totalAbsent = 0;
    let totalMedExcused = 0;
    let totalOnLeave = 0;
    let totalParticipation = 0;
    let totalPreQualOk = 0;
    let totalPreFinalsOk = 0;

    Object.values(category.houseStats).forEach((house) => {
      totalPoints += house.points;
      totalParticipation += house.partQual;
      totalAbsent += (house.absentQual + house.absentFinals);
      totalMedExcused += (house.medExcused + house.medExcusedFinals + house.preQualMedExcused + house.preFinalsMedExcused);
      totalOnLeave += (house.onLeaveQual + house.onLeaveFinals + house.preQualOnLeave + house.preFinalsOnLeave);
    });

    mockStudents.filter((student) => student.category === categoryName).forEach((student) => {
      const result = storedResults.find((entry) => entry.studentId === student.id);
      if (result?.preQualifyingType === 'participating') totalPreQualOk += 1;
      if (skippedCategories.includes(categoryName) || result?.preFinalsType === 'participating') totalPreFinalsOk += 1;
    });

    return {
      ...category,
      stats: {
        ...category.stats,
        qualificationRate: `${qualificationRate}%`,
        totalParticipation,
        qualifiedCount: category.stats.qualified,
        totalCount: category.stats.total,
        preQualOk: totalPreQualOk,
        preFinalsOk: totalPreFinalsOk,
        totalAbsent,
        totalMedExcused,
        totalOnLeave,
        totalPoints,
        skipsQualifying: skippedCategories.includes(categoryName),
        houseStats: category.houseStats
      },
      skipsQualifying: skippedCategories.includes(categoryName)
    };
  });

  return {
    standings: createStandingsData(housePoints),
    bdStandings: createStandingsData(bdPoints),
    gdStandings: createStandingsData(gdPoints),
    pdStandings: createStandingsData(pdPoints),
    categoriesData,
    standingsDetailsMap: deptDataMap
  };
};
