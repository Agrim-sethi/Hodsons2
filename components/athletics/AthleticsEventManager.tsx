import React from 'react';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { useToast } from '../ui/ToastProvider';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsResult, AthleticsResultStatus, AthleticsSnapshot, AthleticsStage } from '../../utils/athleticsStorage';
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

  const studentMap = React.useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const enrollment = React.useMemo(() => {
    return snapshot.enrollments.find((entry) => entry.eventId === event.id)?.studentIds || [];
  }, [event.id, snapshot.enrollments]);

  const finalsConfig = React.useMemo(() => {
    return snapshot.finals.find((entry) => entry.eventId === event.id);
  }, [event.id, snapshot.finals]);

  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const finalistIds = finalsConfig?.studentIds || [];
  const currentIds = stage === 'finals' ? finalistIds : enrollment;

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
          result.studentId === studentId &&
          resultStageOf(result) === resultStage,
      ) || {
        eventId: event.id,
        studentId,
        stage: resultStage,
        status: 'pending',
        timing: '',
        qualified: false,
      }
    );
  };

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
      if (entry.eventId !== event.id) {
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
            !(result.eventId === event.id && result.studentId === studentId),
        )
      : snapshot.results;

    const finals = enrolled
      ? snapshot.finals.map((finalsEntry) => {
          if (finalsEntry.eventId !== event.id) {
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
        result.studentId === studentId &&
        resultStageOf(result) === resultStage,
    );

    const nextResult: AthleticsResult = {
      eventId: event.id,
      studentId,
      stage: resultStage,
      status: existing?.status || 'pending',
      timing: existing?.timing || '',
      position: existing?.position,
      qualified: existing?.qualified || false,
      ...patch,
    };

    const results = existing
      ? snapshot.results.map((result) => {
          if (
            result.eventId !== event.id ||
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

  const toggleFinals = () => {
    if (!isLoggedIn) {
      return;
    }

    const enabled = !finalsEnabled;

    saveSnapshot(
      {
        ...snapshot,
        finals: snapshot.finals.map((entry) => {
          if (entry.eventId !== event.id) {
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
          if (entry.eventId !== event.id) {
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
          if (entry.eventId !== event.id) {
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
  }, [event.id]);

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
                  {stage === 'qualifying' ? 'Qualifying Results' : 'Finals Results'}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {event.kind === 'track'
                    ? 'Enter minutes, seconds and milliseconds separately.'
                    : 'Enter metres and centimetres separately.'}
                </p>
              </div>

              <button
                type="button"
                disabled={!isLoggedIn}
                onClick={autoRank}
                className="royal-primary-btn rounded-xl px-4 py-2 text-xs font-black uppercase disabled:opacity-50"
              >
                Auto-Rank
              </button>
            </div>

            <div className="max-h-[48vh] overflow-auto rounded-xl border border-white/10">
              <table className="royal-data-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th>Competitor</th>
                    <th>House</th>
                    <th>Status</th>
                    <th>{event.kind === 'track' ? 'Time' : 'Distance'}</th>
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
                name={event.kind === 'track' ? 'directions_run' : 'sports_handball'}
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
                {event.kind === 'track' ? 'Track' : 'Field'} • Staff Management
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
              className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase ${
                tab === 'enrollment'
                  ? 'bg-primary/15 text-primary'
                  : 'text-slate-400'
              }`}
            >
              Enrollment
              <span className="ml-1 opacity-70">{enrollment.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('results')}
              className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase ${
                tab === 'results'
                  ? 'bg-primary/15 text-primary'
                  : 'text-slate-400'
              }`}
            >
              Qualifying / Finals
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          {tab === 'enrollment' ? renderEnrollment() : renderResults()}
        </div>
      </div>
    </div>
  );
};

export default AthleticsEventManager;
