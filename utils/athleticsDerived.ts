import { HOUSE_COLORS } from '../constants';
import {
  ATHLETICS_EVENTS,
  AthleticsCategory,
  ALL_ATHLETICS_CATEGORIES,
  AthleticsEnrollment,
  AthleticsEvent,
  AthleticsEventSetting,
  AthleticsHouse,
  AthleticsResult,
  AthleticsStudent
} from './athleticsStorage';
import { athleticsMarkToNumber, eventDepartments } from './athleticsMarks';

export interface AthleticsPodiumAthlete {
  id: string;
  name: string;
  house: AthleticsHouse;
  className: string;
  category: AthleticsCategory;
  timing?: string;
  position: number;
}

export interface AthleticsHouseStats {
  enrolled: number;
  finished: number;
  dnf: number;
  absent: number;
  med: number;
  points: number;
}

export interface AthleticsEventStats {
  event: AthleticsEvent;
  departments: string[];
  enrolled: number;
  resulted: number;
  finished: number;
  dnf: number;
  absent: number;
  med: number;
  bestTiming?: string;
  hasFinals: boolean;
  date?: string;
  coordinator?: string;
  podium: Array<AthleticsPodiumAthlete | null>;
  houseStats: Record<AthleticsHouse, AthleticsHouseStats>;
}

export interface AthleticsCategoryPodium {
  eventId: string;
  eventName: string;
  category: AthleticsCategory;
  isField: boolean;
  top3: Array<AthleticsPodiumAthlete | null>;
}

export interface AthleticsDerivedData {
  eventStats: AthleticsEventStats[];
  standings: Array<{ name: AthleticsHouse; points: number; color: string }>;
  categoryStats: Record<AthleticsCategory, { enrolled: number; finished: number; points: number }>;
  categoryPodiums: AthleticsCategoryPodium[];
  departmentStandings: Record<string, { title: string; houseStats: Record<AthleticsHouse, { points: number }> }>;
}

const HOUSES: AthleticsHouse[] = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'];

const createHouseStats = (): Record<AthleticsHouse, AthleticsHouseStats> => ({
  Vindhya: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Himalaya: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Nilgiri: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Siwalik: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 }
});

export const athleticsValueToNumber = athleticsMarkToNumber;

const pointsForPosition = (position?: number) => {
  if (!position || position < 1 || position > 5) return 0;
  return 6 - position;
};

export const matchesCategoryFilter = (cat: AthleticsCategory, filter: string) => {
  if (!filter || filter === 'All') return true;
  return cat === filter;
};

const departmentBucket = (category: AthleticsCategory) => {
  if (category.startsWith('PD')) return 'PD';
  if (category.startsWith('GD')) return 'GD';
  return 'BD';
};

export const officialResultForEvent = (
  result: AthleticsResult | undefined,
  hasFinals: boolean
) => {
  if (!result) {
    return { status: 'pending' as const, timing: undefined as string | undefined, position: undefined as number | undefined };
  }
  if (hasFinals) {
    return {
      status: result.finalsStatus || 'pending',
      timing: result.finalsTiming,
      position: result.finalsPosition
    };
  }
  return {
    status: result.status,
    timing: result.timing,
    position: result.position
  };
};

export const rankFinishedResults = (
  results: AthleticsResult[],
  students: AthleticsStudent[],
  event: AthleticsEvent,
  stage: 'qualifying' | 'finals'
) => {
  const isField = event.category === 'field';
  const studentMap = new Map(students.map(student => [student.id, student]));
  const grouped = new Map<string, AthleticsResult[]>();

  results.forEach(result => {
    const student = studentMap.get(result.studentId);
    if (!student) return;
    const status = stage === 'finals' ? result.finalsStatus : result.status;
    const timing = stage === 'finals' ? result.finalsTiming : result.timing;
    if (status !== 'finished' || !timing) return;
    const key = student.athleticsCategory;
    const list = grouped.get(key) || [];
    list.push(result);
    grouped.set(key, list);
  });

  const rankMap = new Map<string, number>();
  grouped.forEach(list => {
    list
      .slice()
      .sort((a, b) => {
        const valA = athleticsMarkToNumber(stage === 'finals' ? a.finalsTiming : a.timing, isField);
        const valB = athleticsMarkToNumber(stage === 'finals' ? b.finalsTiming : b.timing, isField);
        return isField ? valB - valA : valA - valB;
      })
      .forEach((result, index) => {
        rankMap.set(result.studentId, index + 1);
      });
  });

  return rankMap;
};

export const buildAthleticsDerivedData = (
  enrollments: AthleticsEnrollment[],
  results: AthleticsResult[],
  students: AthleticsStudent[],
  eventSettings: Record<string, AthleticsEventSetting> = {},
  categoryFilter: string = 'All'
): AthleticsDerivedData => {
  const studentMap = new Map(students.map(student => [student.id, student]));
  const enrollmentMap = new Map(enrollments.map(entry => [entry.eventId, entry.studentIds || []]));
  const resultMap = new Map(results.map(result => [`${result.eventId}:${result.studentId}`, result]));
  const housePoints: Record<AthleticsHouse, number> = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };

  const categoryStats = {} as Record<AthleticsCategory, { enrolled: number; finished: number; points: number }>;
  ALL_ATHLETICS_CATEGORIES.forEach(cat => {
    categoryStats[cat] = { enrolled: 0, finished: 0, points: 0 };
  });

  const emptyDeptHouse = (): Record<AthleticsHouse, { points: number }> => ({
    Vindhya: { points: 0 },
    Himalaya: { points: 0 },
    Nilgiri: { points: 0 },
    Siwalik: { points: 0 }
  });

  const departmentStandings: AthleticsDerivedData['departmentStandings'] = {
    Overall: { title: 'Overall House Standings', houseStats: emptyDeptHouse() },
    BD: { title: 'Boys Department', houseStats: emptyDeptHouse() },
    GD: { title: 'Girls Department', houseStats: emptyDeptHouse() },
    PD: { title: 'Prep Department', houseStats: emptyDeptHouse() }
  };

  const categoryPodiums: AthleticsCategoryPodium[] = [];

  const eventStats = ATHLETICS_EVENTS.map((event): AthleticsEventStats => {
    const isField = event.category === 'field';
    const hasFinals = Boolean(eventSettings[event.id]?.hasFinals);
    const houseStats = createHouseStats();
    const enrolledIds = enrollmentMap.get(event.id) || [];
    const podiumByCategory = new Map<AthleticsCategory, AthleticsPodiumAthlete[]>();
    let resulted = 0;
    let finished = 0;
    let dnf = 0;
    let absent = 0;
    let med = 0;
    let bestTiming: string | undefined;

    enrolledIds.forEach(studentId => {
      const student = studentMap.get(studentId);
      if (!student) return;
      if (!matchesCategoryFilter(student.athleticsCategory, categoryFilter)) return;

      const stored = resultMap.get(`${event.id}:${studentId}`);
      const official = officialResultForEvent(stored, hasFinals);
      houseStats[student.house].enrolled += 1;
      if (categoryStats[student.athleticsCategory]) {
        categoryStats[student.athleticsCategory].enrolled += 1;
      }

      if (official.status === 'pending') return;
      resulted += 1;

      if (official.status === 'finished') {
        finished += 1;
        houseStats[student.house].finished += 1;
        if (categoryStats[student.athleticsCategory]) {
          categoryStats[student.athleticsCategory].finished += 1;
        }
        const points = pointsForPosition(official.position);
        houseStats[student.house].points += points;
        housePoints[student.house] += points;
        departmentStandings.Overall.houseStats[student.house].points += points;
        const dept = departmentBucket(student.athleticsCategory);
        departmentStandings[dept].houseStats[student.house].points += points;
        if (categoryStats[student.athleticsCategory]) {
          categoryStats[student.athleticsCategory].points += points;
        }

        const athlete: AthleticsPodiumAthlete = {
          id: student.id,
          name: student.name,
          house: student.house,
          className: student.className,
          category: student.athleticsCategory,
          timing: official.timing,
          position: official.position || 999
        };
        const catList = podiumByCategory.get(student.athleticsCategory) || [];
        catList.push(athlete);
        podiumByCategory.set(student.athleticsCategory, catList);

        if (official.timing) {
          const currentVal = athleticsMarkToNumber(official.timing, isField);
          const bestVal = athleticsMarkToNumber(bestTiming, isField);
          if (bestTiming === undefined || (isField ? currentVal > bestVal : currentVal < bestVal)) {
            bestTiming = official.timing;
          }
        }
      }

      if (official.status === 'dnf') {
        dnf += 1;
        houseStats[student.house].dnf += 1;
      }
      if (official.status === 'absent') {
        absent += 1;
        houseStats[student.house].absent += 1;
      }
      if (official.status === 'medically_excused') {
        med += 1;
        houseStats[student.house].med += 1;
      }
    });

    const filteredEnrolledCount = enrolledIds.filter(id => {
      const s = studentMap.get(id);
      return s && matchesCategoryFilter(s.athleticsCategory, categoryFilter);
    }).length;

    const overallPodium = Array.from(podiumByCategory.values())
      .flat()
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        const valA = athleticsMarkToNumber(a.timing, isField);
        const valB = athleticsMarkToNumber(b.timing, isField);
        return isField ? valB - valA : valA - valB;
      })
      .slice(0, 3);

    ALL_ATHLETICS_CATEGORIES.forEach(category => {
      const list = (podiumByCategory.get(category) || [])
        .sort((a, b) => {
          if (a.position !== b.position) return a.position - b.position;
          const valA = athleticsMarkToNumber(a.timing, isField);
          const valB = athleticsMarkToNumber(b.timing, isField);
          return isField ? valB - valA : valA - valB;
        })
        .slice(0, 3);
      if (list.length === 0 && filteredEnrolledCount === 0) return;
      categoryPodiums.push({
        eventId: event.id,
        eventName: event.name,
        category,
        isField,
        top3: [list[0] || null, list[1] || null, list[2] || null]
      });
    });

    return {
      event,
      departments: [...eventDepartments(event.categories)],
      enrolled: filteredEnrolledCount,
      resulted,
      finished,
      dnf,
      absent,
      med,
      bestTiming,
      hasFinals,
      date: eventSettings[event.id]?.date,
      coordinator: eventSettings[event.id]?.coordinator,
      podium: [overallPodium[0] || null, overallPodium[1] || null, overallPodium[2] || null],
      houseStats
    };
  });

  return {
    eventStats,
    standings: HOUSES
      .map(house => ({ name: house, points: housePoints[house], color: HOUSE_COLORS[house.toLowerCase() as keyof typeof HOUSE_COLORS].hex }))
      .sort((a, b) => b.points - a.points),
    categoryStats,
    categoryPodiums: categoryPodiums.filter(entry => entry.top3.some(Boolean)),
    departmentStandings
  };
};
