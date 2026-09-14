import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { useToast } from '../ui/ToastProvider';
import { AthleticsCategory } from '../../utils/athleticsCategories';
import { AthleticsEvent, AthleticsResult, AthleticsSnapshot, AthleticsStage, AthleticsStudent } from '../../utils/athleticsStorage';

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

const resultStageOf = (result: AthleticsResult): AthleticsStage => result.stage || 'qualifying';

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
      result: snapshot.results.find(result =>
        result.eventId === event.id &&
        result.category === category &&
        result.studentId === id &&
        resultStageOf(result) === stage,
      ),
    }))
    .filter((item): item is { student: AthleticsStudent; result: AthleticsResult } =>
      Boolean(item.student && item.result && item.result.status === 'finished' && item.result.timing),
    );

  ranked.sort((a, b) => event.kind === 'track'
    ? parseTrackTiming(a.result.timing) - parseTrackTiming(b.result.timing)
    : parseFieldDistance(b.result.timing) - parseFieldDistance(a.result.timing));

  return ranked[0] || null;
};

const getAwardedResult = (
  event: AthleticsEvent,
  category: AthleticsCategory,
  stage: AthleticsStage,
  snapshot: AthleticsSnapshot,
) => snapshot.results.find(result =>
  result.eventId === event.id &&
  result.category === category &&
  resultStageOf(result) === stage &&
  result.newResultAwarded === true,
);

const findModalPanel = () => {
  if (typeof document === 'undefined') return null;
  const overlay = document.querySelector<HTMLElement>('[class*="z-[10000]"]');
  if (!overlay) return null;
  return (overlay.firstElementChild as HTMLElement | null) || null;
};

const getActiveResultsTab = (panel: HTMLElement | null) => {
  if (!panel) return false;
  const button = Array.from(panel.querySelectorAll('button')).find((item) =>
    item.textContent?.trim() === 'Qualifying / Finals',
  ) as HTMLElement | undefined;
  return Boolean(button?.className.includes('bg-primary/15'));
};

const getActiveStage = (panel: HTMLElement | null): AthleticsStage => {
  if (!panel) return 'qualifying';
  const buttons = Array.from(panel.querySelectorAll('button')) as HTMLElement[];
  const finals = buttons.find((button) => button.textContent?.trim().startsWith('Finals'));
  if (finals?.className.includes('bg-primary/15')) return 'finals';
  return 'qualifying';
};

const NewResultAwardControls: React.FC<Props> = ({ event, category, students, snapshot, isLoggedIn, onSave }) => {
  const { showToast } = useToast();
  const [modalPanel, setModalPanel] = React.useState<HTMLElement | null>(null);
  const [resultsTabOpen, setResultsTabOpen] = React.useState(false);
  const [stage, setStage] = React.useState<AthleticsStage>('qualifying');

  React.useEffect(() => {
    let observer: MutationObserver | null = null;
    let interval: number | null = null;

    const refresh = () => {
      const panel = findModalPanel();
      setModalPanel(panel);
      setResultsTabOpen(getActiveResultsTab(panel));
      setStage(getActiveStage(panel));
    };

    refresh();
    interval = window.setInterval(refresh, 250);
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(refresh);
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      if (interval) window.clearInterval(interval);
      observer?.disconnect();
    };
  }, []);

  const finalsEnabled = Boolean(snapshot.finals.find(item => item.eventId === event.id && item.category === category)?.enabled);
  const effectiveStage: AthleticsStage = stage === 'finals' && finalsEnabled ? 'finals' : 'qualifying';
  const winner = getWinner(event, category, effectiveStage, students, snapshot);
  const awarded = getAwardedResult(event, category, effectiveStage, snapshot);
  const hasAward = Boolean(awarded);

  const toggleAward = () => {
    if (!isLoggedIn) return;

    if (hasAward && awarded) {
      const student = students.find(item => item.id === awarded.studentId);
      if (!window.confirm(`Undo NEW RESULT for ${student?.name || 'this winner'}?\n\nThis removes the extra +3 championship points from the athlete and +3 from their house.`)) return;

      const nextResults = snapshot.results.map(result => {
        if (
          result.eventId === event.id &&
          result.category === category &&
          resultStageOf(result) === effectiveStage &&
          result.newResultAwarded
        ) {
          return { ...result, newResultAwarded: false };
        }
        return result;
      });

      onSave(
        { ...snapshot, results: nextResults },
        'New Result Undone',
        `${student?.name || 'Winner'} no longer has the +3 New Result award for ${event.name} ${effectiveStage}.`,
      );
      showToast({ title: 'New Result Undone', description: 'The extra 3 points have been removed.' });
      return;
    }

    if (!winner) {
      showToast({
        title: 'No Winner Yet',
        description: `${effectiveStage === 'finals' ? 'Finals' : 'Qualifying'} needs a finished result before a New Result can be awarded.`,
      });
      return;
    }

    if (!window.confirm(`Award NEW RESULT +3 to ${winner.student.name}?\n\nThis gives +3 championship points to ${winner.student.name} and +3 to ${winner.student.house}.`)) return;

    const nextResults = snapshot.results.map(result => {
      if (
        result.eventId === event.id &&
        result.category === category &&
        result.studentId === winner.student.id &&
        resultStageOf(result) === effectiveStage
      ) {
        return { ...result, newResultAwarded: true };
      }
      return result;
    });

    onSave(
      { ...snapshot, results: nextResults },
      'New Result Awarded',
      `${winner.student.name} receives +3 points and ${winner.student.house} receives +3 for ${event.name} ${effectiveStage}.`,
    );
    showToast({ title: 'New Result Awarded', description: `${winner.student.name}: +3 • ${winner.student.house}: +3` });
  };

  if (!isLoggedIn || !resultsTabOpen || !modalPanel) return null;

  const button = (
    <button
      type="button"
      onClick={toggleAward}
      disabled={!hasAward && !winner}
      title={hasAward ? 'Undo New Result award' : 'Award New Result'}
      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] shadow-lg backdrop-blur-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        hasAward
          ? 'border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15'
          : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
      }`}
    >
      <Icon name={hasAward ? 'undo' : 'add_circle'} size="13" />
      {hasAward ? 'Undo New Result' : 'New Result +3'}
    </button>
  );

  return createPortal(
    <div className="pointer-events-none absolute right-[160px] top-[230px] z-[10001] flex justify-end">
      {button}
    </div>,
    modalPanel,
  );
};

export default NewResultAwardControls;
