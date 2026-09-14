import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { useToast } from '../ui/ToastProvider';
import { AthleticsCategory } from '../../utils/athleticsCategories';
import { AthleticsEvent, AthleticsSnapshot, AthleticsStage, AthleticsStudent } from '../../utils/athleticsStorage';

type Props = {
  event: AthleticsEvent;
  category: AthleticsCategory;
  students: AthleticsStudent[];
  snapshot: AthleticsSnapshot;
  isLoggedIn: boolean;
  onSave: (snapshot: AthleticsSnapshot, title: string, description: string) => void;
};

const parseTrackTiming = (value = '') => {
  const parts = value.trim().split(':').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return Number.POSITIVE_INFINITY;
  return parts[0] * 60 + parts[1] + parts[2] / 1000;
};

const parseFieldDistance = (value = '') => {
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) ? number : Number.NEGATIVE_INFINITY;
};

const getWinner = (
  event: AthleticsEvent,
  category: AthleticsCategory,
  stage: AthleticsStage,
  students: AthleticsStudent[],
  snapshot: AthleticsSnapshot,
) => {
  const studentMap = new Map(students.map(student => [student.id, student]));
  const source = stage === 'finals'
    ? snapshot.finals.find(item => item.eventId === event.id && item.category === category)
    : snapshot.enrollments.find(item => item.eventId === event.id && item.category === category);
  const ids = source?.studentIds || [];

  const ranked = ids
    .map(id => ({
      student: studentMap.get(id),
      result: snapshot.results.find(result => result.eventId === event.id && result.category === category && result.studentId === id && (result.stage || 'qualifying') === stage),
    }))
    .filter((item): item is { student: AthleticsStudent; result: NonNullable<typeof item.result> } => {
      if (!item.student || !item.result || item.result.status !== 'finished' || !item.result.timing) return false;
      if (stage === 'qualifying' && item.result.qualified !== true) return false;
      return true;
    });

  ranked.sort((a, b) => event.kind === 'track'
    ? parseTrackTiming(a.result.timing) - parseTrackTiming(b.result.timing)
    : parseFieldDistance(b.result.timing) - parseFieldDistance(a.result.timing));

  return ranked[0] || null;
};

const NewResultAwardOverlay: React.FC<Props> = ({ event, category, students, snapshot, isLoggedIn, onSave }) => {
  const { showToast } = useToast();
  const finalsEnabled = Boolean(snapshot.finals.find(item => item.eventId === event.id && item.category === category)?.enabled);
  const stages: AthleticsStage[] = finalsEnabled ? ['qualifying', 'finals'] : ['qualifying'];

  if (!isLoggedIn || typeof document === 'undefined') return null;

  const award = (stage: AthleticsStage) => {
    const winner = getWinner(event, category, stage, students, snapshot);
    if (!winner) {
      showToast({ title: 'No Winner Yet', description: `${stage === 'finals' ? 'Finals' : 'Qualifying'} needs a finished valid winner before a New Result can be awarded.` });
      return;
    }
    if (winner.result.newResultAwarded) return;

    const confirmed = window.confirm(`Award NEW RESULT +3 to ${winner.student.name}?\n\nThis gives +3 championship points to ${winner.student.name} and +3 to ${winner.student.house}.`);
    if (!confirmed) return;

    const nextResults = snapshot.results.map(result => {
      if (result.eventId !== event.id || result.category !== category || result.studentId !== winner.student.id || (result.stage || 'qualifying') !== stage) return result;
      return { ...result, newResultAwarded: true };
    });

    onSave({ ...snapshot, results: nextResults }, 'New Result Awarded', `${winner.student.name} receives +3 points and ${winner.student.house} receives +3 for ${event.name} ${stage}.`);
    showToast({ title: 'New Result Awarded', description: `${winner.student.name}: +3 • ${winner.student.house}: +3` });
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[11000] w-[min(430px,calc(100vw-2rem))] rounded-2xl border border-primary/25 bg-[#0b121e]/98 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon name="emoji_events" size="18" /></div>
        <div className="min-w-0 flex-1">
          <div className="royal-kicker">Championship Award</div>
          <div className="mt-0.5 text-sm font-black text-white">New Result • +3</div>
          <div className="mt-1 text-[10px] leading-relaxed text-slate-500">Adds +3 to the stage winner and +3 to the winner's house.</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stages.map(stage => {
          const winner = getWinner(event, category, stage, students, snapshot);
          const awarded = Boolean(winner?.result.newResultAwarded);
          const label = stage === 'finals' ? 'Finals' : 'Qualifying';
          return (
            <button
              key={stage}
              type="button"
              disabled={!winner || awarded}
              onClick={() => award(stage)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${awarded ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40'}`}
            >
              <div className="text-[8px] font-black uppercase tracking-[0.18em] opacity-70">{label}</div>
              <div className="mt-1 truncate text-xs font-black">{winner?.student.name || 'No valid winner yet'}</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-wider opacity-70">{awarded ? '✓ Awarded +3' : 'Award New Result +3'}</div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

export default NewResultAwardOverlay;
