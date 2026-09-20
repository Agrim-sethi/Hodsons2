import React from 'react';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../../utils/athleticsCategories';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsSnapshot, AthleticsStudent } from '../../utils/athleticsStorage';
import { useToast } from '../ui/ToastProvider';
import * as XLSX from 'xlsx';
import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { podiumPoints, studentPointsAcrossEvents } from '../../utils/athleticsScoring';

const EXCLUSIVE_EVENT_CATEGORIES: Record<string, AthleticsCategory[]> = {
  '3000m': ['BD Opens'],
  '110m-hurdles': ['BD Opens'],
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
  points: number;
  newResultAwarded?: boolean;
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
    return entry ? {
      student: entry.student,
      result: entry.result.timing || '—',
      stage: stage === 'finals' ? 'Finals' : 'Qualifying',
      points: podiumPoints((index + 1) as 1 | 2 | 3, entry.result.newResultAwarded === true),
      newResultAwarded: entry.result.newResultAwarded === true,
    } : null;
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

const calculateCategoryTopScorers = (
  category: AthleticsCategory,
  categoryEvents: EventSummary[],
  students: AthleticsStudent[],
  snapshot: AthleticsSnapshot,
) => {
  const categoryStudents = students.filter(student => student.category === category);
  const pointsById = categoryStudents.map(student => ({
    student,
    points: studentPointsAcrossEvents(snapshot, student, categoryEvents.map(summary => summary.event)),
  })).filter(row => row.points > 0);

  const topPoints = Math.max(...pointsById.map(row => row.points), 0);
  return pointsById
    .filter(row => row.points === topPoints && topPoints > 0)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
};

export const AthleticsSummary: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({ students, snapshot }) => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = React.useState<'xlsx' | 'docx' | null>(null);
  const summaries = React.useMemo(() => buildSummary(students, snapshot), [students, snapshot]);
  const podiumCount = React.useMemo(() => summaries.reduce((sum, category) => sum + category.events.filter(event => event.podium.some(Boolean)).length, 0), [summaries]);
  
  // Accordion state
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    ATHLETICS_CATEGORIES.forEach((cat, idx) => {
      init[cat] = idx === 0; // Default first category open
    });
    return init;
  });

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    ATHLETICS_CATEGORIES.forEach(cat => { next[cat] = true; });
    setOpenCategories(next);
  };

  const collapseAll = () => {
    setOpenCategories({});
  };

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
              Result: entry?.result || '—',
              Points: entry?.points ?? '—',
              'New Record': entry?.newResultAwarded ? 'Yes' : '—',
            });
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 9 },
        { wch: 12 }, { wch: 28 }, { wch: 13 }, { wch: 12 }, { wch: 13 }, { wch: 15 }
      ];
      ws['!autofilter'] = { ref: `A1:K${rows.length + 1}` };
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');

      const categoryRows: Record<string, string | number>[] = [];
      summaries.forEach(category => {
        category.events.forEach(summary => {
          categoryRows.push({
            Category: category.category,
            Event: summary.event.name,
            Stage: summary.stage,
            '1st': summary.podium[0]?.student.name || 'TBD',
            'New Record': summary.podium[0]?.newResultAwarded ? 'Yes' : '—',
            '2nd': summary.podium[1]?.student.name || 'TBD',
            '3rd': summary.podium[2]?.student.name || 'TBD'
          });
        });
      });
      const podiumWs = XLSX.utils.json_to_sheet(categoryRows);
      podiumWs['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 28 }, { wch: 15 }, { wch: 28 }, { wch: 28 }];
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
        const topScorers = calculateCategoryTopScorers(category.category, category.events, students, snapshot);
        children.push(new Paragraph({ spacing: { before: 500, after: 120 }, children: [new TextRun({ text: category.category, bold: true, size: 28 })] }));
        if (topScorers.length > 0) {
          const scorerText = topScorers.map(row => `${row.student.name} (${row.student.house}) — ${row.points} pts`).join(' • ');
          children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `Top Scorers: ${scorerText}`, italics: true, size: 20, color: 'B45309' })] }));
        }
        children.push(new Paragraph({ spacing: { after: 170 }, children: [new TextRun({ text: `${category.events.length} eligible events`, color: '777777', size: 18 })] }));

        const tableRows = [
          new TableRow({ children: ['Event', '1st', '2nd', '3rd'].map(header => new TableCell({ shading: { fill: 'E9E9E9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })] })) })
        ];

        category.events.forEach(summary => {
          const podiumCells = summary.podium.map(entry => {
            const award = entry?.newResultAwarded ? ' • NEW RECORD' : '';
            const text = entry ? `${entry.student.name}${award}\n${entry.student.className} • ${entry.student.house}\n${entry.result}` : 'TBD';
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
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header bar with actions */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="royal-kicker mb-1">Championship Ledger</div>
          <h2 className="text-3xl font-black tracking-tight text-white">Athletics 2026 Summary</h2>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-400">
            Expand each age category dropdown to view the highest points scorer and 1st, 2nd, and 3rd place event results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 mr-2 border border-white/10 rounded-xl p-1 bg-white/[0.02]">
            <button
              onClick={expandAll}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
            >
              Expand All
            </button>
            <span className="text-white/10">|</span>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
            >
              Collapse All
            </button>
          </div>
          <button
            disabled={Boolean(downloading)}
            onClick={downloadXlsx}
            className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
          >
            <Icon name={downloading === 'xlsx' ? 'sync' : 'table_chart'} className={downloading === 'xlsx' ? 'animate-spin' : ''} size="16" />
            .xlsx
          </button>
          <button
            disabled={Boolean(downloading)}
            onClick={downloadDocx}
            className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-primary hover:bg-primary/15 disabled:opacity-50"
          >
            <Icon name={downloading === 'docx' ? 'sync' : 'description'} className={downloading === 'docx' ? 'animate-spin' : ''} size="16" />
            .docx
          </button>
        </div>
      </div>

      {/* KPI quick metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] px-4 py-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">Categories</div>
          <div className="mt-1 text-2xl font-black text-white">{summaries.length}</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Eligible Events</div>
          <div className="mt-1 text-2xl font-black text-white">{summaries.reduce((sum, category) => sum + category.events.length, 0)}</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Podiums Recorded</div>
          <div className="mt-1 text-2xl font-black text-primary">{podiumCount}</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Places Per Event</div>
          <div className="mt-1 text-2xl font-black text-white">1st • 2nd • 3rd</div>
        </div>
      </div>

      {/* Category Dropdown Accordions */}
      <div className="space-y-3">
        {summaries.map(category => {
          const isOpen = Boolean(openCategories[category.category]);
          const topScorers = calculateCategoryTopScorers(category.category, category.events, students, snapshot);
          const finishedEventsCount = category.events.filter(ev => ev.podium.some(Boolean)).length;

          return (
            <div
              key={category.category}
              className={`glass-panel overflow-hidden rounded-2xl border transition-all duration-200 ${
                isOpen ? 'border-primary/30 bg-white/[0.025] shadow-lg shadow-black/30' : 'border-white/8 bg-white/[0.015] hover:border-white/20'
              }`}
            >
              {/* Dropdown Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.category)}
                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 text-left border-b border-transparent transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={isOpen ? 'expand_less' : 'expand_more'}
                      size="22"
                      className={`transition-transform duration-200 ${isOpen ? 'text-primary' : 'text-slate-400'}`}
                    />
                    <h3 className="text-lg font-black text-white tracking-tight">{category.category}</h3>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-400">
                    {finishedEventsCount}/{category.events.length} Podiums Set
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {topScorers.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs">
                        <Icon name="military_tech" size="16" className="text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-300/80 uppercase tracking-wider">Top Scorers:</span>
                      </div>
                      {topScorers.slice(0, 3).map(row => {
                        const cfg = houseConfig(row.student.house);
                        return (
                          <div key={row.student.id} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs">
                            <span className="font-black text-white">{row.student.name}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cfg.bg}/20 ${cfg.text} border ${cfg.border}/30`}>{row.student.house}</span>
                            <span className="font-mono text-amber-300 font-bold">({row.points} pts)</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium italic">No scores recorded yet</span>
                  )}
                </div>                </div>
              </button>

              {/* Dropdown Body */}
              {isOpen && (
                <div className="border-t border-white/8 p-4 sm:p-5 space-y-4">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[850px] border-collapse">
                      <thead>
                        <tr className="bg-white/[0.025] text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 border-b border-white/5">
                          <th className="w-[25%] px-4 py-3 text-left">Event</th>
                          <th className="w-[25%] px-4 py-3 text-left">1st Place</th>
                          <th className="w-[25%] px-4 py-3 text-left">2nd Place</th>
                          <th className="w-[25%] px-4 py-3 text-left">3rd Place</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {category.events.map(summary => (
                          <tr key={summary.event.id} className="hover:bg-white/[0.015] transition-colors">
                            <td className="px-4 py-3.5 align-top">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                                    summary.event.kind === 'track' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-sky-500/25 bg-sky-500/10 text-sky-300'
                                  }`}>
                                    {summary.event.kind === 'track' ? 'Track' : 'Field'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-500 uppercase">{summary.stage}</span>
                                </div>
                                <span className="text-sm font-black text-white">{summary.event.name}</span>
                              </div>
                            </td>

                            {summary.podium.map((entry, index) => {
                              const cfg = entry ? houseConfig(entry.student.house) : null;
                              return (
                                <td key={`${summary.event.id}-${index}`} className="px-4 py-3.5 align-top">
                                  {entry ? (
                                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                      <div className="flex items-start gap-2.5">
                                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg border text-[9px] font-black ${podiumRankStyle(index)}`}>
                                          {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-xs font-black text-white">{entry.student.name}</div>
                                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[8px] font-black uppercase ${cfg?.bg}/20 ${cfg?.text}`}>
                                              {entry.student.house}
                                            </span>
                                            <span className="text-[9px] text-slate-500">{entry.student.className}</span>
                                          </div>
                                          <div className="mt-1.5 flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold text-amber-300">{entry.result}</span>
                                            <span className="text-[10px] font-black text-primary">{entry.points} pts</span>
                                          </div>
                                          {entry.newResultAwarded && (
                                            <span className="mt-1 inline-flex items-center gap-1 rounded border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-300">
                                              <Icon name="add_circle" size="10" /> Record
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-dashed border-white/5 bg-black/10 p-3 text-xs font-bold text-slate-600">
                                      TBD
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AthleticsSummary;

