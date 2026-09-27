import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { useToast } from '../ui/ToastProvider';
import { AthleticsCategory } from '../../utils/athleticsCategories';
import { AthleticsEvent, AthleticsSnapshot, AthleticsStage, AthleticsStudent } from '../../utils/athleticsStorage';
import { rankedEventResults } from '../../utils/athleticsScoring';

const resultStageOf = (result: { stage?: AthleticsStage }) => result.stage || 'qualifying';

type Props = {
  event: AthleticsEvent;
  category: AthleticsCategory;
  students: AthleticsStudent[];
  snapshot: AthleticsSnapshot;
  isLoggedIn: boolean;
  onSave: (snapshot: AthleticsSnapshot, title: string, description: string) => void;
};

const getWinner = (
  event: AthleticsEvent,
  category: AthleticsCategory,
  stage: AthleticsStage,
  students: AthleticsStudent[],
  snapshot: AthleticsSnapshot,
) => rankedEventResults(snapshot, event, category, students, stage)[0] || null;

const findResultsRow = () => {
  if (typeof document === 'undefined') return null;
  const modal = document.querySelector<HTMLElement>('[class*="z-[10000]"]');
  if (!modal) return null;
  const heading = Array.from(modal.querySelectorAll('h3')).find(node => {
    const text = node.textContent?.trim() || '';
    return text === 'Qualifying Results' || text === 'Finals Results';
  });
  if (!heading) return null;
  let row: HTMLElement | null = heading.parentElement;
  while (row && row !== modal) {
    if (row.className.includes('xl:flex-row') && row.className.includes('xl:justify-between')) return row;
    row = row.parentElement;
  }
  return heading.parentElement as HTMLElement | null;
};

/**
 * The header row is `<title block> <Auto-Rank button>` laid out with
 * `justify-between`. Rather than absolutely-positioning the New Record
 * button over that row with a guessed pixel offset (which breaks as soon as
 * the button's label changes length, e.g. "New Record" vs "Undo New
 * Record"), we portal it in as a real sibling next to Auto-Rank so it's
 * placed by normal flex layout and can never overlap anything.
 */
const findButtonGroup = (row: HTMLElement | null) => {
  if (!row) return null;
  const autoRankButton = Array.from(row.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === 'Auto-Rank',
  );
  return (autoRankButton?.parentElement as HTMLElement | null) || null;
};

const getActiveStage = (row: HTMLElement | null): AthleticsStage => {
  if (!row) return 'qualifying';
  const heading = row.querySelector('h3')?.textContent?.trim();
  return heading === 'Finals Results' ? 'finals' : 'qualifying';
};

const NewResultAwardOverlay: React.FC<Props> = ({ event, category, students, snapshot, isLoggedIn, onSave }) => {
  const { showToast } = useToast();
  const [buttonGroup, setButtonGroup] = React.useState<HTMLElement | null>(null);
  const [stage, setStage] = React.useState<AthleticsStage>('qualifying');

  React.useEffect(() => {
    let observer: MutationObserver | null = null;
    let interval: number | null = null;

    const refresh = () => {
      const row = findResultsRow();
      setButtonGroup(findButtonGroup(row));
      setStage(getActiveStage(row));
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
  const winnerRecord = winner
    ? snapshot.results.find(result =>
        result.eventId === event.id &&
        result.category === category &&
        result.studentId === winner.student.id &&
        result.newResultAwarded === true
      )
    : undefined;
  const stageRecord = snapshot.results.find(result =>
    result.eventId === event.id &&
    result.category === category &&
    resultStageOf(result) === effectiveStage &&
    result.newResultAwarded === true
  );
  const awardedResult = winnerRecord || stageRecord;
  const awarded = Boolean(awardedResult);

  const toggleRecord = () => {
    if (!isLoggedIn) return;

    if (awarded && awardedResult) {
      const student = students.find(item => item.id === awardedResult.studentId);
      if (!window.confirm(`Undo NEW RECORD for ${student?.name || 'this winner'}?\n\nThis removes the New Record bonus from this athlete.`)) return;

      const nextResults = snapshot.results.map(result => {
        if (
          result.eventId === event.id &&
          result.category === category &&
          result.studentId === awardedResult.studentId
        ) {
          return { ...result, newResultAwarded: false };
        }
        return result;
      });

      onSave({ ...snapshot, results: nextResults }, 'New Record Undone', `${student?.name || 'Winner'} no longer has the New Record award for ${event.name}.`);
      showToast({ title: 'New Record Undone', description: 'The New Record bonus has been removed.' });
      return;
    }

    if (!winner) {
      showToast({ title: 'No Winner Yet', description: `${effectiveStage === 'finals' ? 'Finals' : 'Qualifying'} needs a finished valid winner before a New Record can be awarded.` });
      return;
    }

    if (!window.confirm(`Award NEW RECORD to ${winner.student.name}?\n\nThis gives +3 championship points to ${winner.student.name} and +3 to ${winner.student.house} for this event.`)) return;

    const nextResults = snapshot.results.map(result => {
      if (
        result.eventId === event.id &&
        result.category === category &&
        resultStageOf(result) === effectiveStage
      ) {
        return {
          ...result,
          newResultAwarded: result.studentId === winner.student.id,
        };
      }
      return result;
    });

    onSave({ ...snapshot, results: nextResults }, 'New Record Awarded', `${winner.student.name} receives the +3 New Record bonus for ${event.name} ${effectiveStage}.`);
    showToast({ title: 'New Record Awarded', description: `${winner.student.name}: +3` });
  };

  if (!isLoggedIn || !buttonGroup) return null;

  return createPortal(
    <button
      type="button"
      onClick={toggleRecord}
      disabled={!awarded && !winner}
      title={awarded ? 'Undo New Record' : 'Award New Record'}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition ${awarded ? 'border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15' : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40'}`}
    >
      <Icon name={awarded ? 'undo' : 'add_circle'} size="13" />
      {awarded ? 'Undo New Record' : 'New Record'}
    </button>,
    buttonGroup,
  );
};

export default NewResultAwardOverlay;
