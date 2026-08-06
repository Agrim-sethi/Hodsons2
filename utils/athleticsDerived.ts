import { HOUSE_COLORS } from '../constants';
import {
  ATHLETICS_EVENTS,
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
  departmentStats: Record<'PDB' | 'PDG', { enrolled: number; finished: number; points: number }>;
}

const HOUSES: AthleticsHouse[] = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'];

const createHouseStats = (): Record<AthleticsHouse, AthleticsHouseStats> => ({
  Vindhya: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Himalaya: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Nilgiri: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 },
  Siwalik: { enrolled: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 }
});

export const athleticsTimingToSeconds = (timing?: string) => {
  if (!timing) return Number.POSITIVE_INFINITY;
  const parts = timing.split(':').map(segment => parseInt(segment, 10));
  if (parts.some(value => Number.isNaN(value))) return Number.POSITIVE_INFINITY;
  if (parts.length === 3) return (parts[0] * 60) + parts[1] + (parts[2] / 100);
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return parts[0];
};

const pointsForPosition = (position?: number) => {
  if (!position || position < 1 || position > 5) return 0;
  return 6 - position;
};

export const buildAthleticsDerivedData = (
  enrollments: AthleticsEnrollment[],
  results: AthleticsResult[],
  students: AthleticsStudent[]
): AthleticsDerivedData => {
  const studentMap = new Map(students.map(student => [student.id, student]));
  const enrollmentMap = new Map(enrollments.map(entry => [entry.eventId, entry.studentIds || []]));
  const resultMap = new Map(results.map(result => [`${result.eventId}:${result.studentId}`, result]));
  const housePoints: Record<AthleticsHouse, number> = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
  const departmentStats = {
    PDB: { enrolled: 0, finished: 0, points: 0 },
    PDG: { enrolled: 0, finished: 0, points: 0 }
  };

  const eventStats = ATHLETICS_EVENTS.map((event): AthleticsEventStats => {
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

      const result = resultMap.get(`${event.id}:${studentId}`);
      houseStats[student.house].enrolled += 1;
      departmentStats[student.department].enrolled += 1;

      if (!result || result.status === 'pending') return;
      resulted += 1;

      if (result.status === 'finished') {
        finished += 1;
        houseStats[student.house].finished += 1;
        departmentStats[student.department].finished += 1;
        const points = pointsForPosition(result.position);
        houseStats[student.house].points += points;
        housePoints[student.house] += points;
        departmentStats[student.department].points += points;
        podiumCandidates.push({
          id: student.id,
          name: student.name,
          house: student.house,
          className: student.className,
          timing: result.timing,
          position: result.position || 999
        });

        if (result.timing && athleticsTimingToSeconds(result.timing) < athleticsTimingToSeconds(bestTiming)) {
          bestTiming = result.timing;
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

    const podium = podiumCandidates
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return athleticsTimingToSeconds(a.timing) - athleticsTimingToSeconds(b.timing);
      })
      .slice(0, 3);

    return {
      event,
      enrolled: enrolledIds.length,
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
    departmentStats
  };
};
