import React from 'react';
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

const getWinner = (event: AthleticsEvent, category: AthleticsCategory, stage: AthleticsStage, students: AthleticsStudent[], snapshot: AthleticsSnapshot) => {
  const studentMap = new Map(students.map(student => [student.id, student]));
  const entry = stage === 'finals'
    ? snapshot.finals.find(item => item.eventId === event.id && item.category === category)
    : snapshot.enrollments.find(item => item.eventId === event.id && item.category === category);

  const ids = entry?.studentIds || [];
  const ranked = ids
    .map(id => ({
      student: studentMap.get(id),
      result: snapshot.results.find(result => result.eventId === event.id && result.category === category && result.studentId === id && (result.stage || 'qualifying') === stage),
    }))
    .filter((item): item is { student: AthleticsStudent; result: NonNullable<typeof item.result> } => Boolean(
      item.student &&
      item.result &&
      item.result.status === 'finished' &&
      item.result.timing &&
      (stage === 'finals' || item.result.qualified === true)
    ));

  ranked.sort((a, b) => event.kind === 'track'
    ? parseTrackTiming(a.result.timing) - parseTrackTiming(b.result.timing)
    : parseFieldDistance(b.result.timing) - parseFieldDistance(a.result.timing));

  return ranked[0] || null;
};

const NewResultAwardControls: React.FC<Props> = ({ event, category, students, snapshot, isLoggedIn, onSave }) => {
  const { showToast } = useToast();
  const finalsEnabled = Boolean(snapshot.finals.find(item => item.eventId === event.id && item.category === category)?.enabled);
  const stages: AthleticsStage[] = finalsEnabled ? ['qualifying', 'finals'] : ['qualifying'];

  const award = (stage: AthleticsStage) => {
    const winner = getWinner(event, category, stage, students, snapshot);
    if (!winner) {
      showToast({ title: 'No Winner Yet', description: `${stage === 'finals' ? 'Finals' : 'Qualifying'} needs a finished${stage === 'qualifying' ? ' qualified' : ''} result before a New Result can be awarded.` });
      return;
    }

    if (winner.result.newResultAwarded) return;

    const confirmed = window.confirm(
      `Award NEW RESULT +3 to ${winner.student.name}?\n\nThis gives +3 championship points to ${winner.student.name} and +3 to ${winner.student.house}.\n\nThis award can only be applied once to this ${stage} result.`
    );
    if (!confirmed) return;

    const nextResults = snapshot.results.map(result => {
      if (result.eventId !== event.id || result.category !== category || result.studentId !== winner.student.id || (result.stage || 'qualifying') !== stage) return result;
      return { ...result, newResultAwarded: true };
    });

    onSave(
      { ...snapshot, results: nextResults },
      'New Result Awarded',
      `${winner.student.name} receives +3 points and ${winner.student.house} receives +3 for ${event.name} ${stage}.`,
    );

    showToast({ title: 'New Result Awarded', description: `${winner.student.name}: +3 • ${winner.student.house}: +3` });
  };

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="royal-kicker">Championship Award</div>
          <h3 className="mt-1 text-base font-black text-white">New Result</h3>
          <p className="mt-1 text-xs text-slate-500">Adds +3 to the stage winner and +3 to their house. Only staff can award it, and each stage can be awarded once.</p>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">+3 / +3</div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stages.map(stage => {
          const winner = getWinner(event, category, stage, students, snapshot);
          const awarded = Boolean(winner?.result.newResultAwarded);
          return (
            <div key={stage} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{stage === 'finals' ? 'Finals Winner' : 'Qualifying Winner'}</div>
              <div className="mt-1 min-h-[20px] text-sm font-black text-white">{winner?.student.name || 'No finished winner yet'}</div>
              {winner && <div className="mt-0.5 text-[10px] text-slate-500">{winner.student.house} • {winner.result.timing}</div>}
              {isLoggedIn ? (
                <button type="button" disabled={!winner || awarded} onClick={() => award(stage)} className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-wider transition ${awarded ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40'}`}>
                  <Icon name={awarded ? 'verified' : 'add_circle'} size="13" /> {awarded ? 'New Result Awarded' : 'New Result +3'}
                </button>
              ) : (
                awarded && <span className="mt-3 inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-2 text-[9px] font-black uppercase tracking-wider text-emerald-300"><Icon name="verified" size="13" /> +3 Awarded</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewResultAwardControls;
