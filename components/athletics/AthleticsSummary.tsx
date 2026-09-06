import React from 'react';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../../utils/athleticsCategories';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsSnapshot, AthleticsStudent } from '../../utils/athleticsStorage';
import { useToast } from '../ui/ToastProvider';
import * as XLSX from 'xlsx';
import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

const EXCLUSIVE_EVENT_CATEGORIES: Record<string, AthleticsCategory[]> = {
  '3000m': ['BD Opens'],
  'javelin-throw': ['BD Opens'],
  'triple-jump': ['BD Opens']
};

const houseConfig = (house: string) => {
  const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
  return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const parseTrackTiming = (timing: string) => {
  const parts = timing.trim().split(':').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return Number.POSITIVE_INFINITY;
  return parts[0] * 60 + parts[1] + parts[2] / 1000;
};

const parseFieldDistance = (distance: string) => {
  const value = Number(distance.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

const eventAllowedForCategory = (event: AthleticsEvent, category: AthleticsCategory) => {
  const allowed = EXCLUSIVE_EVENT_CATEGORIES[event.id];
  return !allowed || allowed.includes(category);
};

const resultForStage = (snapshot: AthleticsSnapshot, eventId: string, category: AthleticsCategory, studentId: string, stage: 'qualifying' | 'finals') => {
  return snapshot.results.find(result => result.eventId === eventId && result.category === category && result.studentId === studentId && (result.stage || 'qualifying') === stage);
};

type PodiumEntry = {
  student: AthleticsStudent;
  result: string;
  stage: 'Qualifying' | 'Finals';
};

type EventSummary = {
  event: AthleticsEvent;
  stage: 'Qualifying' | 'Finals';
  podium: Array<PodiumEntry | null>;
};

const buildEventSummary = (category: AthleticsCategory, event: AthleticsEvent, students: AthleticsStudent[], snapshot: AthleticsSnapshot): EventSummary => {
  const categoryStudents = students.filter(student => student.category === category);
  const finalsConfig = snapshot.finals.find(finals => finals.eventId === event.id && finals.category === category);
  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const stage: 'qualifying' | 'finals' = finalsEnabled ? 'finals' : 'qualifying';
  const eligibleIds = new Set(stage === 'finals' ? (finalsConfig?.studentIds || []) : (snapshot.enrollments.find(enrollment => enrollment.eventId === event.id && enrollment.category === category)?.studentIds || []));
  const studentMap = new Map(categoryStudents.map(student => [student.id, student]));

  const candidates = Array.from(eligibleIds)
    .map(id => {
      const student = studentMap.get(id);
      const result = student ? resultForStage(snapshot, event.id, category, id, stage) : undefined;
      if (!student || !result || result.status !== 'finished' || !result.timing) return null;
      return { student, result, performance: event.kind === 'track' ? parseTrackTiming(result.timing) : parseFieldDistance(result.timing) };
    })
    .filter((entry): entry is { student: AthleticsStudent; result: NonNullable<ReturnType<typeof resultForStage>>; performance: number } => Boolean(entry) && Number.isFinite(entry.performance))
    .sort((a, b) => a.performance - b.performance);

  if (event.kind === 'field') candidates.reverse();

  const podium = [0, 1, 2].map(index => {
    const entry = candidates[index];
    return entry ? { student: entry.student, result: entry.result.timing || '—', stage: stage === 'finals' ? 'Finals' : 'Qualifying' } : null;
  });

  return { event, stage: stage === 'finals' ? 'Finals' : 'Qualifying', podium };
};

const buildSummary = (students: AthleticsStudent[], snapshot: AthleticsSnapshot) => {
  return ATHLETICS_CATEGORIES.map(category => ({
    category,
    events: ATHLETICS_EVENTS.filter(event => eventAllowedForCategory(event, category)).map(event => buildEventSummary(category, event, students, snapshot))
  }));
};

const formatDate = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const podiumRankStyle = (rank: number) => rank === 0
  ? 'bg-yellow-400/10 text-yellow-300 border-yellow-300/20'
  : rank === 1
    ? 'bg-slate-300/10 text-slate-200 border-slate-300/20'
    : 'bg-amber-600/10 text-amber-400 border-amber-500/20';

const downloadBlob = (blob: Blob, filename: string, showToast: (args: { title: string; description: string }) => void) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast({ title: 'Download Ready', description: filename });
};

export const AthleticsSummary: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({ students, snapshot }) => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = React.useState<'xlsx' | 'docx' | null>(null);
  const summaries = React.useMemo(() => buildSummary(students, snapshot), [students, snapshot]);
  const podiumCount = React.useMemo(() => summaries.reduce((sum, category) => sum + category.events.filter(event => event.podium.some(Boolean)).length, 0), [summaries]);

  const downloadXlsx = () => {
    try {
      setDownloading('xlsx');
      const rows: Record<string, string | number>[] = [];
      summaries.forEach(category => {
        category.events.forEach(summary => {
          summary.podium.forEach((entry, index) => {
            rows.push({
              Category: category.category,
              Event: summary.event.name,
              Type: summary.event.kind === 'track' ? 'Track' : 'Field',
              Stage: summary.stage,
              Place: `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : 'rd'}`,
              'Comp No': entry?.student.id || '—',
              Athlete: entry?.student.name || 'TBD',
              Class: entry?.student.className || '—',
              House: entry?.student.house || '—',
              Result: entry?.result || '—'
            });
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 9 },
        { wch: 12 }, { wch: 28 }, { wch: 13 }, { wch: 12 }, { wch: 13 }
      ];
      ws['!autofilter'] = { ref: `A1:J${rows.length + 1}` };
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');

      const categoryRows: Record<string, string | number>[] = [];
      summaries.forEach(category => {
        category.events.forEach(summary => {
          categoryRows.push({
            Category: category.category,
            Event: summary.event.name,
            Stage: summary.stage,
            '1st': summary.podium[0]?.student.name || 'TBD',
            '2nd': summary.podium[1]?.student.name || 'TBD',
            '3rd': summary.podium[2]?.student.name || 'TBD'
          });
        });
      });
      const podiumWs = XLSX.utils.json_to_sheet(categoryRows);
      podiumWs['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, podiumWs, 'Podium Overview');

      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Athletics 2026 Full Summary ${new Date().toISOString().slice(0, 10)}.xlsx`, showToast);
    } catch (error) {
      console.error(error);
      showToast({ title: 'Download Failed', description: 'The Athletics .xlsx summary could not be generated.' });
    } finally {
      setDownloading(null);
    }
  };

  const downloadDocx = async () => {
    try {
      setDownloading('docx');
      const children: any[] = [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 150 }, children: [new TextRun({ text: 'ATHLETICS 2026', bold: true, size: 38 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'FULL CHAMPIONSHIP SUMMARY', bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: `Prepared ${formatDate()} • ${summaries.length} categories • ${summaries.reduce((sum, category) => sum + category.events.length, 0)} events`, color: '666666', size: 20 })] })
      ];

      summaries.forEach(category => {
        children.push(new Paragraph({ spacing: { before: 500, after: 120 }, children: [new TextRun({ text: category.category, bold: true, size: 28 })] }));
        children.push(new Paragraph({ spacing: { after: 170 }, children: [new TextRun({ text: `${category.events.length} eligible events`, color: '777777', size: 18 })] }));

        const tableRows = [
          new TableRow({ children: ['Event', '1st', '2nd', '3rd'].map(header => new TableCell({ shading: { fill: 'E9E9E9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })] })) })
        ];

        category.events.forEach(summary => {
          const podiumCells = summary.podium.map(entry => {
            const text = entry ? `${entry.student.name}\n${entry.student.className} • ${entry.student.house}\n${entry.result}` : 'TBD';
            return new TableCell({ children: text.split('\n').map((line, index) => new Paragraph({ children: [new TextRun({ text: line, bold: index === 0, size: index === 0 ? 18 : 15 })] })) });
          });
          tableRows.push(new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${summary.event.name}\n${summary.event.kind === 'track' ? 'Track' : 'Field'} • ${summary.stage}`, bold: true, size: 17 })] })] }),
            ...podiumCells
          ] }));
        });

        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }));
      });

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `Athletics 2026 Full Summary ${new Date().toISOString().slice(0, 10)}.docx`, showToast);
    } catch (error) {
      console.error(error);
      showToast({ title: 'Download Failed', description: 'The Athletics .docx summary could not be generated.' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="royal-kicker mb-1">Championship Ledger</div>
          <h2 className="text-3xl font-black tracking-tight text-white">Athletics 2026 Summary</h2>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-400">A complete podium ledger for every eligible event in every Athletics age category. Finals are shown when allotted, otherwise the qualifying results form the event podium.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={Boolean(downloading)} onClick={downloadXlsx} className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50">
            <Icon name={downloading === 'xlsx' ? 'sync' : 'table_chart'} className={downloading === 'xlsx' ? 'animate-spin' : ''} size="16" /> .xlsx
          </button>
          <button disabled={Boolean(downloading)} onClick={downloadDocx} className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/15 disabled:opacity-50">
            <Icon name={downloading === 'docx' ? 'sync' : 'description'} className={downloading === 'docx' ? 'animate-spin' : ''} size="16" /> .docx
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] px-4 py-3"><div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">Categories</div><div className="mt-1 text-2xl font-black text-white">{summaries.length}</div></div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3"><div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Eligible Events</div><div className="mt-1 text-2xl font-black text-white">{summaries.reduce((sum, category) => sum + category.events.length, 0)}</div></div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3"><div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Podiums Recorded</div><div className="mt-1 text-2xl font-black text-primary">{podiumCount}</div></div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3"><div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Places Per Event</div><div className="mt-1 text-2xl font-black text-white">1st • 2nd • 3rd</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/10 bg-black/15 px-4 py-3">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Podium Key</span>
        {['1st', '2nd', '3rd'].map((label, index) => <span key={label} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${podiumRankStyle(index)}`}><Icon name="emoji_events" size="12" /> {label}</span>)}
        <span className="ml-auto text-[10px] text-slate-500">TBD means no finished result has been recorded yet.</span>
      </div>

      {summaries.map(category => (
        <section key={category.category} className="glass-panel overflow-hidden rounded-[30px] border border-primary/12">
          <div className="flex flex-col gap-3 border-b border-primary/10 bg-[linear-gradient(135deg,rgba(201,163,74,0.10),rgba(255,255,255,0.015))] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><div className="royal-kicker mb-1">Age Category Podiums</div><h3 className="text-2xl font-black tracking-tight text-white">{category.category}</h3></div>
            <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{category.events.length} eligible events</div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-white/[0.025] text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <th className="w-[24%] px-5 py-4 text-left">Event</th>
                  <th className="w-[25%] px-4 py-4 text-left">1st Place</th>
                  <th className="w-[25%] px-4 py-4 text-left">2nd Place</th>
                  <th className="w-[26%] px-4 py-4 text-left">3rd Place</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {category.events.map(summary => (
                  <tr key={summary.event.id} className="hover:bg-white/[0.018] transition-colors">
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <span className={`w-fit rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] ${summary.event.kind === 'track' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-sky-500/25 bg-sky-500/10 text-sky-300'}`}>{summary.event.kind === 'track' ? 'Track' : 'Field'}</span>
                        <span className="text-sm font-black text-white">{summary.event.name}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{summary.stage} podium</span>
                      </div>
                    </td>
                    {summary.podium.map((entry, index) => {
                      const cfg = entry ? houseConfig(entry.student.house) : null;
                      return (
                        <td key={`${summary.event.id}-${index}`} className="px-4 py-4 align-top">
                          {entry ? (
                            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
                              <div className="flex items-start gap-3">
                                <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black ${podiumRankStyle(index)}`}><Icon name="emoji_events" size="14" /></span>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-black text-white">{entry.student.name}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${cfg?.bg}/20 ${cfg?.text} ${cfg?.border}/30`}>{entry.student.house}</span>
                                    <span className="text-[9px] text-slate-500">{entry.student.className}</span>
                                  </div>
                                  <div className="mt-2 font-mono text-xs font-black text-primary">{entry.result}</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/8 bg-black/10 p-3.5 text-sm font-bold text-slate-600">TBD</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </section>
  );
};

export default AthleticsSummary;
