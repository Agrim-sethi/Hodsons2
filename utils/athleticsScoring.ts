import { AthleticsEvent, AthleticsResult, AthleticsSnapshot, AthleticsStudent, AthleticsHouse, AthleticsDepartment, isRelayEvent, relayHousePoints, relayTiebreakPointsForStudent } from './athleticsStorage';

export const placementPoints = (position?: number) =>
  position === 1 ? 4 :
  position === 2 ? 3 :
  position === 3 ? 2 :
  position === 4 ? 1 : 0;

const resultStageOf = (result: AthleticsResult) => result.stage || 'qualifying';

const departmentForCategory = (category: string): AthleticsStudent['department'] =>
  category.startsWith('PDB') ? 'PDB' :
  category.startsWith('PDG') ? 'PDG' :
  category.startsWith('BD') ? 'BD' :
  'GD';

export const eventAllowedForStudent = (event: AthleticsEvent, student: AthleticsStudent) =>
  event.departments.includes(departmentForCategory(student.category));

export const eventPoints = (
  snapshot: AthleticsSnapshot,
  student: AthleticsStudent,
  event: AthleticsEvent,
) => {
  // Relay points are house/team points and never enter a student's displayed
  // individual event tally. They are used separately as a cross-house tiebreak.
  if (isRelayEvent(event)) return 0;
  if (!eventAllowedForStudent(event, student)) return 0;

  const qualifying = snapshot.results.find(result =>
    result.eventId === event.id &&
    result.category === student.category &&
    result.studentId === student.id &&
    resultStageOf(result) === 'qualifying'
  );

  const finalsConfig = snapshot.finals.find(finals =>
    finals.eventId === event.id &&
    finals.category === student.category
  );

  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const finals = finalsEnabled
    ? snapshot.results.find(result =>
        result.eventId === event.id &&
        result.category === student.category &&
        result.studentId === student.id &&
        resultStageOf(result) === 'finals'
      )
    : undefined;

  let points = qualifying && (qualifying.qualified || qualifying.status === 'finished') ? 1 : 0;

  if (qualifying?.newResultAwarded) {
    points += 3;
  }

  if (finalsEnabled) {
    if (finals?.status === 'finished') {
      points += placementPoints(finals.position);
    }
    if (finals?.newResultAwarded) {
      points += 3;
    }
  } else if (qualifying?.status === 'finished') {
    points += placementPoints(qualifying.position);
  }

  return points;
};

export const studentPointsAcrossEvents = (
  snapshot: AthleticsSnapshot,
  student: AthleticsStudent,
  events: AthleticsEvent[],
) => events.reduce((sum, event) => sum + eventPoints(snapshot, student, event), 0);

export const houseChampionshipPoints = (snapshot: AthleticsSnapshot, house: AthleticsHouse, department?: AthleticsDepartment) => {
  return relayHousePoints(snapshot, house, department);
};

export const individualRelayTiebreakPoints = (snapshot: AthleticsSnapshot, studentId: string) => {
  return relayTiebreakPointsForStudent(snapshot, studentId);
};

export const compareIndividualChampionshipRows = (
  snapshot: AthleticsSnapshot,
  a: { student: AthleticsStudent; points: number },
  b: { student: AthleticsStudent; points: number },
) => {
  if (a.points !== b.points) return b.points - a.points;

  // Relay tiebreaks are relevant only when a tied score spans different houses.
  // This comparison is pairwise; callers grouping by equal points should use
  // this only for groups that contain more than one house.
  if (a.student.house !== b.student.house) {
    const aRelay = individualRelayTiebreakPoints(snapshot, a.student.id);
    const bRelay = individualRelayTiebreakPoints(snapshot, b.student.id);
    if (aRelay !== bRelay) return bRelay - aRelay;
  }

  return a.student.name.localeCompare(b.student.name);
};

export const sortIndividualChampionshipRows = (
  snapshot: AthleticsSnapshot,
  rows: Array<{ student: AthleticsStudent; points: number }>,
) => {
  const grouped = new Map<number, Array<{ student: AthleticsStudent; points: number }>>();
  rows.forEach(row => {
    const list = grouped.get(row.points) || [];
    list.push(row);
    grouped.set(row.points, list);
  });

  return Array.from(grouped.keys())
    .sort((a, b) => b - a)
    .flatMap(points => {
      const group = grouped.get(points) || [];
      const multipleHouses = new Set(group.map(row => row.student.house)).size > 1;
      return [...group].sort((a, b) => {
        if (multipleHouses) {
          const aRelay = individualRelayTiebreakPoints(snapshot, a.student.id);
          const bRelay = individualRelayTiebreakPoints(snapshot, b.student.id);
          if (aRelay !== bRelay) return bRelay - aRelay;
        }
        return a.student.name.localeCompare(b.student.name);
      });
    });
};

export const topIndividualChampionshipRows = (
  snapshot: AthleticsSnapshot,
  rows: Array<{ student: AthleticsStudent; points: number }>,
) => {
  if (rows.length === 0) return [];

  const maxPoints = Math.max(...rows.map(row => row.points));
  const tied = rows.filter(row => row.points === maxPoints);
  const houses = new Set(tied.map(row => row.student.house));

  if (houses.size <= 1) return tied.sort((a, b) => a.student.name.localeCompare(b.student.name));

  const maxRelayTiebreak = Math.max(...tied.map(row => individualRelayTiebreakPoints(snapshot, row.student.id)));
  return tied
    .filter(row => individualRelayTiebreakPoints(snapshot, row.student.id) === maxRelayTiebreak)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
};

export const podiumPoints = (position: 1 | 2 | 3, newRecordAwarded = false) =>
  (position === 1 ? 5 : position === 2 ? 4 : 3) + (newRecordAwarded ? 3 : 0);
