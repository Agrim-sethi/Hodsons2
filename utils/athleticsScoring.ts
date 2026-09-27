import { AthleticsEvent, AthleticsResult, AthleticsSnapshot, AthleticsStudent, AthleticsHouse, AthleticsDepartment, AthleticsRelayTeam, isRelayEvent, relayHousePoints, relayTiebreakPointsForStudent, RELAY_HOUSES } from './athleticsStorage';

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

const parseTrackTiming = (timing = '') => {
  const parts = timing.trim().split(':').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return Number.POSITIVE_INFINITY;
  return parts[0] * 60 + parts[1] + parts[2] / 1000;
};

const parseFieldDistance = (distance = '') => {
  const value = Number(distance.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

const resultPerformance = (event: AthleticsEvent, result: AthleticsResult) =>
  event.kind === 'track' ? parseTrackTiming(result.timing || '') : parseFieldDistance(result.timing || '');

export type RankedAthleticsResult = {
  student: AthleticsStudent;
  result: AthleticsResult;
  computedPosition: number;
};

export const rankedEventResults = (
  snapshot: AthleticsSnapshot,
  event: AthleticsEvent,
  category: AthleticsStudent['category'],
  students: AthleticsStudent[],
  stage: 'qualifying' | 'finals',
): RankedAthleticsResult[] => {
  if (isRelayEvent(event)) return [];

  const studentMap = new Map(students.map(student => [student.id, student]));
  const source = stage === 'finals'
    ? snapshot.finals.find(finals => finals.eventId === event.id && finals.category === category)
    : snapshot.enrollments.find(enrollment => enrollment.eventId === event.id && enrollment.category === category);
  const ids = source?.studentIds || [];

  const ranked = ids
    .map(studentId => {
      const student = studentMap.get(studentId);
      const result = student
        ? snapshot.results.find(item =>
            item.eventId === event.id &&
            item.category === category &&
            item.studentId === studentId &&
            resultStageOf(item) === stage
          )
        : undefined;
      return { student, result };
    })
    .filter((item): item is { student: AthleticsStudent; result: AthleticsResult } =>
      Boolean(item.student && item.result && item.result.status === 'finished' && item.result.timing)
    );

  // Qualifying positions are awarded only to competitors who were explicitly
  // marked Qualified. Finals are already an explicitly allotted set.
  const eligible = stage === 'qualifying'
    ? ranked.filter(item => item.result.qualified === true)
    : ranked;

  // High Jump has a special tie-break implemented by the manager's ranking
  // pass. When those stored positions are complete, use them as the canonical
  // order. Otherwise fall back to height so the view never goes blank.
  if (
    event.id === 'high-jump' &&
    eligible.length > 0 &&
    eligible.every(item => Number.isInteger(item.result.position) && item.result.position! >= 1)
  ) {
    eligible.sort((a, b) => (a.result.position || Number.MAX_SAFE_INTEGER) - (b.result.position || Number.MAX_SAFE_INTEGER));
  } else {
    eligible.sort((a, b) => {
      const performanceA = resultPerformance(event, a.result);
      const performanceB = resultPerformance(event, b.result);
      const difference = event.kind === 'track'
        ? performanceA - performanceB
        : performanceB - performanceA;
      if (difference !== 0) return difference;
      return a.student.name.localeCompare(b.student.name);
    });
  }

  return eligible.map((item, index) => ({
    ...item,
    computedPosition: index + 1,
  }));
};

const parseRelayTiming = (timing = '') => parseTrackTiming(timing);

export const rankedRelayTeams = (
  snapshot: AthleticsSnapshot,
  eventId: string,
  category: AthleticsStudent['category'],
) => {
  return RELAY_HOUSES
    .map(house => snapshot.relayTeams.find(team =>
      team.eventId === eventId &&
      team.category === category &&
      team.house === house
    ))
    .filter((team): team is AthleticsRelayTeam =>
      Boolean(
        team &&
        team.status === 'finished' &&
        team.studentIds.length === 4 &&
        team.timing &&
        Number.isFinite(parseRelayTiming(team.timing))
      )
    )
    .sort((a, b) => parseRelayTiming(a.timing || '') - parseRelayTiming(b.timing || ''))
    .map((team, index) => ({
      ...team,
      computedPosition: index + 1,
    }));
};

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
      const finalPosition = rankedEventResults(
        snapshot,
        event,
        student.category,
        [student],
        'finals',
      ).find(row => row.student.id === student.id)?.computedPosition;

      // The one-student call above is intentionally not used for ordering.
      // Resolve the real final position from the full finalist set below.
      if (finalPosition) points += placementPoints(finalPosition);
    }
    if (finals?.newResultAwarded) {
      points += 3;
    }
  } else if (qualifying?.status === 'finished' && qualifying.qualified) {
    const qualifyingPosition = rankedEventResults(
      snapshot,
      event,
      student.category,
      [student],
      'qualifying',
    ).find(row => row.student.id === student.id)?.computedPosition;
    if (qualifyingPosition) points += placementPoints(qualifyingPosition);
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
