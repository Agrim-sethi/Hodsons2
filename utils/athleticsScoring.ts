import { AthleticsEvent, AthleticsResult, AthleticsSnapshot, AthleticsStudent } from './athleticsStorage';

export const placementPoints = (position?: number) =>
  position === 1 ? 4 :
  position === 2 ? 3 :
  position === 3 ? 2 :
  position === 4 ? 1 : 0;

const resultStageOf = (result: AthleticsResult) => result.stage || 'qualifying';

const departmentForCategory = (category: string) =>
  category.startsWith('BD') ? 'BD' :
  category.startsWith('GD') ? 'GD' :
  'PD';

export const eventAllowedForStudent = (event: AthleticsEvent, student: AthleticsStudent) =>
  event.departments.includes(departmentForCategory(student.category) as AthleticsStudent['department']);

export const eventPoints = (
  snapshot: AthleticsSnapshot,
  student: AthleticsStudent,
  event: AthleticsEvent,
) => {
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

export const podiumPoints = (position: 1 | 2 | 3, newRecordAwarded = false) =>
  (position === 1 ? 5 : position === 2 ? 4 : 3) + (newRecordAwarded ? 3 : 0);
