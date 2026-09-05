import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { PodiumStep } from '../hodsons/shared';
import {
    ATHLETICS_CATEGORIES,
    AthleticsCategory,
} from '../../utils/athleticsCategories';
import {
    ATHLETICS_EVENTS,
    AthleticsEvent,
    AthleticsHouse,
    AthleticsResult,
    AthleticsSnapshot,
} from '../../utils/athleticsStorage';
import { PodiumPlayer } from '../hodsons/types';

type AthleticsStudent = {
    id: string;
    name: string;
    house: AthleticsHouse;
    category: AthleticsCategory;
    className: string;
};

type Stage = 'qualifying' | 'finals';

const EXCLUSIVE_EVENT_CATEGORIES: Record<
    string,
    AthleticsCategory[]
> = {
    '3000m': ['BD Opens'],
    'triple-jump': ['BD Opens'],
    'javelin-throw': ['BD Opens'],
};

const resultStageOf = (result: AthleticsResult): Stage => {
    return result.stage || 'qualifying';
};

const isTrack = (event: AthleticsEvent) => {
    return event.kind === 'track';
};

const parseTrackTiming = (value = '') => {
    const parts = value.trim().split(':').map(Number);

    if (
        parts.length === 3 &&
        parts.every(Number.isFinite)
    ) {
        return (
            parts[0] * 60 +
            parts[1] +
            parts[2] / 1000
        );
    }

    return Number.POSITIVE_INFINITY;
};

const parseFieldDistance = (value = '') => {
    const number = Number(
        value.trim().replace(',', '.')
    );

    return Number.isFinite(number)
        ? number
        : Number.NEGATIVE_INFINITY;
};

const displayResult = (
    event: AthleticsEvent,
    result?: AthleticsResult
) => {
    if (
        !result ||
        result.status !== 'finished' ||
        !result.timing
    ) {
        return '—';
    }

    return result.timing;
};

const houseConfig = (house: string) => {
    const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;

    return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const AthleticsViewEvents: React.FC<{
    students: AthleticsStudent[];
    snapshot: AthleticsSnapshot;
}> = ({ students, snapshot }) => {
    const [category, setCategory] =
        React.useState<AthleticsCategory>('PDB Under 11');

    const [selectedEvent, setSelectedEvent] =
        React.useState<AthleticsEvent | null>(null);

    const [stage, setStage] =
        React.useState<Stage>('qualifying');

    const visibleEvents = React.useMemo(() => {
        return ATHLETICS_EVENTS.filter((event) => {
            const allowedCategories =
                EXCLUSIVE_EVENT_CATEGORIES[event.id];

            return (
                !allowedCategories ||
                allowedCategories.includes(category)
            );
        });
    }, [category]);

    const studentMap = React.useMemo(() => {
        return new Map(
            students.map((student) => [
                student.id,
                student,
            ])
        );
    }, [students]);

    const getEnrollment = (eventId: string) => {
        return (
            snapshot.enrollments.find(
                (entry) => entry.eventId === eventId
            )?.studentIds ?? []
        );
    };

    const finalsFor = (eventId: string) => {
        return snapshot.finals.find(
            (entry) => entry.eventId === eventId
        );
    };

    const resultFor = (
        event: AthleticsEvent,
        studentId: string,
        requestedStage: Stage
    ) => {
        return snapshot.results.find(
            (result) =>
                result.eventId === event.id &&
                result.studentId === studentId &&
                resultStageOf(result) === requestedStage
        );
    };

    const rankedResults = React.useCallback(
        (
            event: AthleticsEvent,
            requestedStage: Stage
        ) => {
            const enrollment = getEnrollment(event.id);

            const finalists = new Set(
                finalsFor(event.id)?.studentIds ?? []
            );

            const ids =
                requestedStage === 'finals'
                    ? [...finalists]
                    : enrollment;

            const ranked = ids
                .map((id) => ({
                    student: studentMap.get(id),
                    result: resultFor(
                        event,
                        id,
                        requestedStage
                    ),
                }))
                .filter(
                    (
                        entry
                    ): entry is {
                        student: AthleticsStudent;
                        result: AthleticsResult;
                    } =>
                        Boolean(
                            entry.student &&
                            entry.result?.status === 'finished' &&
                            entry.result.timing
                        )
                );

            ranked.sort((a, b) => {
                if (isTrack(event)) {
                    return (
                        parseTrackTiming(a.result.timing) -
                        parseTrackTiming(b.result.timing)
                    );
                }

                return (
                    parseFieldDistance(b.result.timing) -
                    parseFieldDistance(a.result.timing)
                );
            });

            return ranked.map((entry, index) => ({
                ...entry,
                computedPosition: index + 1,
            }));
        },
        [snapshot, studentMap]
    );

    const podiumFor = React.useCallback(
        (event: AthleticsEvent) => {
            const finals = finalsFor(event.id);

            const finalsRanked = finals?.enabled
                ? rankedResults(event, 'finals')
                : [];

            const qualifyingRanked = rankedResults(
                event,
                'qualifying'
            );

            if (
                finals?.enabled &&
                finalsRanked.length > 0
            ) {
                return finalsRanked.slice(0, 3);
            }

            return qualifyingRanked.slice(0, 3);
        },
        [rankedResults, snapshot]
    );

    const openEvent = (event: AthleticsEvent) => {
        setSelectedEvent(event);

        setStage(
            finalsFor(event.id)?.enabled
                ? 'finals'
                : 'qualifying'
        );
    };

    const selectedFinalsEnabled = selectedEvent
        ? Boolean(
            finalsFor(selectedEvent.id)?.enabled
        )
        : false;

    const selectedRanked = selectedEvent
        ? rankedResults(selectedEvent, stage)
        : [];

    const makePlayer = (
        entry:
            | ReturnType<typeof rankedResults>[number]
            | undefined
    ): PodiumPlayer | null => {
        if (!entry) {
            return null;
        }

        return {
            id: entry.student.id,
            name: entry.student.name,
            house: entry.student.house,
            position:
                entry.result.position ??
                entry.computedPosition,
            rank: entry.computedPosition,
            timing: entry.result.timing,
        };
    };

    const modal = selectedEvent ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5">
            <div className="relative flex max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-[0_30px_100px_rgba(0,0,0,0.72)]">
                <div className="shrink-0 border-b border-primary/15 bg-[#0b121e] px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-4">
                        <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary sm:flex">
                            <Icon
                                name={
                                    isTrack(selectedEvent)
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
                                {selectedEvent.name}
                            </h2>

                            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                                Published results
                            </p>
                        </div>

                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 hover:border-primary/30 hover:text-white"
                        >
                            <Icon
                                name="close"
                                size="22"
                            />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 custom-scrollbar sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1">
                            <button
                                onClick={() =>
                                    setStage('qualifying')
                                }
                                className={`rounded-lg px-4 py-2 text-xs font-black uppercase ${stage === 'qualifying'
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-slate-400'
                                    }`}
                            >
                                Qualifying
                            </button>

                            {selectedFinalsEnabled && (
                                <button
                                    onClick={() =>
                                        setStage('finals')
                                    }
                                    className={`rounded-lg px-4 py-2 text-xs font-black uppercase ${stage === 'finals'
                                        ? 'bg-primary/15 text-primary'
                                        : 'text-slate-400'
                                        }`}
                                >
                                    Finals
                                </button>
                            )}
                        </div>

                        <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                            {selectedRanked.length}{' '}
                            finished result
                            {selectedRanked.length === 1
                                ? ''
                                : 's'}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            <span>Competitor</span>
                            <span>
                                {isTrack(selectedEvent)
                                    ? 'Time'
                                    : 'Distance'}
                            </span>
                            <span>Position</span>
                        </div>

                        {selectedRanked.length === 0 ? (
                            <div className="px-4 py-12 text-center text-sm text-slate-500">
                                No completed results have been published yet.
                            </div>
                        ) : (
                            selectedRanked.map(
                                ({
                                    student,
                                    result,
                                    computedPosition,
                                }) => {
                                    const config = houseConfig(
                                        student.house
                                    );

                                    return (
                                        <div
                                            key={`${stage}:${student.id}`}
                                            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate font-black text-white">
                                                    {student.name}
                                                </div>

                                                <div className="mt-0.5 text-[10px] text-slate-500">
                                                    #{student.id} • Class{' '}
                                                    {student.className}
                                                </div>

                                                <span
                                                    className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${config.bg}/20 ${config.text} ${config.border}/30`}
                                                >
                                                    {student.house}
                                                </span>
                                            </div>

                                            <div className="font-mono text-sm font-black text-slate-200">
                                                {displayResult(
                                                    selectedEvent,
                                                    result
                                                )}
                                            </div>

                                            <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                                                #{
                                                    result.position ||
                                                    computedPosition
                                                }
                                            </div>
                                        </div>
                                    );
                                }
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <section className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="royal-kicker mb-1">
                            Age Category Results
                        </div>

                        <h2 className="text-2xl font-black text-white">
                            Athletics Event Results
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            Published results for every event, organised by department and age category.
                        </p>
                    </div>

                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        {visibleEvents.length} events
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {ATHLETICS_CATEGORIES.map((item) => (
                        <button
                            key={item}
                            onClick={() => setCategory(item)}
                            className={`rounded-xl border px-3 py-3 text-left ${category === item
                                ? 'border-primary/50 bg-primary/10 text-white'
                                : 'border-white/10 bg-white/[0.02] text-slate-400'
                                }`}
                        >
                            <div className="text-sm font-black">
                                {item}
                            </div>

                            <div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">
                                {students.filter(
                                    (student) =>
                                        student.category === item
                                ).length}{' '}
                                students
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <div className="royal-kicker mb-1">
                            {category}
                        </div>

                        <h2 className="text-2xl font-black text-white">
                            Event Results
                        </h2>
                    </div>

                    <div className="text-xs text-slate-400">
                        Click a card for full results
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibleEvents.map((event) => {
                        const podium = podiumFor(event);

                        const p1 = podium[0];
                        const p2 = podium[1];
                        const p3 = podium[2];

                        return (
                            <button
                                key={event.id}
                                onClick={() => openEvent(event)}
                                className="glass-panel group rounded-2xl border border-primary/10 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span
                                            className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase ${isTrack(event)
                                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                                                }`}
                                        >
                                            {isTrack(event)
                                                ? 'Track'
                                                : 'Field'}
                                        </span>

                                        <h3 className="mt-3 text-xl font-black text-white group-hover:text-primary">
                                            {event.name}
                                        </h3>
                                    </div>

                                    <Icon
                                        name={
                                            isTrack(event)
                                                ? 'directions_run'
                                                : 'sports_handball'
                                        }
                                        className="text-[27px] text-primary"
                                    />
                                </div>

                                <div className="mt-5 grid grid-cols-3 items-end gap-1 border-t border-white/5 pt-4">
                                    <PodiumStep
                                        player={makePlayer(p2)}
                                        rank={2}
                                    />

                                    <PodiumStep
                                        player={makePlayer(p1)}
                                        rank={1}
                                    />

                                    <PodiumStep
                                        player={makePlayer(p3)}
                                        rank={3}
                                    />
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                        Published podium
                                    </span>

                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                        View results →
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {selectedEvent &&
                typeof document !== 'undefined'
                ? createPortal(
                    modal,
                    document.body
                )
                : null}
        </>
    );
};

export default AthleticsViewEvents;
