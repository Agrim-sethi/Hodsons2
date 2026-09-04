import { HOUSE_COLORS } from '../constants';
import {
  ATHLETICS_EVENTS,
  AthleticsCategory,
  ALL_ATHLETICS_CATEGORIES,
  AthleticsEnrollment,
  AthleticsEvent,
  AthleticsHouse,
  AthleticsResult,
  AthleticsStudent
} from './athleticsStorage';

export interface AthleticsPodiumAthlete {
  id: string;
  name: string;
  house: AthleticsHouse;
  className: string;
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
  enrolled: number;
  resulted: number;
  finished: number;
  dnf: number;
  absent: number;
  med: number;
  bestTiming?: string;
  podium: Array<AthleticsPodiumAthlete | null>;
  houseStats: Record<AthleticsHouse, AthleticsHouseStats>;
}

export interface AthleticsDerivedData {
  eventStats: AthleticsEventStats[];
  standings: Array<{ name: AthleticsHouse; points: number; color: string }>;
  categoryStats: Record<AthleticsCategory, { enrolled: number; finished: number; points: number }>;
}

const HOUSES: AthleticsHouse[] = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'];

const createHouseStats = (): Record<AthleticsHouse, AthleticsHouseStats> => ({
  Vindhya: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Himalaya: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Nilgiri: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Siwalik: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 }
});

export const athleticsValueToNumber = (value?: string, isField: boolean = false) => {
  if (!value) return isField ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  
  if (isField) {
    // For field events, value might be '5.45' or '5m 45cm'
    // Extract the first valid float number we can find
    const match = value.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : Number.NEGATIVE_INFINITY;
  }

  // Track events: mm:ss:ms
  const parts = value.split(':').map(segment => parseFloat(segment));
  if (parts.some(val => Number.isNaN(val))) return Number.POSITIVE_INFINITY;
  if (parts.length === 3) return (parts[0] * 60) + parts[1] + (parts[2] / 100);
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return parts[0];
};

const pointsForPosition = (position?: number) => {
  if (!position || position < 1 || position > 5) return 0;
  return 6 - position;
};

export const matchesCategoryFilter = (cat: AthleticsCategory, filter: string) => {
  if (!filter || filter === 'All') return true;
  return cat === filter;
};

export const buildAthleticsDerivedData = (
  enrollments: AthleticsEnrollment[],
  results: AthleticsResult[],
  students: AthleticsStudent[],
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

  const eventStats = ATHLETICS_EVENTS.map((event): AthleticsEventStats => {
    const isField = event.category === 'field';
    const houseStats = createHouseStats();
    const enrolledIds = enrollmentMap.get(event.id) || [];
    const podiumCandidates: AthleticsPodiumAthlete[] = [];
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

      const result = resultMap.get(`${event.id}:${studentId}`);
      houseStats[student.house].enrolled += 1;
      if (categoryStats[student.athleticsCategory]) {
        categoryStats[student.athleticsCategory].enrolled += 1;
      }

      if (!result || result.status === 'pending') return;
      resulted += 1;

      if (result.status === 'finished') {
        finished += 1;
        houseStats[student.house].finished += 1;
        if (categoryStats[student.athleticsCategory]) {
          categoryStats[student.athleticsCategory].finished += 1;
        }
        const points = pointsForPosition(result.position);
        houseStats[student.house].points += points;
        housePoints[student.house] += points;
        if (categoryStats[student.athleticsCategory]) {
          categoryStats[student.athleticsCategory].points += points;
        }
        podiumCandidates.push({
          id: student.id,
          name: student.name,
          house: student.house,
          className: student.className,
          timing: result.timing,
          position: result.position || 999
        });

        if (result.timing) {
          const currentVal = athleticsValueToNumber(result.timing, isField);
          const bestVal = athleticsValueToNumber(bestTiming, isField);
          if (bestTiming === undefined || (isField ? currentVal > bestVal : currentVal < bestVal)) {
            bestTiming = result.timing;
          }
        }
      }

      if (result.status === 'dnf') {
        dnf += 1;
        houseStats[student.house].dnf += 1;
      }

      if (result.status === 'absent') {
        absent += 1;
        houseStats[student.house].absent += 1;
      }

      if (result.status === 'medically_excused') {
        med += 1;
        houseStats[student.house].med += 1;
      }
    });

    const filteredEnrolledCount = enrolledIds.filter(id => {
      const s = studentMap.get(id);
      return s && matchesCategoryFilter(s.athleticsCategory, categoryFilter);
    }).length;

    const podium = podiumCandidates
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        const valA = athleticsValueToNumber(a.timing, isField);
        const valB = athleticsValueToNumber(b.timing, isField);
        return isField ? valB - valA : valA - valB;
      })
      .slice(0, 3);

    return {
      event,
      enrolled: filteredEnrolledCount,
      resulted,
      finished,
      dnf,
      absent,
      med,
      bestTiming,
      podium: [podium[0] || null, podium[1] || null, podium[2] || null],
      houseStats
    };
  });

  return {
    eventStats,
    standings: HOUSES
      .map(house => ({ name: house, points: housePoints[house], color: HOUSE_COLORS[house.toLowerCase() as keyof typeof HOUSE_COLORS].hex }))
      .sort((a, b) => b.points - a.points),
    categoryStats
  };
};
