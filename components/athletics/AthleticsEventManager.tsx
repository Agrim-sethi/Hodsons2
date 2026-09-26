import React from 'react';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { useToast } from '../ui/ToastProvider';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsHighJumpAttempt, AthleticsHighJumpAttemptResult, AthleticsResult, AthleticsResultStatus, AthleticsSnapshot, AthleticsStage, AthleticsRelayTeam, RELAY_HOUSES, relayEligibleCategories } from '../../utils/athleticsStorage';
import { AthleticsCategory } from '../../utils/athleticsCategories';

type AthleticsStudent = {
  id: string;
  name: string;
  house: string;
  category: AthleticsCategory;
  className: string;
};

type ModalTab = 'enrollment' | 'results';

type Props = {
  event: AthleticsEvent;
  category: AthleticsCategory;
  students: AthleticsStudent[];
  snapshot: AthleticsSnapshot;
  isLoggedIn: boolean;
  onSave: (snapshot: AthleticsSnapshot, title: string, description: string) => void;
  onClose: () => void;
};

const HOUSES = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'] as const;
const RESULT_STATUSES: AthleticsResultStatus[] = [
  'pending',
  'finished',
  'dnf',
  'absent',
  'medically_excused',
];

const TRACK_EVENTS = new Set([
  '100m',
  '200m',
  '400m',
  '800m',
  '1500m',
  '3000m',
  '110m-hurdles',
]);

// High Jump uses its own height-ladder rules (handled separately) rather than
// the standard 3-attempt best-distance model used by the other field events.
const THREE_ATTEMPT_FIELD_EVENTS = new Set([
  'long-jump',
  'shot-put',
  'discus-throw',
  'javelin-throw',
  'triple-jump',
]);

const houseConfig = (house: string) => {
  const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
  return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const resultStageOf = (result: AthleticsResult): AthleticsStage => {
  return result.stage || 'qualifying';
};

const statusLabel = (status: AthleticsResultStatus) => {
  return {
    pending: 'Pending',
    finished: 'Finished',
    dnf: 'DNF',
    absent: 'Absent',
    medically_excused: 'Medical Leave',
  }[status];
};

const statusStyle = (status: AthleticsResultStatus) => {
  return {
    finished: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dnf: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    absent: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    medically_excused: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    pending: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
  }[status];
};

const parseTrackTiming = (value: string) => {
  const parts = value.trim().split(':').map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return Number.POSITIVE_INFINITY;
  }

  return parts[0] * 60 + parts[1] + parts[2] / 1000;
};

const parseFieldDistance = (value: string) => {
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) ? number : Number.NEGATIVE_INFINITY;
};

const splitTrackTiming = (value?: string) => {
  const parts = (value || '').split(':');

  return {
    minutes: parts[0] || '0',
    seconds: parts[1] || '0',
    milliseconds: parts[2] || '0',
  };
};

const splitFieldDistance = (value?: string) => {
  const [metres, centimetres = ''] = (value || '').split('.');

  return {
    metres: metres || '',
    centimetres: centimetres.slice(0, 2),
  };
};

/** Picks the best (farthest) valid attempt among up to 3 recorded field-event attempts. */
const bestFieldAttempt = (attempts: (string | undefined)[]): string => {
  let best = '';
  let bestValue = Number.NEGATIVE_INFINITY;

  attempts.forEach((attempt) => {
    if (!attempt) {
      return;
    }

    const value = parseFieldDistance(attempt);

    if (value > bestValue) {
      bestValue = value;
      best = attempt;
    }
  });

  return best;
};

const clampNumber = (value: string, max: number) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.trunc(number)));
};

const AthleticsEventManager: React.FC<Props> = ({
  event,
  category,
  students,
  snapshot,
  isLoggedIn,
  onSave,
  onClose,
}) => {
  const { showToast } = useToast();
  const [tab, setTab] = React.useState<ModalTab>('enrollment');
  const [stage, setStage] = React.useState<AthleticsStage>('qualifying');
  const [search, setSearch] = React.useState('');
  const [houseFilter, setHouseFilter] = React.useState('All');
  const [savedStudent, setSavedStudent] = React.useState<string | null>(null);
  const [relayHouse, setRelayHouse] = React.useState<(typeof HOUSES)[number]>('Vindhya');

  const studentMap = React.useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const enrollment = React.useMemo(() => {
    return snapshot.enrollments.find((entry) => entry.eventId === event.id && entry.category === category)?.studentIds || [];
  }, [event.id, category, snapshot.enrollments]);

  const finalsConfig = React.useMemo(() => {
    return snapshot.finals.find((entry) => entry.eventId === event.id && entry.category === category);
  }, [event.id, category, snapshot.finals]);

  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const finalistIds = finalsConfig?.studentIds || [];
  const currentIds = stage === 'finals' ? finalistIds : enrollment;

  const isHighJump = event.id === 'high-jump';
  const isRelay = event.kind === 'relay';

  const highJumpConfig = React.useMemo(() => {
    return snapshot.highJump?.find((entry) => entry.category === category && entry.stage === stage);
  }, [snapshot.highJump, category, stage]);

  const highJumpHeights = highJumpConfig?.heights || [];
  const highJumpAttemptRows = highJumpConfig?.attempts || [];

  const filteredStudents = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    return students
      .filter((student) => {
        const matchesCategory = student.category === category;

        const matchesSearch =
          !query ||
          student.id.toLowerCase().includes(query) ||
          student.name.toLowerCase().includes(query) ||
          student.className.toLowerCase().includes(query);

        const matchesHouse = houseFilter === 'All' || student.house === houseFilter;

        return matchesCategory && matchesSearch && matchesHouse;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, category, search, houseFilter]);

  const getResult = (studentId: string, resultStage: AthleticsStage): AthleticsResult => {
    return (
      snapshot.results.find(
        (result) =>
          result.eventId === event.id &&
          result.category === category &&
          result.studentId === studentId &&
          resultStageOf(result) === resultStage,
      ) || {
        eventId: event.id,
        category,
        studentId,
        stage: resultStage,
        status: 'pending',
        timing: '',
        qualified: false,
      }
    );
  };

  const getRelayTeam = React.useCallback((house: (typeof HOUSES)[number]): AthleticsRelayTeam => {
    return snapshot.relayTeams.find(team => team.eventId === event.id && team.category === category && team.house === house) || {
      eventId: event.id,
      category,
      house,
      studentIds: [],
      status: 'pending',
      timing: '',
      position: undefined,
    };
  }, [snapshot.relayTeams, event.id, category]);

  const eligibleRelayCategoriesForCurrentEvent = React.useMemo(() => relayEligibleCategories(category), [category]);
  const saveSnapshot = (
    nextSnapshot: AthleticsSnapshot,
    title: string,
    description: string,
  ) => {
    onSave(nextSnapshot, title, description);
  };

  const canAddStudent = React.useCallback(
    (studentId: string) => {
      const enrolledElsewhere = snapshot.enrollments
        .filter((entry) => entry.studentIds.includes(studentId))
        .map((entry) => entry.eventId);

      if (enrolledElsewhere.includes(event.id)) {
        return {
          ok: true,
          reason: '',
        };
      }

      if (enrolledElsewhere.length >= 3) {
        return {
          ok: false,
          reason: 'A student can take no more than 3 athletics events.',
        };
      }

      const trackCount =
        enrolledElsewhere.filter((id) => TRACK_EVENTS.has(id)).length +
        (event.kind === 'track' ? 1 : 0);

      const fieldCount =
        enrolledElsewhere.filter((id) => !TRACK_EVENTS.has(id)).length +
        (event.kind === 'field' ? 1 : 0);

      return {
        ok: trackCount <= 2 && fieldCount <= 2,
        reason: 'Allowed combination: 2 track + 1 field or 2 field + 1 track.',
      };
    },
    [event.id, event.kind, snapshot.enrollments],
  );

  const toggleEnrollment = (studentId: string) => {
    if (!isLoggedIn) {
      return;
    }

    const current = enrollment;
    const enrolled = current.includes(studentId);

    if (!enrolled) {
      const check = canAddStudent(studentId);

      if (!check.ok) {
        showToast({
          title: 'Enrollment blocked',
          description: check.reason,
        });
        return;
      }
    }

    const enrollments = snapshot.enrollments.map((entry) => {
      if (entry.eventId !== event.id || entry.category !== category) {
        return entry;
      }

      return {
        ...entry,
        studentIds: enrolled
          ? entry.studentIds.filter((id) => id !== studentId)
          : [...entry.studentIds, studentId],
      };
    });

    const results = enrolled
      ? snapshot.results.filter(
          (result) =>
            !(result.eventId === event.id && result.category === category && result.studentId === studentId),
        )
      : snapshot.results;

    const finals = enrolled
      ? snapshot.finals.map((finalsEntry) => {
          if (finalsEntry.eventId !== event.id || finalsEntry.category !== category) {
            return finalsEntry;
          }

          return {
            ...finalsEntry,
            studentIds: finalsEntry.studentIds.filter((id) => id !== studentId),
          };
        })
      : snapshot.finals;

    saveSnapshot(
      {
        ...snapshot,
        enrollments,
        results,
        finals,
      },
      enrolled ? 'Student Removed' : 'Student Enrolled',
      enrolled
        ? 'Removed from this event.'
        : `${studentMap.get(studentId)?.name || 'Student'} moved to qualifying.`,
    );
  };

  const updateRelayTeam = (house: (typeof HOUSES)[number], patch: Partial<AthleticsRelayTeam>, title = 'Relay Team Updated', description = 'Relay team updated.') => {
    if (!isLoggedIn) return;
    const existing = getRelayTeam(house);
    const nextTeam: AthleticsRelayTeam = { ...existing, ...patch, studentIds: (patch.studentIds || existing.studentIds).slice(0, 4) };
    const hasEntry = snapshot.relayTeams.some(team => team.eventId === event.id && team.category === category && team.house === house);
    const relayTeams = hasEntry
      ? snapshot.relayTeams.map(team => team.eventId === event.id && team.category === category && team.house === house ? nextTeam : team)
      : [...snapshot.relayTeams, nextTeam];
    saveSnapshot({ ...snapshot, relayTeams }, title, description);
  };

  const toggleRelayStudent = (studentId: string) => {
    if (!isLoggedIn) return;
    const team = getRelayTeam(relayHouse);
    const enrolled = team.studentIds.includes(studentId);
    if (enrolled) {
      const nextIds = team.studentIds.filter(id => id !== studentId);
      updateRelayTeam(relayHouse, { studentIds: nextIds, status: 'pending', timing: '', position: undefined }, 'Runner Removed', `${studentMap.get(studentId)?.name || 'Student'} removed from the ${relayHouse} relay.`);
      return;
    }
    if (team.studentIds.length >= 4) {
      showToast({ title: 'Team Full', description: 'Each house can have exactly 4 relay runners.' });
      return;
    }
    const eligible = students.find(student => student.id === studentId && eligibleRelayCategoriesForCurrentEvent.includes(student.category) && student.house === relayHouse);
    if (!eligible) {
      showToast({ title: 'Runner Not Eligible', description: 'This student is not eligible for this house relay category.' });
      return;
    }
    const alreadyInAnotherHouse = snapshot.relayTeams.some(team => team.eventId === event.id && team.category === category && team.house !== relayHouse && team.studentIds.includes(studentId));
    if (alreadyInAnotherHouse) {
      showToast({ title: 'Runner Already Assigned', description: 'A runner cannot represent two houses in the same relay.' });
      return;
    }
    updateRelayTeam(relayHouse, { studentIds: [...team.studentIds, studentId], status: 'pending', timing: '', position: undefined }, 'Runner Added', `${eligible.name} added to the ${relayHouse} ${event.name} team.`);
  };

  const updateRelayTiming = (house: (typeof HOUSES)[number], key: 'minutes' | 'seconds' | 'milliseconds', value: string, max: number) => {
    const team = getRelayTeam(house);
    const current = splitTrackTiming(team.timing);
    const next = { ...current, [key]: String(clampNumber(value, max)) };
    const timing = [clampNumber(next.minutes, 999), clampNumber(next.seconds, 59), clampNumber(next.milliseconds, 999)].join(':');
    updateRelayTeam(house, { timing }, 'Relay Time Saved', `${house} ${event.name} time updated.`);
  };

  const updateRelayStatus = (house: (typeof HOUSES)[number], status: 'pending' | 'finished' | 'dnf') => {
    const team = getRelayTeam(house);
    if ((status === 'finished' || status === 'dnf') && team.studentIds.length !== 4) {
      showToast({ title: 'Relay Team Incomplete', description: 'A relay team needs exactly 4 runners before a result can be recorded.' });
      return;
    }
    if (status === 'finished' && (!team.timing || !Number.isFinite(parseTrackTiming(team.timing)))) {
      showToast({ title: 'Relay Time Missing', description: 'A finished relay needs a valid race time.' });
      return;
    }
    updateRelayTeam(
      house,
      { status, timing: status === 'dnf' ? '' : team.timing, position: status === 'pending' || status === 'dnf' ? undefined : team.position },
      'Relay Status Saved',
      `${house} ${event.name} is ${status === 'dnf' ? 'DNF' : status}.`,
    );
  };

  const autoRankRelay = () => {
    if (!isLoggedIn) return;
    const ranked = RELAY_HOUSES
      .map(house => getRelayTeam(house))
      .filter(team => team.studentIds.length === 4 && team.status === 'finished' && team.timing && Number.isFinite(parseTrackTiming(team.timing)))
      .sort((a, b) => parseTrackTiming(a.timing || '') - parseTrackTiming(b.timing || ''));
    const positions = new Map(ranked.map((team, index) => [team.house, index + 1]));
    const relayTeams = snapshot.relayTeams.map(team => team.eventId === event.id && team.category === category ? { ...team, position: positions.get(team.house) } : team);
    saveSnapshot({ ...snapshot, relayTeams }, 'Relay Positions Calculated', `${ranked.length} house relay teams ranked.`);
  };
  const updateResult = (
    studentId: string,
    resultStage: AthleticsStage,
    patch: Partial<AthleticsResult>,
  ) => {
    if (!isLoggedIn) {
      return;
    }

    const existing = snapshot.results.find(
      (result) =>
        result.eventId === event.id &&
        result.category === category &&
        result.studentId === studentId &&
        resultStageOf(result) === resultStage,
    );

    const nextResult: AthleticsResult = {
      eventId: event.id,
      category,
      studentId,
      stage: resultStage,
      status: existing?.status || 'pending',
      timing: existing?.timing || '',
      attempts: existing?.attempts,
      position: existing?.position,
      qualified: existing?.qualified || false,
      ...patch,
    };

    const results = existing
      ? snapshot.results.map((result) => {
          if (
            result.eventId !== event.id ||
            result.category !== category ||
            result.studentId !== studentId ||
            resultStageOf(result) !== resultStage
          ) {
            return result;
          }

          return nextResult;
        })
      : [...snapshot.results, nextResult];

    saveSnapshot(
      {
        ...snapshot,
        results,
      },
      'Result Saved',
      `${event.name} ${resultStage} result updated.`,
    );

    setSavedStudent(`${resultStage}:${studentId}`);
    window.setTimeout(() => setSavedStudent(null), 900);
  };

  const updateTrackPart = (
    studentId: string,
    resultStage: AthleticsStage,
    key: 'minutes' | 'seconds' | 'milliseconds',
    value: string,
    max: number,
  ) => {
    const current = splitTrackTiming(getResult(studentId, resultStage).timing);
    const next = {
      ...current,
      [key]: String(clampNumber(value, max)),
    };

    updateResult(studentId, resultStage, {
      timing: [
        clampNumber(next.minutes, 999),
        clampNumber(next.seconds, 59),
        clampNumber(next.milliseconds, 999),
      ].join(':'),
    });
  };

  const updateFieldPart = (
    studentId: string,
    resultStage: AthleticsStage,
    key: 'metres' | 'centimetres',
    value: string,
  ) => {
    const current = splitFieldDistance(getResult(studentId, resultStage).timing);
    const nextValue = value.replace(/\D/g, '').slice(0, key === 'metres' ? 3 : 2);
    const next = {
      ...current,
      [key]: nextValue,
    };

    updateResult(studentId, resultStage, {
      timing:
        next.metres === '' && next.centimetres === ''
          ? ''
          : `${next.metres || '0'}.${(next.centimetres || '0').padStart(2, '0')}`,
    });
  };

  /**
   * Updates one of a student's 3 recorded attempts for a 3-attempt field
   * event, then recomputes `timing` as the best (farthest) valid attempt so
   * every existing consumer (auto-rank, leaderboards, summaries) keeps
   * reading a single best-attempt value without any changes on their end.
   */
  const updateFieldAttempt = (
    studentId: string,
    resultStage: AthleticsStage,
    attemptIndex: number,
    key: 'metres' | 'centimetres',
    value: string,
  ) => {
    const existing = getResult(studentId, resultStage);
    // Preserve every attempt already recorded (there may be more than the
    // default 3), padding out to at least attemptIndex + 1 slots so editing
    // a newly-added attempt never truncates the ones after it.
    const slotCount = Math.max(3, existing.attempts?.length || 0, attemptIndex + 1);
    const attempts = Array.from({ length: slotCount }, (_, index) => existing.attempts?.[index] || '');

    const current = splitFieldDistance(attempts[attemptIndex]);
    const nextValue = value.replace(/\D/g, '').slice(0, key === 'metres' ? 3 : 2);
    const nextPart = {
      ...current,
      [key]: nextValue,
    };

    attempts[attemptIndex] =
      nextPart.metres === '' && nextPart.centimetres === ''
        ? ''
        : `${nextPart.metres || '0'}.${(nextPart.centimetres || '0').padStart(2, '0')}`;

    updateResult(studentId, resultStage, {
      attempts,
      timing: bestFieldAttempt(attempts),
    });
  };

  const addFieldAttempt = (studentId: string, resultStage: AthleticsStage) => {
    if (!isLoggedIn) {
      return;
    }

    const existing = getResult(studentId, resultStage);
    const slotCount = Math.max(3, existing.attempts?.length || 0);
    const attempts = Array.from({ length: slotCount }, (_, index) => existing.attempts?.[index] || '');

    attempts.push('');

    updateResult(studentId, resultStage, {
      attempts,
      timing: bestFieldAttempt(attempts),
    });
  };

  /**
   * Removes one attempt slot for a competitor — only ever the 4th attempt or
   * later (the default 3 are always present, matching every other
   * competitor's row, so they're never individually removable). Used to
   * undo an extra attempt added by mistake.
   */
  const removeFieldAttempt = (studentId: string, resultStage: AthleticsStage, attemptIndex: number) => {
    if (!isLoggedIn || attemptIndex < 3) {
      return;
    }

    const existing = getResult(studentId, resultStage);
    const slotCount = Math.max(3, existing.attempts?.length || 0);
    const attempts = Array.from({ length: slotCount }, (_, index) => existing.attempts?.[index] || '');

    attempts.splice(attemptIndex, 1);

    updateResult(studentId, resultStage, {
      attempts,
      timing: bestFieldAttempt(attempts),
    });
  };

  const saveHighJumpConfig = (
    nextHeights: string[],
    nextAttempts: AthleticsHighJumpAttempt[],
    title: string,
    description: string,
  ) => {
    const highJump = (snapshot.highJump || []).map((entry) => {
      if (entry.category !== category || entry.stage !== stage) {
        return entry;
      }

      return {
        ...entry,
        heights: nextHeights,
        attempts: nextAttempts,
      };
    });

    saveSnapshot({ ...snapshot, highJump }, title, description);
  };

  const addHighJumpHeight = (height: string) => {
    if (!isLoggedIn) {
      return;
    }

    const trimmed = height.trim();

    if (!trimmed || highJumpHeights.includes(trimmed)) {
      showToast({
        title: 'Cannot add height',
        description: trimmed ? 'That height layer already exists.' : 'Enter a height first.',
      });
      return;
    }

    // Keep the ladder sorted lowest to highest, regardless of the order layers were typed in.
    const nextHeights = [...highJumpHeights, trimmed].sort(
      (a, b) => parseFieldDistance(a) - parseFieldDistance(b),
    );

    saveHighJumpConfig(nextHeights, highJumpAttemptRows, 'Height Added', `${trimmed}m added to the high jump bar.`);
  };

  const removeHighJumpHeight = (height: string) => {
    if (!isLoggedIn) {
      return;
    }

    const nextHeights = highJumpHeights.filter((h) => h !== height);
    const nextAttempts = highJumpAttemptRows.filter((row) => row.height !== height);

    saveHighJumpConfig(nextHeights, nextAttempts, 'Height Removed', `${height}m removed from the bar.`);
  };

  const setHighJumpAttempt = (
    studentId: string,
    height: string,
    attemptIndex: 0 | 1 | 2,
    result: AthleticsHighJumpAttemptResult,
  ) => {
    if (!isLoggedIn) {
      return;
    }

    const existingRow = highJumpAttemptRows.find((row) => row.studentId === studentId && row.height === height);
    const attempts: AthleticsHighJumpAttemptResult[] = [
      existingRow?.attempts?.[0] || 'pending',
      existingRow?.attempts?.[1] || 'pending',
      existingRow?.attempts?.[2] || 'pending',
    ];

    // Toggle: clicking the same mark again clears it back to pending.
    attempts[attemptIndex] = attempts[attemptIndex] === result ? 'pending' : result;

    const nextRow: AthleticsHighJumpAttempt = { studentId, height, attempts };
    const nextAttempts = existingRow
      ? highJumpAttemptRows.map((row) => (row.studentId === studentId && row.height === height ? nextRow : row))
      : [...highJumpAttemptRows, nextRow];

    saveHighJumpConfig(highJumpHeights, nextAttempts, 'Attempt Recorded', `${studentMap.get(studentId)?.name || 'Student'} — ${height}m.`);
  };

  /**
   * Standard high jump ranking: highest height cleared wins; ties are broken
   * by fewer failures at that cleared height, then fewer total failures
   * across the whole competition. Writes into the normal AthleticsResult
   * rows (position + timing = best height cleared) so every existing
   * consumer — Auto-Rank display, leaderboards, summaries — keeps working
   * exactly as it does for every other event, with no changes on their end.
   */
  const computeHighJumpRanking = () => {
    if (!isLoggedIn) {
      return;
    }

    const heightsAscending = [...highJumpHeights].sort(
      (a, b) => parseFieldDistance(a) - parseFieldDistance(b),
    );

    const summaries = currentIds
      .map((studentId) => {
        const rows = highJumpAttemptRows.filter((row) => row.studentId === studentId);

        let bestHeight = '';
        let bestHeightValue = Number.NEGATIVE_INFINITY;
        let failuresAtBest = 0;
        let totalFailures = 0;

        heightsAscending.forEach((height) => {
          const row = rows.find((r) => r.height === height);
          const attempts = row?.attempts || [];
          const failures = attempts.filter((a) => a === 'failed').length;
          const cleared = attempts.includes('cleared');

          totalFailures += failures;

          if (cleared) {
            const value = parseFieldDistance(height);
            if (value > bestHeightValue) {
              bestHeightValue = value;
              bestHeight = height;
              failuresAtBest = failures;
            }
          }
        });

        return { studentId, bestHeight, bestHeightValue, failuresAtBest, totalFailures };
      })
      .filter((summary) => summary.bestHeight);

    summaries.sort((a, b) => {
      if (a.bestHeightValue !== b.bestHeightValue) {
        return b.bestHeightValue - a.bestHeightValue;
      }
      if (a.failuresAtBest !== b.failuresAtBest) {
        return a.failuresAtBest - b.failuresAtBest;
      }
      return a.totalFailures - b.totalFailures;
    });

    const rankMap = new Map(summaries.map((summary, index) => [summary.studentId, index + 1]));
    const heightMap = new Map(summaries.map((summary) => [summary.studentId, summary.bestHeight]));

    const resultsForOtherStudents = snapshot.results.filter(
      (result) => !(result.eventId === event.id && result.category === category && resultStageOf(result) === stage),
    );

    const resultsForCurrentIds = currentIds.map((studentId) => {
      const existing = getResult(studentId, stage);
      const cleared = heightMap.get(studentId);

      return {
        ...existing,
        status: cleared ? ('finished' as AthleticsResultStatus) : existing.status,
        timing: cleared || existing.timing,
        position: rankMap.get(studentId),
      };
    });

    saveSnapshot(
      {
        ...snapshot,
        results: [...resultsForOtherStudents, ...resultsForCurrentIds],
      },
      'Positions Calculated',
      `${summaries.length} ${stage} high jumpers ranked by best height cleared.`,
    );
  };

  const [newHeightInput, setNewHeightInput] = React.useState('');

  const toggleFinals = () => {
    if (!isLoggedIn) {
      return;
    }

    const enabled = !finalsEnabled;

    saveSnapshot(
      {
        ...snapshot,
        finals: snapshot.finals.map((entry) => {
          if (entry.eventId !== event.id || entry.category !== category) {
            return entry;
          }

          return {
            ...entry,
            enabled,
            studentIds: enabled ? entry.studentIds : [],
          };
        }),
      },
      enabled ? 'Finals Allotted' : 'Finals Removed',
      enabled ? 'Separate finals stage enabled.' : 'Finals disabled.',
    );

    if (!enabled) {
      setStage('qualifying');
    }
  };

  const toggleQualified = (studentId: string) => {
    if (!isLoggedIn || stage !== 'qualifying') {
      return;
    }

    const existing = getResult(studentId, 'qualifying');

    updateResult(studentId, 'qualifying', {
      qualified: !existing.qualified,
    });
  };

  const toggleFinalist = (studentId: string) => {
    if (!isLoggedIn || !finalsEnabled || stage !== 'qualifying') {
      return;
    }

    const exists = finalistIds.includes(studentId);

    saveSnapshot(
      {
        ...snapshot,
        finals: snapshot.finals.map((entry) => {
          if (entry.eventId !== event.id || entry.category !== category) {
            return entry;
          }

          return {
            ...entry,
            studentIds: exists
              ? entry.studentIds.filter((id) => id !== studentId)
              : [...entry.studentIds, studentId],
          };
        }),
      },
      exists ? 'Removed From Finals' : 'Added to Finals',
      `${studentMap.get(studentId)?.name || 'Student'} ${exists ? 'removed from' : 'added to'} finals.`,
    );
  };

  const autoPickFinalists = () => {
    if (!isLoggedIn || !finalsEnabled) {
      return;
    }

    const candidates = enrollment
      .map((studentId) => getResult(studentId, 'qualifying'))
      .filter(
        (result) =>
          result.qualified &&
          result.status === 'finished' &&
          Boolean(result.timing),
      );

    candidates.sort((a, b) => {
      if (event.kind === 'track') {
        return parseTrackTiming(a.timing || '') - parseTrackTiming(b.timing || '');
      }

      return parseFieldDistance(b.timing || '') - parseFieldDistance(a.timing || '');
    });

    saveSnapshot(
      {
        ...snapshot,
        finals: snapshot.finals.map((entry) => {
          if (entry.eventId !== event.id || entry.category !== category) {
            return entry;
          }

          return {
            ...entry,
            studentIds: candidates.slice(0, 4).map((result) => result.studentId),
          };
        }),
      },
      'Finalists Selected',
      `${Math.min(4, candidates.length)} qualified competitors selected for finals.`,
    );
  };

  const autoRank = () => {
    if (!isLoggedIn) {
      return;
    }

    const ranked = currentIds
      .map((studentId) => getResult(studentId, stage))
      .filter(
        (result) =>
          result.status === 'finished' &&
          Boolean(result.timing) &&
          (stage === 'finals' || result.qualified),
      );

    ranked.sort((a, b) => {
      if (event.kind === 'track') {
        return parseTrackTiming(a.timing || '') - parseTrackTiming(b.timing || '');
      }

      return parseFieldDistance(b.timing || '') - parseFieldDistance(a.timing || '');
    });

    const rankMap = new Map(
      ranked.map((result, index) => [result.studentId, index + 1]),
    );

    saveSnapshot(
      {
        ...snapshot,
        results: snapshot.results.map((result) => {
          if (
            result.eventId !== event.id ||
            result.category !== category ||
            resultStageOf(result) !== stage ||
            !rankMap.has(result.studentId)
          ) {
            return result;
          }

          return {
            ...result,
            position: rankMap.get(result.studentId),
          };
        }),
      },
      'Positions Calculated',
      `${ranked.length} ${stage} competitors ranked.`,
    );
  };

  React.useEffect(() => {
    setSearch('');
    setHouseFilter('All');
    setStage('qualifying');
    setRelayHouse('Vindhya');
    setTab('enrollment');
  }, [event.id, category]);

  const renderRelay = () => {
    const selectedTeam = getRelayTeam(relayHouse);
    const eligibleStudents = students.filter(student => student.house === relayHouse && eligibleRelayCategoriesForCurrentEvent.includes(student.category)).sort((a, b) => a.name.localeCompare(b.name));
    const selectedSet = new Set(selectedTeam.studentIds);

    if (tab === 'enrollment') {
      return (
        <div className="space-y-5">
          <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4 text-sm text-slate-300">
            <div className="font-black text-white">House Relay • One Race Only</div>
            <div className="mt-1 text-xs leading-relaxed text-slate-400">Select exactly 4 runners for each house. Runners may come from {eligibleRelayCategoriesForCurrentEvent.join(' + ')} but must all belong to the selected house and department.</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RELAY_HOUSES.map(house => {
              const team = getRelayTeam(house);
              const config = houseConfig(house);
              return <button key={house} type="button" onClick={() => setRelayHouse(house)} className={`rounded-xl border px-3 py-3 text-left transition-colors ${relayHouse === house ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-white/[0.02] hover:border-primary/30'}`}>
                <div className={`text-xs font-black uppercase ${config.text}`}>{house}</div>
                <div className="mt-1 text-lg font-black text-white">{team.studentIds.length}/4</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{team.status === 'finished' ? 'Result set' : 'Team setup'}</div>
              </button>;
            })}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="royal-kicker mb-1">{relayHouse} Team</div><h3 className="text-lg font-black text-white">Choose 4 runners</h3></div>
              <div className="text-xs font-black uppercase tracking-wider text-primary">{selectedTeam.studentIds.length}/4 selected</div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map(slot => {
                const runnerId = selectedTeam.studentIds[slot];
                const runner = runnerId ? studentMap.get(runnerId) : undefined;
                return <div key={slot} className="rounded-lg border border-white/5 bg-black/10 px-3 py-2.5"><div className="text-[9px] font-black uppercase tracking-wider text-slate-600">Runner {slot + 1}</div><div className="mt-1 text-xs font-bold text-white">{runner?.name || 'Open slot'}</div>{runner && <div className="mt-0.5 text-[9px] text-slate-500">#{runner.id} • {runner.category}</div>}</div>;
              })}
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-white">Eligible {relayHouse} runners</h3><p className="mt-1 text-[10px] text-slate-500">{eligibleRelayCategoriesForCurrentEvent.join(' • ')}</p></div><span className="text-[10px] font-bold text-slate-500">{eligibleStudents.length} eligible</span></div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {eligibleStudents.map(student => {
                const enrolled = selectedSet.has(student.id);
                const otherHouse = snapshot.relayTeams.some(team => team.eventId === event.id && team.category === category && team.house !== relayHouse && team.studentIds.includes(student.id));
                const disabled = !isLoggedIn || (!enrolled && (selectedTeam.studentIds.length >= 4 || otherHouse));
                return <button key={student.id} type="button" disabled={disabled} onClick={() => toggleRelayStudent(student.id)} className={`rounded-xl border p-3 text-left transition-colors ${enrolled ? 'border-emerald-500/35 bg-emerald-500/[0.045]' : 'border-white/10 bg-white/[0.02] hover:border-primary/30'} disabled:cursor-not-allowed disabled:opacity-50`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-black text-white">{student.name}</div><div className="mt-1 text-[9px] text-slate-500">#{student.id} • {student.category}</div></div><span className={`shrink-0 text-[9px] font-black uppercase ${enrolled ? 'text-emerald-300' : otherHouse ? 'text-rose-300' : 'text-slate-500'}`}>{enrolled ? '✓ Runner' : otherHouse ? 'Other House' : 'Select'}</span></div></button>;
              })}
              {eligibleStudents.length === 0 && <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">No eligible runners from {relayHouse} are available.</div>}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="royal-kicker mb-1">One-Round Race</div><h3 className="text-xl font-black text-white">{event.name} Results</h3><p className="mt-1 text-xs text-slate-500">One race across the four houses. Relay points: 8 • 6 • 4 • 2.</p></div><button type="button" disabled={!isLoggedIn} onClick={autoRankRelay} className="royal-primary-btn rounded-xl px-4 py-2 text-xs font-black uppercase disabled:opacity-50">Auto-Rank</button></div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {RELAY_HOUSES.map(house => {
            const team = getRelayTeam(house);
            const config = houseConfig(house);
            const canFinish = team.studentIds.length === 4 && Boolean(team.timing) && Number.isFinite(parseTrackTiming(team.timing));
            const track = splitTrackTiming(team.timing);
            return <div key={house} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3"><div><div className={`text-xs font-black uppercase ${config.text}`}>{house}</div><div className="mt-1 text-[10px] text-slate-500">{team.studentIds.length}/4 runners</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${team.status === 'finished' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : team.status === 'dnf' ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}>{team.status === 'finished' ? 'Finished' : team.status === 'dnf' ? 'DNF' : 'Pending'}</span></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{team.studentIds.map(id => <span key={id} className="rounded-md border border-white/10 bg-black/10 px-2 py-1 text-[9px] font-bold text-slate-300">{studentMap.get(id)?.name || id}</span>)}{team.studentIds.length === 0 && <span className="text-[10px] text-slate-600">No runners selected</span>}</div>
              <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
                <div><div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Race Time</div><div className="flex items-center gap-1.5"><input disabled={!isLoggedIn} type="number" min="0" value={track.minutes} onChange={e => updateRelayTiming(house,'minutes',e.target.value,999)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" /><span>:</span><input disabled={!isLoggedIn} type="number" min="0" max="59" value={track.seconds} onChange={e => updateRelayTiming(house,'seconds',e.target.value,59)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" /><span>:</span><input disabled={!isLoggedIn} type="number" min="0" max="999" value={track.milliseconds} onChange={e => updateRelayTiming(house,'milliseconds',e.target.value,999)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" /></div></div>
                <div><div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Place</div><input disabled={!isLoggedIn} type="number" min="1" max="4" value={team.position || ''} onChange={e => updateRelayTeam(house,{position:e.target.value ? Math.min(4,Math.max(1,Number(e.target.value))) : undefined},'Relay Position Saved',`${house} position updated.`)} className="royal-input w-20 rounded-lg px-2 py-2 text-center text-xs" placeholder="#" /></div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[9px] text-slate-500">{team.studentIds.length === 4 ? 'Team complete' : 'Exactly 4 runners required'}</span><select disabled={!isLoggedIn} value={team.status} onChange={e => updateRelayStatus(house,e.target.value as 'pending'|'finished'|'dnf')} className="royal-input rounded-lg px-2 py-2 text-[10px] font-black uppercase disabled:opacity-50"><option value="pending">Pending</option><option value="finished" disabled={!canFinish}>Finished</option><option value="dnf" disabled={team.studentIds.length !== 4}>DNF</option></select></div>
            </div>;
          })}
        </div>
      </div>
    );
  };
  const renderEnrollment = () => {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4 text-sm text-slate-300">
          Enroll students here. Once enrolled, they automatically move into the
          qualifying stage for this event.
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="relative lg:col-span-2">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size="18"
            />
            <input
              value={search}
              onChange={(eventObject) => setSearch(eventObject.target.value)}
              placeholder="Search student, number, class..."
              className="royal-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
            />
          </div>

          <select
            value={houseFilter}
            onChange={(eventObject) => setHouseFilter(eventObject.target.value)}
            className="royal-input rounded-xl px-3 py-3 text-sm"
          >
            <option>All</option>
            {HOUSES.map((house) => (
              <option key={house}>{house}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((student) => {
            const enrolled = enrollment.includes(student.id);
            const limit = canAddStudent(student.id);
            const config = houseConfig(student.house);

            return (
              <button
                key={student.id}
                type="button"
                disabled={!isLoggedIn || (!enrolled && !limit.ok)}
                onClick={() => toggleEnrollment(student.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  enrolled
                    ? 'border-emerald-500/35 bg-emerald-500/[0.045]'
                    : limit.ok
                      ? 'border-white/10 bg-white/[0.02] hover:border-primary/30'
                      : 'border-rose-500/20 bg-rose-500/[0.03] opacity-60'
                } disabled:cursor-not-allowed`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-black text-white">
                      {student.name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      #{student.id} • Class {student.className}
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${config.bg}/20 ${config.text} ${config.border}/30`}
                  >
                    {student.house}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                  <span
                    className={`text-[10px] font-black uppercase ${
                      enrolled ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {enrolled ? '✓ Enrolled • Qualifying' : 'Not enrolled'}
                  </span>

                  <span className="text-[10px] text-slate-500">
                    {snapshot.enrollments.filter((entry) =>
                      entry.studentIds.includes(student.id),
                    ).length}
                    /3 events
                  </span>
                </div>

                {!enrolled && !limit.ok && (
                  <div className="mt-2 text-[9px] text-rose-300">
                    {limit.reason}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-1">
            <button
              type="button"
              onClick={() => setStage('qualifying')}
              className={`rounded-lg px-4 py-2 text-xs font-black uppercase ${
                stage === 'qualifying'
                  ? 'bg-primary/15 text-primary'
                  : 'text-slate-400'
              }`}
            >
              Qualifying
              <span className="ml-1 opacity-70">{enrollment.length}</span>
            </button>

            {finalsEnabled && (
              <button
                type="button"
                onClick={() => setStage('finals')}
                className={`rounded-lg px-4 py-2 text-xs font-black uppercase ${
                  stage === 'finals'
                    ? 'bg-primary/15 text-primary'
                    : 'text-slate-400'
                }`}
              >
                Finals
                <span className="ml-1 opacity-70">{finalistIds.length}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!isLoggedIn}
              onClick={toggleFinals}
              className={`rounded-xl border px-3 py-2 text-xs font-black uppercase disabled:opacity-50 ${
                finalsEnabled
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/10 bg-white/[0.03] text-slate-300'
              }`}
            >
              {finalsEnabled ? 'Finals Allotted' : 'Allot Finals'}
            </button>

            {stage === 'qualifying' && finalsEnabled && (
              <button
                type="button"
                disabled={!isLoggedIn}
                onClick={autoPickFinalists}
                className="royal-secondary-btn rounded-xl px-3 py-2 text-xs font-black uppercase"
              >
                Allot Top 4
              </button>
            )}
          </div>
        </div>

        {enrollment.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center">
            <Icon
              name="group_add"
              className="mx-auto mb-3 text-3xl text-slate-600"
            />
            <div className="font-black text-slate-400">
              No students enrolled yet
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Open the Enrollment tab to add competitors.
            </div>
          </div>
        ) : stage === 'finals' && finalistIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-slate-500">
            No finalists have been allotted yet.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
              {stage === 'qualifying'
                ? finalsEnabled
                  ? 'Qualifying is separate from finals. Mark Qualified first, then use Allot Top 4 to place the fastest four qualified competitors into finals.'
                  : 'This event has no finals, so qualifying positions count for placement points.'
                : 'Only explicitly allotted finalists appear here.'}
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-black text-white">
                  {stage === 'qualifying' && !finalsEnabled ? 'Finals Results' : stage === 'qualifying' ? 'Qualifying Results' : 'Finals Results'}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {isHighJump
                    ? 'Add a height layer, then mark each attempt as clear or fail. A competitor who clears a height can skip its remaining attempts.'
                    : event.kind === 'track'
                      ? 'Enter minutes, seconds and milliseconds separately.'
                      : THREE_ATTEMPT_FIELD_EVENTS.has(event.id)
                        ? 'Record the standard 3 attempts per competitor. Use + Add Attempt for further attempts when permitted; the best valid attempt is used for ranking.'
                        : 'Enter metres and centimetres separately.'}
                </p>
              </div>

              <button
                type="button"
                disabled={!isLoggedIn}
                onClick={isHighJump ? computeHighJumpRanking : autoRank}
                className="royal-primary-btn rounded-xl px-4 py-2 text-xs font-black uppercase disabled:opacity-50"
              >
                Auto-Rank
              </button>
            </div>

            {isHighJump && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">Bar Heights</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          disabled={!isLoggedIn}
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 1.35"
                          value={newHeightInput}
                          onChange={(eventObject) => setNewHeightInput(eventObject.target.value.replace(/[^0-9.]/g, ''))}
                          onKeyDown={(eventObject) => {
                            if (eventObject.key === 'Enter') {
                              addHighJumpHeight(newHeightInput);
                              setNewHeightInput('');
                            }
                          }}
                          className="royal-input w-28 rounded-lg px-2 py-2 text-center font-mono text-sm"
                        />
                        <span className="text-xs text-slate-500">m</span>
                      </div>
                      <button
                        type="button"
                        disabled={!isLoggedIn}
                        onClick={() => {
                          addHighJumpHeight(newHeightInput);
                          setNewHeightInput('');
                        }}
                        className="royal-secondary-btn rounded-lg px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
                      >
                        Add Layer
                      </button>
                    </div>
                  </div>

                  {highJumpHeights.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center text-xs text-slate-500">
                      No height layers added yet — add the opening height to begin.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {highJumpHeights.map((height) => (
                        <div
                          key={height}
                          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-1.5"
                        >
                          <span className="font-mono text-sm font-black text-primary">{height}m</span>
                          <button
                            type="button"
                            disabled={!isLoggedIn}
                            onClick={() => removeHighJumpHeight(height)}
                            className="text-slate-500 hover:text-rose-400 disabled:opacity-40"
                            title="Remove this height layer"
                          >
                            <Icon name="close" className="text-[14px]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {currentIds.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-slate-500">
                    No competitors to show yet.
                  </div>
                ) : highJumpHeights.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-slate-500">
                    Add a height layer above to start recording attempts.
                  </div>
                ) : (
                  <div className="max-h-[52vh] overflow-auto rounded-xl border border-white/10">
                    <table className="royal-data-table min-w-[900px]">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-[#0b1220]">Competitor</th>
                          <th>House</th>
                          {highJumpHeights.map((height) => (
                            <th key={height} className="text-center">{height}m</th>
                          ))}
                          <th>Best</th>
                          <th>Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentIds.map((studentId) => {
                          const student = studentMap.get(studentId);
                          if (!student) return null;

                          const config = houseConfig(student.house);
                          const result = getResult(studentId, stage);

                          return (
                            <tr key={studentId}>
                              <td className="sticky left-0 z-10 bg-[#0b1220]">
                                <div className="font-black text-white">{student.name}</div>
                                <div className="text-[10px] text-slate-500">#{student.id} • {category}</div>
                              </td>
                              <td>
                                <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[9px] font-bold ${config.bg}/20 ${config.text} ${config.border}/30`}>
                                  {student.house}
                                </span>
                              </td>
                              {highJumpHeights.map((height) => {
                                const row = highJumpAttemptRows.find((r) => r.studentId === studentId && r.height === height);
                                const attempts: AthleticsHighJumpAttemptResult[] = [
                                  row?.attempts?.[0] || 'pending',
                                  row?.attempts?.[1] || 'pending',
                                  row?.attempts?.[2] || 'pending',
                                ];
                                const clearedIndex = attempts.findIndex((a) => a === 'cleared');
                                const hasCleared = clearedIndex !== -1;

                                return (
                                  <td key={height} className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {[0, 1, 2].map((attemptIndex) => {
                                        const value = attempts[attemptIndex];
                                        // Once a competitor has cleared this height, later attempts are moot —
                                        // shown dimmed and left click-through disabled to avoid confusing entry.
                                        const moot = hasCleared && attemptIndex > clearedIndex;

                                        return (
                                          <div key={attemptIndex} className="flex flex-col items-center gap-0.5">
                                            <button
                                              type="button"
                                              disabled={!isLoggedIn || moot}
                                              onClick={() => setHighJumpAttempt(studentId, height, attemptIndex as 0 | 1 | 2, 'cleared')}
                                              className={`flex size-6 items-center justify-center rounded border text-xs font-black transition-all disabled:opacity-30 ${
                                                value === 'cleared'
                                                  ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
                                                  : 'border-white/10 bg-white/[0.02] text-slate-600 hover:border-emerald-500/30 hover:text-emerald-400'
                                              }`}
                                              title={`Attempt ${attemptIndex + 1}: mark cleared`}
                                            >
                                              ✓
                                            </button>
                                            <button
                                              type="button"
                                              disabled={!isLoggedIn || moot}
                                              onClick={() => setHighJumpAttempt(studentId, height, attemptIndex as 0 | 1 | 2, 'failed')}
                                              className={`flex size-6 items-center justify-center rounded border text-xs font-black transition-all disabled:opacity-30 ${
                                                value === 'failed'
                                                  ? 'border-rose-400/50 bg-rose-400/20 text-rose-300'
                                                  : 'border-white/10 bg-white/[0.02] text-slate-600 hover:border-rose-500/30 hover:text-rose-400'
                                              }`}
                                              title={`Attempt ${attemptIndex + 1}: mark failed`}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                );
                              })}
                              <td>
                                <span className={`font-mono text-sm font-black ${result.timing ? 'text-emerald-300' : 'text-slate-600'}`}>
                                  {result.timing ? `${result.timing}m` : '—'}
                                </span>
                              </td>
                              <td>
                                <span className="font-black text-white">{result.position || '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!isHighJump && (
            <div className="max-h-[48vh] overflow-auto rounded-xl border border-white/10">
              <table className="royal-data-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th>Competitor</th>
                    <th>House</th>
                    <th>Status</th>
                    <th>{event.kind === 'track' ? 'Time' : THREE_ATTEMPT_FIELD_EVENTS.has(event.id) ? 'Attempts (Best)' : 'Distance'}</th>
                    <th>Position</th>
                    {stage === 'qualifying' && <th>Qualification</th>}
                    {stage === 'qualifying' && finalsEnabled && <th>Finals</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentIds.map((studentId) => {
                    const student = studentMap.get(studentId);

                    if (!student) {
                      return null;
                    }

                    const result = getResult(student.id, stage);
                    const qualifyingResult = getResult(student.id, 'qualifying');
                    const qualified = Boolean(qualifyingResult.qualified);
                    const inFinals = finalistIds.includes(student.id);
                    const config = houseConfig(student.house);
                    const resultKey = `${stage}:${student.id}`;

                    const track = splitTrackTiming(result.timing);
                    const field = splitFieldDistance(result.timing);
                    const isThreeAttemptField = THREE_ATTEMPT_FIELD_EVENTS.has(event.id);
                    // Preserve every attempt actually recorded — not just the
                    // default 3 — so additional attempts render correctly.
                    const attemptSlotCount = Math.max(3, result.attempts?.length || 0);
                    const attempts = Array.from({ length: attemptSlotCount }, (_, index) => result.attempts?.[index] || '');

                    return (
                      <tr
                        key={resultKey}
                        className={
                          stage === 'qualifying' && qualified
                            ? 'bg-emerald-500/[0.035]'
                            : ''
                        }
                      >
                        <td>
                          <div
                            className={`font-black ${
                              stage === 'qualifying' && qualified
                                ? 'text-emerald-200'
                                : 'text-white'
                            }`}
                          >
                            {stage === 'qualifying' && qualified ? '✓ ' : ''}
                            {student.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            #{student.id} • {category}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-1 text-[9px] font-bold ${config.bg}/20 ${config.text} ${config.border}/30`}
                          >
                            {student.house}
                          </span>
                        </td>

                        <td>
                          <select
                            disabled={!isLoggedIn}
                            value={result.status}
                            onChange={(eventObject) =>
                              updateResult(student.id, stage, {
                                status: eventObject.target.value as AthleticsResultStatus,
                              })
                            }
                            className={`royal-input rounded-lg px-2 py-2 text-xs ${statusStyle(result.status)}`}
                          >
                            {RESULT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          {event.kind === 'track' ? (
                            <div className="flex min-w-[280px] items-center gap-2">
                              <input
                                disabled={!isLoggedIn}
                                type="number"
                                min="0"
                                value={track.minutes}
                                onChange={(eventObject) =>
                                  updateTrackPart(
                                    student.id,
                                    stage,
                                    'minutes',
                                    eventObject.target.value,
                                    999,
                                  )
                                }
                                className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm"
                              />
                              <span>:</span>
                              <input
                                disabled={!isLoggedIn}
                                type="number"
                                min="0"
                                max="59"
                                value={track.seconds}
                                onChange={(eventObject) =>
                                  updateTrackPart(
                                    student.id,
                                    stage,
                                    'seconds',
                                    eventObject.target.value,
                                    59,
                                  )
                                }
                                className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm"
                              />
                              <span>:</span>
                              <input
                                disabled={!isLoggedIn}
                                type="number"
                                min="0"
                                max="999"
                                value={track.milliseconds}
                                onChange={(eventObject) =>
                                  updateTrackPart(
                                    student.id,
                                    stage,
                                    'milliseconds',
                                    eventObject.target.value,
                                    999,
                                  )
                                }
                                className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm"
                              />
                            </div>
                          ) : isThreeAttemptField ? (
                            <div className="flex min-w-[260px] flex-col gap-1.5">
                              {Array.from({ length: Math.max(3, attempts.length) }, (_, attemptIndex) => {
                                const attemptSplit = splitFieldDistance(attempts[attemptIndex]);
                                const isBest = Boolean(attempts[attemptIndex]) && attempts[attemptIndex] === result.timing;
                                const isExtra = attemptIndex >= 3;

                                return (
                                  <div key={attemptIndex} className="flex items-center gap-2">
                                    <span className={`w-14 shrink-0 text-[9px] font-black uppercase ${isBest ? 'text-emerald-300' : 'text-slate-500'}`}>
                                      Try {attemptIndex + 1}{isExtra ? ' +' : ''}{isBest ? ' ★' : ''}
                                    </span>
                                    <input
                                      disabled={!isLoggedIn}
                                      type="number"
                                      min="0"
                                      value={attemptSplit.metres}
                                      onChange={(eventObject) =>
                                        updateFieldAttempt(
                                          student.id,
                                          stage,
                                          attemptIndex,
                                          'metres',
                                          eventObject.target.value,
                                        )
                                      }
                                      className={`royal-input w-full rounded-lg px-2 py-1.5 text-center font-mono text-sm ${isBest ? 'border-emerald-500/40' : ''}`}
                                    />
                                    <span>.</span>
                                    <input
                                      disabled={!isLoggedIn}
                                      type="number"
                                      min="0"
                                      max="99"
                                      value={attemptSplit.centimetres}
                                      onChange={(eventObject) =>
                                        updateFieldAttempt(
                                          student.id,
                                          stage,
                                          attemptIndex,
                                          'centimetres',
                                          eventObject.target.value,
                                        )
                                      }
                                      className={`royal-input w-full rounded-lg px-2 py-1.5 text-center font-mono text-sm ${isBest ? 'border-emerald-500/40' : ''}`}
                                    />
                                    {isExtra && (
                                      <button
                                        type="button"
                                        disabled={!isLoggedIn}
                                        onClick={() => removeFieldAttempt(student.id, stage, attemptIndex)}
                                        title="Remove this attempt"
                                        className="flex size-7 shrink-0 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
                                      >
                                        <Icon name="close" className="text-[13px]" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                                Best: <span className={result.timing ? 'text-emerald-300' : 'text-slate-600'}>{result.timing ? `${result.timing}m` : '—'}</span>
                              </div>
                                <button
                                  type="button"
                                  disabled={!isLoggedIn}
                                  onClick={() => addFieldAttempt(student.id, stage)}
                                  className="mt-1 self-end rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary hover:bg-primary/20 disabled:opacity-50"
                                >
                                  + Add Attempt
                                </button>
                            </div>
                          ) : (
                            <div className="flex min-w-[220px] items-center gap-2">
                              <input
                                disabled={!isLoggedIn}
                                type="number"
                                min="0"
                                value={field.metres}
                                onChange={(eventObject) =>
                                  updateFieldPart(
                                    student.id,
                                    stage,
                                    'metres',
                                    eventObject.target.value,
                                  )
                                }
                                className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm"
                              />
                              <span>.</span>
                              <input
                                disabled={!isLoggedIn}
                                type="number"
                                min="0"
                                max="99"
                                value={field.centimetres}
                                onChange={(eventObject) =>
                                  updateFieldPart(
                                    student.id,
                                    stage,
                                    'centimetres',
                                    eventObject.target.value,
                                  )
                                }
                                className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm"
                              />
                            </div>
                          )}

                          {savedStudent === resultKey && (
                            <span className="ml-2 text-xs text-emerald-400">✓</span>
                          )}
                        </td>

                        <td>
                          <input
                            disabled={!isLoggedIn}
                            type="number"
                            min="1"
                            value={result.position || ''}
                            onChange={(eventObject) =>
                              updateResult(student.id, stage, {
                                position: eventObject.target.value
                                  ? Number(eventObject.target.value)
                                  : undefined,
                              })
                            }
                            className="royal-input w-20 rounded-lg px-2 py-2 text-center text-xs"
                            placeholder="#"
                          />
                        </td>

                        {stage === 'qualifying' && (
                          <td>
                            <button
                              type="button"
                              disabled={!isLoggedIn}
                              onClick={() => toggleQualified(student.id)}
                              className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${
                                qualified
                                  ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                                  : 'border-white/10 bg-white/[0.025] text-slate-400 hover:border-emerald-500/30 hover:text-emerald-300'
                              }`}
                            >
                              {qualified ? '✓ Qualified' : 'Qualified'}
                            </button>
                          </td>
                        )}

                        {stage === 'qualifying' && finalsEnabled && (
                          <td>
                            <button
                              type="button"
                              disabled={!isLoggedIn}
                              onClick={() => toggleFinalist(student.id)}
                              className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${
                                inFinals
                                  ? 'border-primary/40 bg-primary/10 text-primary'
                                  : 'border-white/10 bg-white/[0.025] text-slate-300 hover:border-primary/30 hover:text-primary'
                              }`}
                            >
                              {inFinals ? '✓ In Finals' : 'Add to Finals'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md">
      <div className="relative flex w-[calc(100vw-1.5rem)] max-w-[1220px] max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-[0_30px_100px_rgba(0,0,0,0.72)]">
        <div className="shrink-0 border-b border-primary/15 bg-[#0b121e] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Icon
                name={event.kind === 'relay' ? 'groups' : event.kind === 'track' ? 'directions_run' : 'sports_handball'}
                size="23"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="royal-kicker mb-1">
                {category} • Athletics 2026
              </div>
              <h2 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                {event.name}
              </h2>
              <div className="mt-1 text-xs text-slate-400 sm:text-sm">
                {event.kind === 'relay' ? 'House Relay • Staff Management' : event.kind === 'track' ? 'Track • Staff Management' : 'Field • Staff Management'}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 hover:border-primary/30 hover:text-white"
            >
              <Icon name="close" size="22" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('enrollment')}
              className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase ${tab === 'enrollment' ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}
            >
              {isRelay ? 'Teams' : 'Enrollment'}
              {!isRelay && <span className="ml-1 opacity-70">{enrollment.length}</span>}
            </button>

            <button
              type="button"
              onClick={() => setTab('results')}
              className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase ${tab === 'results' ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}
            >
              {isRelay ? 'Race Results' : 'Qualifying / Finals'}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          {isRelay ? renderRelay() : tab === 'enrollment' ? renderEnrollment() : renderResults()}
        </div>
      </div>
    </div>
  );
};

export default AthleticsEventManager;
