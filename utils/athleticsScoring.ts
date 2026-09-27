import { AthleticsEvent, AthleticsResult, AthleticsSnapshot, AthleticsStudent, AthleticsHouse, AthleticsDepartment, isRelayEvent, relayHousePoints } from './athleticsStorage';

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

const positionsAreComplete = (positions: Array<number | undefined>) => {
  if (positions.length === 0 || positions.some(position => !Number.isInteger(position) || position! < 1)) return false;
  const sorted = positions.map(position => position as number).sort((a, b) => a - b);
  return sorted.every((position, index) => position === index + 1);
};

type RankedResultRow = {
  studentId: string;
  result: AthleticsResult;
  computedPosition: number;
};

const rankedResultRows = (
  snapshot: AthleticsSnapshot,
  event: AthleticsEvent,
  category: AthleticsStudent['category'],
  stage: 'qualifying' | 'finals',
): RankedResultRow[] => {
  if (isRelayEvent(event)) return [];

  const source = stage === 'finals'
    ? snapshot.finals.find(finals => finals.eventId === event.id && finals.category === category)
    : snapshot.enrollments.find(enrollment => enrollment.eventId === event.id && enrollment.category === category);
  const ids = source?.studentIds || [];

  const rows = ids
    .map(studentId => ({
      studentId,
      result: snapshot.results.find(item =>
        item.eventId === event.id &&
        item.category === category &&
        item.studentId === studentId &&
        resultStageOf(item) === stage
      ),
    }))
    .filter((item): item is { studentId: string; result: AthleticsResult } =>
      Boolean(item.result && item.result.status === 'finished' && item.result.timing)
    );

  // Qualifying positions are awarded only to competitors who were explicitly
  // marked Qualified. Finals are already an explicitly allotted set.
  const eligible = stage === 'qualifying'
    ? rows.filter(item => item.result.qualified === true)
    : rows;

  // A complete, valid set of stored positions is authoritative. This keeps
  // manually corrected/auto-ranked results identical across Manager, Summary,
  // View Events, and scoring. If positions are missing, duplicated, or contain
  // gaps, rebuild the order from the recorded performance.
  if (positionsAreComplete(eligible.map(item => item.result.position))) {
    eligible.sort((a, b) => (a.result.position || Number.MAX_SAFE_INTEGER) - (b.result.position || Number.MAX_SAFE_INTEGER));
  } else {
    eligible.sort((a, b) => {
      const performanceA = resultPerformance(event, a.result);
      const performanceB = resultPerformance(event, b.result);
      const difference = event.kind === 'track'
        ? performanceA - performanceB
        : performanceB - performanceA;
      if (difference !== 0) return difference;
      return a.studentId.localeCompare(b.studentId);
    });
  }

  return eligible.map((item, index) => ({
    ...item,
    computedPosition: index + 1,
  }));
};

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
  const studentMap = new Map(students.map(student => [student.id, student]));
  return rankedResultRows(snapshot, event, category, stage)
    .map(row => {
      const student = studentMap.get(row.studentId);
      return student ? { ...row, student } : null;
    })
    .filter((row): row is RankedAthleticsResult => Boolean(row));
};

export type EventPointBreakdown = { qualification: number; placement: number; newRecord: number; total: number };

export const eventPointBreakdown = (
  snapshot: AthleticsSnapshot,
  student: AthleticsStudent,
  event: AthleticsEvent,
  categoryOverride?: AthleticsStudent['category'],
): EventPointBreakdown => {
  const category = categoryOverride || student.category;
  // Relay points are house/team points only. They never enter an individual's
  // event or championship tally.
  if (isRelayEvent(event)) return { qualification: 0, placement: 0, newRecord: 0, total: 0 };
  if (!event.departments.includes(departmentForCategory(category))) return { qualification: 0, placement: 0, newRecord: 0, total: 0 };

  const qualifying = snapshot.results.find(result =>
    result.eventId === event.id &&
    result.category === category &&
    result.studentId === student.id &&
    resultStageOf(result) === 'qualifying'
  );

  const finalsConfig = snapshot.finals.find(finals =>
    finals.eventId === event.id &&
    finals.category === category
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

  // Qualification is a first-round achievement worth exactly +1. A finished
  // but unqualified result earns no participation point.
  const qualification = qualifying?.qualified === true ? 1 : 0;
  let placement = 0;

  if (finalsEnabled) {
    // Finals award only placement points. There is no additional +1 for
    // appearing in, finishing, or qualifying for the second round.
    if (finals?.status === 'finished') {
      const finalPosition = rankedResultRows(snapshot, event, category, 'finals')
        .find(row => row.studentId === student.id)?.computedPosition;
      if (finalPosition) placement += placementPoints(finalPosition);
    }
  } else if (qualifying?.status === 'finished' && qualifying?.qualified === true) {
    // Without finals, qualifying is the scored round.
    const qualifyingPosition = rankedResultRows(snapshot, event, category, 'qualifying')
      .find(row => row.studentId === student.id)?.computedPosition;
    if (qualifyingPosition) placement += placementPoints(qualifyingPosition);
  }

  // New Record is one bonus per athlete per event, not one bonus per stage.
  // Even if the same athlete records in both qualifying and finals, they get
  // only one +3 for this event.
  const hasNewRecord = Boolean(qualifying?.newResultAwarded || finals?.newResultAwarded);
  const newRecord = hasNewRecord ? 3 : 0;
  return { qualification, placement, newRecord, total: qualification + placement + newRecord };
};

export const eventPoints = (snapshot: AthleticsSnapshot, student: AthleticsStudent, event: AthleticsEvent) =>
  eventPointBreakdown(snapshot, student, event).total;

export const studentPointsAcrossEvents = (
  snapshot: AthleticsSnapshot,
  student: AthleticsStudent,
  events: AthleticsEvent[],
) => events.reduce((sum, event) => sum + eventPoints(snapshot, student, event), 0);

export const houseChampionshipPoints = (snapshot: AthleticsSnapshot, house: AthleticsHouse, department?: AthleticsDepartment) => {
  return relayHousePoints(snapshot, house, department);
};


// Equal individual championship scores are true ties, including across houses.
// Relay results do not break the tie.
export const compareIndividualChampionshipRows = (
  _snapshot: AthleticsSnapshot,
  a: { student: AthleticsStudent; points: number },
  b: { student: AthleticsStudent; points: number },
) => {
  if (a.points !== b.points) return b.points - a.points;
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
    .flatMap(points => [...(grouped.get(points) || [])]
      .sort((a, b) => a.student.name.localeCompare(b.student.name)));
};

export const topIndividualChampionshipRows = (
  _snapshot: AthleticsSnapshot,
  rows: Array<{ student: AthleticsStudent; points: number }>,
) => {
  if (rows.length === 0) return [];
  const maxPoints = Math.max(...rows.map(row => row.points));
  // Return every co-champion with the maximum score, regardless of house.
  return rows
    .filter(row => row.points === maxPoints)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
};

export const podiumPoints = (position: 1 | 2 | 3) =>
  position === 1 ? 5 : position === 2 ? 4 : 3;
