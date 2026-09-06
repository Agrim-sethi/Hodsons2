import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { useToast } from '../ui/ToastProvider';
import {
  ATHLETICS_EVENTS,
  AthleticsEvent,
  AthleticsResult,
  AthleticsResultStatus,
  AthleticsSnapshot,
  AthleticsStage,
} from '../../utils/athleticsStorage';
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
  onSave: (
    snapshot: AthleticsSnapshot,
    title: string,
    description: string,
  ) => void;
  onClose: () => void;
};

const HOUSES = [
  'Vindhya',
  'Himalaya',
  'Nilgiri',
  'Siwalik',
] as const;

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
    medically_excused:
      'border-purple-500/30 bg-purple-500/10 text-purple-300',
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

  return Number.isFinite(number)
    ? number
    : Number.NEGATIVE_INFINITY;
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
    return new Map(
      students.map((student) => [student.id, student]),
    );
  }, [students]);

  const enrollment = React.useMemo(() => {
    return (
      snapshot.enrollments.find(
        (entry) => entry.eventId === event.id,
      )?.studentIds || []
    );
  }, [event.id, snapshot.enrollments]);

  const finalsConfig = React.useMemo(() => {
    return snapshot.finals.find(
      (entry) => entry.eventId === event.id,
    );
  }, [event.id, snapshot.finals]);

  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const finalistIds = finalsConfig?.studentIds || [];
  const currentIds = stage === 'finals' ? finalistIds : enrollment;

  const filteredStudents = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    return students
      .filter((student) => {
        const matchesSearch =
          !query ||
          student.id.toLowerCase().includes(query) ||
          student.name.toLowerCase().includes(query) ||
          student.className.toLowerCase().includes(query);

        const matchesHouse =
          houseFilter === 'All' ||
          student.house === houseFilter;

        return matchesSearch && matchesHouse;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, search, houseFilter]);

  const getResult = (
    studentId: string,
    resultStage: AthleticsStage,
  ): AthleticsResult => {
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
        reason:
          'Allowed combination: 2 track + 1 field or 2 field + 1 track.',
      };
    },
    [event.id, event.kind, snapshot.enrollments],
  );

  const toggleEnrollment = (studentId: string) => {
    if (!isLoggedIn) {
      return;
    }

    const enrolled = enrollment.includes(studentId);

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
            !(
              result.eventId === event.id &&
              result.studentId === studentId
            ),
        )
      : snapshot.results;

    const finals = enrolled
      ? snapshot.finals.map((finalsEntry) => {
          if (finalsEntry.eventId !== event.id) {
            return finalsEntry;
          }

          return {
            ...finalsEntry,
            studentIds: finalsEntry.studentIds.filter(
              (id) => id !== studentId,
            ),
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
    const current = splitTrackTiming(
      getResult(studentId, resultStage).timing,
    );

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
    const current = splitFieldDistance(
      getResult(studentId, resultStage).timing,
    );

    const nextValue = value
      .replace(/\D/g, '')
      .slice(0, key === 'metres' ? 3 : 2);

    const next = {
      ...current,
      [key]: nextValue,
    };

    updateResult(studentId, resultStage, {
      timing:
        next.metres === '' && next.centimetres === ''
          ? ''
          : `${next.metres || '0'}.${(
              next.centimetres || '0'
            ).padStart(2, '0')}`,
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
      enabled
        ? 'Separate finals stage enabled.'
        : 'Finals disabled.',
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
      `${studentMap.get(studentId)?.name || 'Student'} ${
        exists ? 'removed from' : 'added to'
      } finals.`,
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
        return (
          parseTrackTiming(a.timing || '') -
          parseTrackTiming(b.timing || '')
        );
      }

      return (
        parseFieldDistance(b.timing || '') -
        parseFieldDistance(a.timing || '')
      );
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
            studentIds: candidates
              .slice(0, 4)
              .map((result) => result.studentId),
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
        return (
          parseTrackTiming(a.timing || '') -
          parseTrackTiming(b.timing || '')
        );
      }

      return (
        parseFieldDistance(b.timing || '') -
        parseFieldDistance(a.timing || '')
      );
    });

    const rankMap = new Map(
      ranked.map((result, index) => [
        result.studentId,
        index + 1,
      ]),
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
    setTab('enrollment');
  }, [event.id]);

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4"
      style={{
        isolation: 'isolate',
      }}
      onClick={(eventObject) => {
        if (eventObject.target === eventObject.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] max-w-[1220px] flex-col overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-[0_30px_100px_rgba(0,0,0,0.72)] sm:h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-primary/15 bg-[#0b121e] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-4">
            <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary sm:flex">
              <Icon
                name={
                  event.kind === 'track'
                    ? 'directions_run'
                    : 'sports_handball'
                }
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

          <div className="mt-5 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => setTab('enrollment')}
              className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase transition-colors ${
                tab === 'enrollment'
                  ? 'bg-primary/15 text-primary'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Enrollment
              <span className="ml-1 opacity-70">
                {enrollment.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('results')}
              className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase transition-colors ${
                tab === 'results'
                  ? 'bg-primary/15 text-primary'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Qualifying / Finals
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6">
          {tab === 'enrollment' ? renderEnrollment() : renderResults()}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modal, document.body)
    : null;
};

export default AthleticsEventManager;
