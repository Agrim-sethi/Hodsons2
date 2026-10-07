import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Bar, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsSnapshot, AthleticsStudent, relayHousePoints, isRelayEvent } from '../../utils/athleticsStorage';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../../utils/athleticsCategories';
import { eventPointBreakdown, rankedEventResults } from '../../utils/athleticsScoring';
import { useToast } from '../ui/ToastProvider';
import { eventPoints as sharedEventPoints, studentPointsAcrossEvents, sortIndividualChampionshipRows, topIndividualChampionshipRows } from '../../utils/athleticsScoring';

const HOUSES = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'] as const;
type Department = 'BD' | 'GD' | 'PD';
type LeaderboardTab = 'house' | 'individual';

const PARADE_THRESHOLD = 3;

const EXCLUSIVE_EVENT_CATEGORIES: Record<string, string[]> = {
  '3000m': ['BD Opens'],
  '110m-hurdles': ['BD Opens'],
  'javelin-throw': ['BD Opens'],
  'triple-jump': ['BD Opens']
};

const houseConfig = (house: string) => {
  const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
  return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const departmentOfCategory = (category: string): Department => {
  if (category.startsWith('BD')) return 'BD';
  if (category.startsWith('GD')) return 'GD';
  return 'PD';
};

const placementPoints = (position?: number) => position === 1 ? 4 : position === 2 ? 3 : position === 3 ? 2 : position === 4 ? 1 : 0;

const eventAllowedForCategory = (event: AthleticsEvent, category: string) => {
  const allowed = EXCLUSIVE_EVENT_CATEGORIES[event.id];
  return !allowed || allowed.includes(category);
};

const eventPoints = (
  snapshot: AthleticsSnapshot,
  student: AthleticsStudent,
  event: AthleticsEvent,
  allStudents: AthleticsStudent[],
) => sharedEventPoints(snapshot, student, event, allStudents);

const relayPointsForDepartment = (snapshot: AthleticsSnapshot, house: typeof HOUSES[number], department?: Department) => {
  if (!department) return relayHousePoints(snapshot, house);
  if (department === 'PD') return relayHousePoints(snapshot, house, 'PDB') + relayHousePoints(snapshot, house, 'PDG');
  return relayHousePoints(snapshot, house, department);
};

const buildHouseRows = (students: AthleticsStudent[], snapshot: AthleticsSnapshot, department?: Department) => HOUSES.map(house => {
  const inScope = students.filter(student => student.house === house && (!department || departmentOfCategory(student.category) === department));
  const individualPoints = inScope.reduce((sum, student) => sum + ATHLETICS_EVENTS.reduce((eventSum, event) => eventSum + eventPoints(snapshot, student, event, students), 0), 0);
  const points = individualPoints + relayPointsForDepartment(snapshot, house, department);
  return { name: house, house, points };
}).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

const buildIndividuals = (students: AthleticsStudent[], snapshot: AthleticsSnapshot) => sortIndividualChampionshipRows(
  snapshot,
  students.map(student => ({ student, points: studentPointsAcrossEvents(snapshot, student, ATHLETICS_EVENTS, students) })).filter(row => row.points > 0),
);

const AthleticsRaceChart: React.FC<{
  title: string;
  subtitle: string;
  data: { name: string; house: string; points: number }[];
  featured?: boolean;
}> = ({ title, subtitle, data, featured = false }) => {
  const chartHeight = featured ? 320 : 220;
  const gradientPrefix = featured ? 'overall' : title.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <div className={`glass-panel royal-chart-panel rounded-[28px] border relative overflow-hidden ${featured ? 'p-7 lg:p-8 border-primary/20 min-h-[525px]' : 'p-5 lg:p-6 border-white/8 min-h-[405px]'}`}>
      <div className="absolute top-0 right-0 p-5 opacity-[0.035] pointer-events-none"><Icon name="bar_chart" className={featured ? 'text-[170px]' : 'text-[120px]'} /></div>
      <div className="relative z-10 flex items-start gap-3 mb-5">
        <div className={`${featured ? 'size-12' : 'size-10'} shrink-0 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary`}><Icon name={featured ? 'leaderboard' : 'account_tree'} size={featured ? '25' : '21'} /></div>
        <div className="min-w-0"><div className="royal-kicker mb-1">{featured ? 'Championship Race' : 'Department Race'}</div><h3 className={`${featured ? 'text-2xl' : 'text-lg'} font-black tracking-tight text-white`}>{title}</h3><p className="text-xs text-slate-400 mt-1">{subtitle}</p></div>
        <div className="ml-auto hidden sm:flex items-center gap-2 rounded-full border border-primary/10 bg-white/[0.025] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{data.reduce((sum, item) => sum + item.points, 0)} total pts</div>
      </div>
      <div className="relative z-10 w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: featured ? 34 : 22, left: 10, bottom: 2 }}>
          <defs>{data.map((entry, index) => <linearGradient key={`${gradientPrefix}-${entry.name}-${index}`} id={`athletics_${gradientPrefix}_${entry.name}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={houseConfig(entry.house).hex} stopOpacity={0.58} /><stop offset="100%" stopColor={houseConfig(entry.house).hex} stopOpacity={1} /></linearGradient>)}</defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal vertical={false} />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: featured ? 12 : 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={featured ? 104 : 82} tick={{ fill: '#fff', fontSize: featured ? 14 : 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'rgba(201,163,74,0.055)' }} contentStyle={{ backgroundColor: 'rgba(10, 20, 34, 0.96)', borderColor: 'rgba(201,163,74,0.28)', color: '#fff7e4', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 14px 32px rgba(0,0,0,0.42)' }} itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }} formatter={(value: number) => [`${value} pts`, 'Points']} />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.18)" />
          <Bar dataKey="points" radius={[0, 8, 8, 0]} barSize={featured ? 29 : 21} animationDuration={1000}>{data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={`url(#athletics_${gradientPrefix}_${entry.name})`} />)}</Bar>
        </BarChart></ResponsiveContainer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Integrity – staff-only deep audit panel
// ─────────────────────────────────────────────────────────────────────────────

type HouseIntegritySummary = {
  house: typeof HOUSES[number];
  leaderboardPts: number;
  auditPts: number;
  match: boolean;
  departments: {
    dept: Department;
    leaderboardPts: number;
    auditPts: number;
    match: boolean;
    categories: {
      category: AthleticsCategory;
      events: {
        event: AthleticsEvent;
        pts: number;
        leaderboardPts: number;
        auditPts: number;
        difference: number;
        contributors: {
          student: AthleticsStudent;
          leaderboardPts: number;
          auditPts: number;
          difference: number;
        }[];
      }[];
      total: number;
      relayPts: number;
    }[];
  }[];
};

const DEPT_LABELS: Record<Department, string> = { BD: "Boys' Department", GD: "Girls' Department", PD: 'Prep Department' };
const DEPT_CATEGORIES: Record<Department, AthleticsCategory[]> = {
  BD: ATHLETICS_CATEGORIES.filter(c => c.startsWith('BD')) as AthleticsCategory[],
  GD: ATHLETICS_CATEGORIES.filter(c => c.startsWith('GD')) as AthleticsCategory[],
  PD: ATHLETICS_CATEGORIES.filter(c => c.startsWith('PD')) as AthleticsCategory[],
};

const buildIntegrityData = (
  students: AthleticsStudent[],
  snapshot: AthleticsSnapshot,
  leaderboardRows: Record<Department, { name: string; house: string; points: number }[]>,
): HouseIntegritySummary[] => {
  return HOUSES.map(house => {
    const deptSummaries = (['BD', 'GD', 'PD'] as Department[]).map(dept => {
      const leaderboardPts = leaderboardRows[dept].find(r => r.house === house)?.points ?? 0;

      const categorySummaries = DEPT_CATEGORIES[dept].map(category => {
        const inScope = students.filter(s => s.house === house && s.category === category);
        const nonRelayEvents = ATHLETICS_EVENTS.filter(e => !isRelayEvent(e) && eventAllowedForCategory(e, category));
        const eventBreakdowns = nonRelayEvents.map(event => {
          const contributors = inScope.map(student => {
            const leaderboardPts = eventPoints(snapshot, student, event, students);
            const auditPts = eventPointBreakdown(snapshot, student, event, category, students).total;
            return {
              student,
              leaderboardPts,
              auditPts,
              difference: auditPts - leaderboardPts,
            };
          });

          const leaderboardEventPts = contributors.reduce((sum, row) => sum + row.leaderboardPts, 0);
          const auditEventPts = contributors.reduce((sum, row) => sum + row.auditPts, 0);

          return {
            event,
            pts: auditEventPts,
            leaderboardPts: leaderboardEventPts,
            auditPts: auditEventPts,
            difference: auditEventPts - leaderboardEventPts,
            contributors: contributors.filter(row => row.difference !== 0),
          };
        }).filter(e => e.pts > 0 || e.leaderboardPts > 0 || e.difference !== 0);
        const individualTotal = eventBreakdowns.reduce((s, e) => s + e.pts, 0);

        // relay points for this category's department bucket
        const relayPts = dept === 'PD'
          ? (relayHousePoints(snapshot, house, 'PDB') + relayHousePoints(snapshot, house, 'PDG'))
          : relayHousePoints(snapshot, house, dept);

        return { category, events: eventBreakdowns, total: individualTotal, relayPts };
      });

      // audit total = sum of all individual event pts across categories + relay pts for dept
      const individualAuditTotal = categorySummaries.reduce((s, c) => s + c.total, 0);
      // relay is counted once per dept, not per category – compute at dept level
      const deptRelayPts = dept === 'PD'
        ? relayHousePoints(snapshot, house, 'PDB') + relayHousePoints(snapshot, house, 'PDG')
        : relayHousePoints(snapshot, house, dept);
      const auditPts = individualAuditTotal + deptRelayPts;

      return {
        dept,
        leaderboardPts,
        auditPts,
        match: leaderboardPts === auditPts,
        categories: categorySummaries,
      };
    });

    const overallLeaderboard = buildHouseRows(students, snapshot).find(r => r.house === house)?.points ?? 0;
    const overallAudit = deptSummaries.reduce((s, d) => s + d.auditPts, 0);

    return {
      house,
      leaderboardPts: overallLeaderboard,
      auditPts: overallAudit,
      match: overallLeaderboard === overallAudit,
      departments: deptSummaries,
    };
  });
};

type EventDiscrepancyRow = {
  house: typeof HOUSES[number];
  dept: Department;
  category: AthleticsCategory;
  event: AthleticsEvent;
  leaderboardPts: number;
  auditPts: number;
  difference: number;
  contributors: {
    student: AthleticsStudent;
    leaderboardPts: number;
    auditPts: number;
    difference: number;
  }[];
};

const buildEventDiscrepancyRows = (data: HouseIntegritySummary[]): EventDiscrepancyRow[] =>
  data.flatMap(house =>
    house.departments.flatMap(dept =>
      dept.categories.flatMap(category =>
        category.events
          .filter(event => event.difference !== 0)
          .map(event => ({
            house: house.house,
            dept: dept.dept,
            category: category.category,
            event: event.event,
            leaderboardPts: event.leaderboardPts,
            auditPts: event.auditPts,
            difference: event.difference,
            contributors: event.contributors,
          })),
      ),
    ),
  );

const ScoringIntegrityPanel: React.FC<{
  students: AthleticsStudent[];
  snapshot: AthleticsSnapshot;
  leaderboardRows: Record<Department, { name: string; house: string; points: number }[]>;
}> = ({ students, snapshot, leaderboardRows }) => {
  const [open, setOpen] = React.useState(false);
  const [selectedHouse, setSelectedHouse] = React.useState<typeof HOUSES[number]>('Vindhya');
  const [selectedDept, setSelectedDept] = React.useState<Department>('BD');

  const data = React.useMemo(
    () => buildIntegrityData(students, snapshot, leaderboardRows),
    [students, snapshot, leaderboardRows],
  );

  const totalMismatches = data.reduce(
    (sum, h) => sum + h.departments.filter(d => !d.match).length,
    0,
  );

  const eventDiscrepancies = React.useMemo(
    () => buildEventDiscrepancyRows(data),
    [data],
  );

  const activeHouse = data.find(h => h.house === selectedHouse)!;
  const activeDept = activeHouse.departments.find(d => d.dept === selectedDept)!;
  const houseCfg = houseConfig(selectedHouse);

  return (
    <section className="overflow-hidden rounded-[24px] border border-rose-400/20 bg-rose-500/[0.03]">
      {/* ── Header / toggle ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/[0.025] sm:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-400">
            <Icon name="verified_user" size="20" />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-rose-400 mb-0.5">Staff Only</div>
            <h3 className="text-base font-black text-white">Scoring Integrity</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              House-wise point totals from the points log — compared against leaderboard values per department.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${totalMismatches ? 'border-rose-400/25 bg-rose-500/10 text-rose-300' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'}`}>
            {totalMismatches ? `${totalMismatches} mismatch${totalMismatches > 1 ? 'es' : ''}` : 'All verified'}
          </span>
          <Icon name={open ? 'expand_less' : 'expand_more'} size="20" />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10">
          {/* ── Quick overview: all houses × all depts ── */}
          <div className="p-4 sm:p-5">
            <p className="mb-4 text-[10px] leading-relaxed text-slate-500">
              Each cell shows <strong className="text-slate-300">Audit pts</strong> (recomputed from the points log, event-by-event) vs{' '}
              <strong className="text-slate-300">Leaderboard pts</strong> (what the bar chart shows). A green cell means they match exactly.
            </p>

            {/* Overview grid */}
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="min-w-[520px] w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2.5 text-left font-black text-slate-500 uppercase tracking-wider text-[9px]">House</th>
                    {(['BD', 'GD', 'PD'] as Department[]).map(dept => (
                      <th key={dept} className="px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-wider text-[9px]">{dept}</th>
                    ))}
                    <th className="px-4 py-2.5 text-center font-black text-slate-500 uppercase tracking-wider text-[9px]">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(h => {
                    const cfg = houseConfig(h.house);
                    return (
                      <tr key={h.house} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedHouse(h.house)}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-all ${selectedHouse === h.house ? 'bg-white/10' : 'hover:bg-white/5'}`}
                          >
                            <span className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.hex }} />
                            <span className={`font-black ${cfg.text}`}>{h.house}</span>
                          </button>
                        </td>
                        {h.departments.map(dept => (
                          <td key={dept.dept} className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => { setSelectedHouse(h.house); setSelectedDept(dept.dept); }}
                              className={`inline-flex flex-col items-center rounded-lg px-2.5 py-1.5 transition-all w-full ${dept.match ? 'bg-emerald-500/10 border border-emerald-400/15 hover:bg-emerald-500/15' : 'bg-rose-500/10 border border-rose-400/20 hover:bg-rose-500/15'}`}
                            >
                              <span className={`text-sm font-black ${dept.match ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {dept.auditPts}
                              </span>
                              <span className="text-[8px] text-slate-500 font-bold">
                                vs {dept.leaderboardPts}
                              </span>
                            </button>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-black ${h.match ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                            {h.match ? <Icon name="check_circle" size="13" /> : <Icon name="error" size="13" />}
                            {h.auditPts}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[9px] font-bold uppercase tracking-wider text-slate-600">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400/50" /> Audit pts = Leaderboard pts</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400/50" /> Mismatch detected</span>
              <span className="text-slate-700">Click a cell to inspect the breakdown</span>
            </div>
          </div>

          {/* ── Exact discrepancy finder: house × category × event ── */}
          <div className="border-t border-white/10 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="royal-kicker mb-1">Exact Discrepancy Finder</div>
                <h4 className="text-base font-black text-white">Leaderboard vs Points Log · Event Level</h4>
                <p className="mt-1 max-w-4xl text-[10px] leading-relaxed text-slate-500">
                  This compares the exact house + age category + event totals produced by the live leaderboard path against the audit-log path.
                  Open a row to see the individual students responsible for any difference.
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${
                eventDiscrepancies.length
                  ? 'border-rose-400/25 bg-rose-500/10 text-rose-300'
                  : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
              }`}>
                {eventDiscrepancies.length ? `${eventDiscrepancies.length} event discrepancy${eventDiscrepancies.length === 1 ? '' : 'ies'}` : 'All event totals match'}
              </span>
            </div>

            {eventDiscrepancies.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-[920px] w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.025] text-[8px] font-black uppercase tracking-wider text-slate-600">
                      <th className="px-3 py-2.5 text-left">House</th>
                      <th className="px-3 py-2.5 text-left">Category</th>
                      <th className="px-3 py-2.5 text-left">Event</th>
                      <th className="px-3 py-2.5 text-right">Leaderboard</th>
                      <th className="px-3 py-2.5 text-right">Audit</th>
                      <th className="px-3 py-2.5 text-right">Δ</th>
                      <th className="px-3 py-2.5 text-left">Cause</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventDiscrepancies.map(row => {
                      const cause =
                        row.event.id === 'high-jump'
                          ? 'High Jump ranking/input context'
                          : 'Scoring-path input mismatch';
                      return (
                        <tr key={`${row.house}|${row.category}|${row.event.id}`} className="border-b border-white/5 last:border-0">
                          <td className="px-3 py-2.5 font-black text-slate-200">{row.house}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-400">{row.category}</td>
                          <td className="px-3 py-2.5 font-bold text-white">{row.event.name}</td>
                          <td className="px-3 py-2.5 text-right font-black text-white">{row.leaderboardPts}</td>
                          <td className="px-3 py-2.5 text-right font-black text-primary">{row.auditPts}</td>
                          <td className={`px-3 py-2.5 text-right font-black ${row.difference > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                            {row.difference > 0 ? '+' : ''}{row.difference}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">
                            <details>
                              <summary className="cursor-pointer font-bold text-slate-300">Inspect · {cause}</summary>
                              <div className="mt-2 space-y-1 rounded-lg border border-white/5 bg-black/10 p-2">
                                {row.contributors.length > 0 ? row.contributors.map(contributor => (
                                  <div key={contributor.student.id} className="flex items-center justify-between gap-3">
                                    <span className="font-bold text-slate-300">{contributor.student.name} <span className="text-slate-600">#{contributor.student.id}</span></span>
                                    <span className="font-mono text-[9px] text-slate-400">
                                      LB {contributor.leaderboardPts} · Log {contributor.auditPts} · Δ {contributor.difference > 0 ? '+' : ''}{contributor.difference}
                                    </span>
                                  </div>
                                )) : (
                                  <span className="text-slate-600">No individual contributor mismatch, inspect the event inputs.</span>
                                )}
                              </div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] px-4 py-3 text-xs text-emerald-200">
                The current leaderboard and audit-log scoring paths produce identical event totals.
              </div>
            )}
          </div>

          {/* ── Drill-down: house × dept breakdown ── */}
          <div className="border-t border-white/10 p-4 sm:p-5 space-y-5">
            {/* House selector */}
            <div className="flex flex-wrap gap-2">
              {HOUSES.map(house => {
                const cfg = houseConfig(house);
                const hd = data.find(h => h.house === house)!;
                const hasMismatch = hd.departments.some(d => !d.match);
                return (
                  <button
                    key={house}
                    type="button"
                    onClick={() => setSelectedHouse(house)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black transition-all ${selectedHouse === house ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'}`}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                    {house}
                    {hasMismatch && <span className="size-1.5 rounded-full bg-rose-400" />}
                  </button>
                );
              })}
            </div>

            {/* Dept selector */}
            <div className="flex gap-2">
              {(['BD', 'GD', 'PD'] as Department[]).map(dept => {
                const deptData = activeHouse.departments.find(d => d.dept === dept)!;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDept(dept)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black transition-all ${selectedDept === dept ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'}`}
                  >
                    {dept}
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${deptData.match ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {deptData.auditPts} pts
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Comparison header card */}
            <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${activeDept.match ? 'border-emerald-400/20 bg-emerald-500/[0.06]' : 'border-rose-400/25 bg-rose-500/[0.06]'}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="size-10 shrink-0 rounded-2xl border" style={{ borderColor: houseCfg.hex + '44', backgroundColor: houseCfg.hex + '18' }}>
                  <div className="w-full h-full flex items-center justify-center font-black text-sm" style={{ color: houseCfg.hex }}>
                    {selectedHouse.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{DEPT_LABELS[selectedDept]}</div>
                  <div className={`font-black text-base ${houseCfg.text}`}>{selectedHouse}</div>
                </div>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <div className="text-center">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Audit (log)</div>
                  <div className={`text-2xl font-black ${activeDept.match ? 'text-emerald-300' : 'text-rose-300'}`}>{activeDept.auditPts}</div>
                </div>
                <div className="text-slate-600 font-black text-lg">vs</div>
                <div className="text-center">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Leaderboard</div>
                  <div className="text-2xl font-black text-white">{activeDept.leaderboardPts}</div>
                </div>
                <div className={`size-9 rounded-xl flex items-center justify-center ${activeDept.match ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                  <Icon name={activeDept.match ? 'check' : 'close'} size="20" />
                </div>
              </div>
            </div>

            {/* Category × event breakdown */}
            <div className="space-y-3">
              {/* Relay row */}
              <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name="groups" size="16" className="text-slate-500" />
                    <span className="text-xs font-black text-slate-300">Relay Events</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600 rounded-full border border-slate-700 px-1.5 py-0.5">House pts</span>
                  </div>
                  <span className="text-xs font-black text-primary">{activeDept.categories[0]?.relayPts ?? 0} pts</span>
                </div>
                <div className="border-t border-white/5 px-4 py-2 text-[10px] text-slate-500">
                  4×100m Relay + 4×400m Relay — points awarded to the house, not individual students.
                </div>
              </div>

              {/* Per-category event breakdown */}
              {activeDept.categories.map(cat => (
                <details key={cat.category} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.015]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="text-xs font-black text-white">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      {cat.events.length === 0 && (
                        <span className="text-[9px] font-bold text-slate-600">No points</span>
                      )}
                      <span className="text-xs font-black text-primary">{cat.total} pts</span>
                      <Icon name="expand_more" size="16" className="text-slate-500" />
                    </div>
                  </summary>

                  <div className="border-t border-white/5">
                    {cat.events.length === 0 ? (
                      <div className="px-4 py-4 text-center text-[10px] text-slate-600">
                        No individual points recorded for {selectedHouse} in this category.
                      </div>
                    ) : (
                      <>
                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_64px] gap-2 border-b border-white/5 px-4 py-2 text-[8px] font-black uppercase tracking-wider text-slate-600">
                          <span>Event</span>
                          <span className="text-right">Pts</span>
                        </div>
                        {cat.events.map(({ event, pts }) => (
                          <div key={event.id} className="grid grid-cols-[1fr_64px] gap-2 border-b border-white/5 px-4 py-2.5 text-[11px] last:border-0">
                            <span className="text-slate-300 font-bold">{event.name}</span>
                            <span className="text-right font-black text-primary">{pts}</span>
                          </div>
                        ))}
                        {/* Category subtotal */}
                        <div className="flex justify-end px-4 py-2.5 border-t border-white/10 text-[10px] font-black text-slate-400">
                          Category total: <span className="ml-2 text-white">{cat.total}</span>
                        </div>
                      </>
                    )}
                  </div>
                </details>
              ))}

              {/* Grand audit total for this dept */}
              <div className="flex items-center justify-between rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Total (Individual + Relay)
                </span>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black ${activeDept.match ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {activeDept.auditPts}
                  </span>
                  <span className="text-slate-600 font-bold text-xs">audit</span>
                  <span className="text-slate-700">/</span>
                  <span className="text-lg font-black text-white">{activeDept.leaderboardPts}</span>
                  <span className="text-slate-600 font-bold text-xs">chart</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

type HighJumpTieIssue = {
  category: AthleticsCategory;
  stage: 'qualifying' | 'finals';
  bestHeight: string;
  students: Array<{ id: string; name: string; house: string; position: number; receivesPlacementPoints: boolean }>;
};

const highJumpTieIssues = (students: AthleticsStudent[], snapshot: AthleticsSnapshot): HighJumpTieIssue[] => {
  const issues: HighJumpTieIssue[] = [];
  const numericHeight = (height: string) => Number(height.replace(',', '.'));

  ATHLETICS_CATEGORIES.forEach(category => {
    (['qualifying', 'finals'] as const).forEach(stage => {
      const source = stage === 'qualifying'
        ? snapshot.enrollments.find(entry => entry.eventId === 'high-jump' && entry.category === category)
        : snapshot.finals.find(entry => entry.eventId === 'high-jump' && entry.category === category);
      const ids = [...new Set(source?.studentIds || [])];
      if (ids.length < 2) return;

      const config = snapshot.highJump?.find(entry => entry.category === category && entry.stage === stage);
      const heights = [...(config?.heights || [])].sort((a, b) => numericHeight(a) - numericHeight(b));

      // IMPORTANT: positions come from the shared scoring/ranking engine.
      // This panel must never maintain a second High Jump ranking algorithm.
      const ranked = rankedEventResults(
        snapshot,
        ATHLETICS_EVENTS.find(event => event.id === 'high-jump')!,
        category,
        students,
        stage,
      );
      const rankedMap = new Map(ranked.map(row => [row.student.id, row.computedPosition]));

      // This panel is specifically for genuinely identical attempt patterns.
      // Countback differences are therefore not flagged as ties at all.
      const summaries = ids.map(studentId => {
        const rows = config?.attempts?.filter(row => row.studentId === studentId) || [];
        let bestHeight = '';
        let bestHeightValue = Number.NEGATIVE_INFINITY;

        heights.forEach(height => {
          const row = rows.find(item => item.height === height);
          if (row?.attempts?.includes('cleared')) {
            const value = numericHeight(height);
            if (value > bestHeightValue) {
              bestHeightValue = value;
              bestHeight = height;
            }
          }
        });

        if (!bestHeight) return null;

        const pattern = heights
          .filter(height => numericHeight(height) <= bestHeightValue)
          .map(height => {
            const row = rows.find(item => item.height === height);
            const attempts = Array.from(
              { length: 3 },
              (_, index) => row?.attempts?.[index] || 'pending',
            ).join(',');
            return height + ':' + attempts;
          })
          .join('|');

        return {
          studentId,
          bestHeight,
          bestHeightValue,
          pattern,
          name: students.find(student => student.id === studentId)?.name || studentId,
        };
      }).filter((row): row is NonNullable<typeof row> => Boolean(row));

      const counts = new Map<string, number>();
      summaries.forEach(row => {
        const key = row.bestHeightValue + '|' + row.pattern;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      const groups = new Map<string, typeof summaries>();
      summaries.forEach(row => {
        const key = row.bestHeightValue + '|' + row.pattern;
        if ((counts.get(key) || 0) < 2) return;
        const list = groups.get(key) || [];
        list.push(row);
        groups.set(key, list);
      });

      groups.forEach(group => {
        if (group.length < 2) return;

        issues.push({
          category,
          stage,
          bestHeight: group[0].bestHeight,
          students: group
            .map(row => ({
              id: row.studentId,
              name: row.name,
              house: students.find(student => student.id === row.studentId)?.house || '',
              // Display the exact same position used everywhere else.
              position: rankedMap.get(row.studentId) || 0,
              receivesPlacementPoints: false,
            }))
            .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
        });
      });
    });
  });

  return issues;
};
const HighJumpTieReviewPanel: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({ students, snapshot }) => {
  const issues = React.useMemo(() => highJumpTieIssues(students, snapshot), [students, snapshot]);
  return (
    <section className="overflow-hidden rounded-[24px] border border-amber-400/20 bg-amber-500/[0.03]">
      <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="height" size="17" className="text-amber-300" />
            <h3 className="text-sm font-black text-white">High Jump Tie Review</h3>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            High Jump positions are always unique. Equal best heights are resolved by failures at the previous bar, then progressively lower bars. Exact matching jump patterns are flagged here.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider ${issues.length ? 'border-amber-400/25 bg-amber-500/10 text-amber-300' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'}`}>
          {issues.length ? `${issues.length} flagged` : 'No flags'}
        </span>
      </div>
      {issues.length > 0 && (
        <div className="space-y-2 border-t border-white/10 p-4 sm:p-5">
          {issues.map((issue, index) => (
            <details key={issue.category + ':' + issue.stage + ':' + issue.bestHeight + ':' + index} className="overflow-hidden rounded-xl border border-amber-400/15 bg-black/10">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-xs font-black text-slate-200">
                <span>{issue.category} · {issue.stage === 'qualifying' ? 'Qualifying' : 'Finals'} · Best {issue.bestHeight}m</span>
                <span className="text-[9px] text-amber-300">{issue.students.length} identical patterns</span>
              </summary>
              <div className="border-t border-white/5 px-4 py-3">
                {issue.students.map(student => (
                  <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2 last:border-0">
                    <div><span className="font-bold text-slate-200">{student.name}</span><span className="ml-2 text-[9px] text-slate-600">#{student.id} · {student.house}</span></div>
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase">
                      <span className="text-slate-500">Position {student.position}</span>
                      {student.position <= 4 && <span className={student.receivesPlacementPoints ? 'text-emerald-300' : 'text-amber-300'}>{student.receivesPlacementPoints ? 'Temporary points winner' : 'Points withheld'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
};

const HousePerformance: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot; isLoggedIn: boolean }> = ({ students, snapshot, isLoggedIn }) => {
  const overall = buildHouseRows(students, snapshot);
  const bd = buildHouseRows(students, snapshot, 'BD');
  const gd = buildHouseRows(students, snapshot, 'GD');
  const pd = buildHouseRows(students, snapshot, 'PD');
  const maxOverall = Math.max(...overall.map(row => row.points), 0);
  const leaderboardRows: Record<Department, { name: string; house: string; points: number }[]> = { BD: bd, GD: gd, PD: pd };
  return (
    <section className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="royal-kicker mb-1">Athletics Championship</div><h2 className="text-3xl font-black text-white tracking-tight">Championship Leaderboards</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">House race across every eligible event, with separate BD, GD, and PD department standings.</p></div><div className="rounded-xl border border-primary/10 bg-primary/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{maxOverall} pts leading house</div></div>
      {isLoggedIn && (
        <>
          <ScoringIntegrityPanel students={students} snapshot={snapshot} leaderboardRows={leaderboardRows} />
          <HighJumpTieReviewPanel students={students} snapshot={snapshot} />
        </>
      )}
      <AthleticsRaceChart title="Overall House Standings" subtitle="Cumulative championship points across all Athletics events" data={overall} featured />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5"><AthleticsRaceChart title="BD Department Standings" subtitle="Boys Department race across eligible categories" data={bd} /><AthleticsRaceChart title="GD Department Standings" subtitle="Girls Department race across eligible categories" data={gd} /><AthleticsRaceChart title="PD Department Standings" subtitle="Prep Department race across PDB + PDG" data={pd} /></div>
    </section>
  );
};

const downloadBlob = (blob: Blob, filename: string, showToast: (args: { title: string; description: string }) => void) => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); showToast({ title: 'Download Ready', description: filename }); };

const IndividualPerformance: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({ students, snapshot }) => {
  const { showToast } = useToast();
  const [search, setSearch] = React.useState('');
  const [paradeHouseFilter, setParadeHouseFilter] = React.useState('All');
  const [paradeCategoryFilter, setParadeCategoryFilter] = React.useState('All');
  const individuals = React.useMemo(() => students.map(student => ({ student, points: studentPointsAcrossEvents(snapshot, student, ATHLETICS_EVENTS) })).filter(row => row.points > 0).sort((a,b) => b.points-a.points || a.student.name.localeCompare(b.student.name)), [students, snapshot]);
  const topByCategory = React.useMemo(() => ATHLETICS_CATEGORIES.map(category => {
    const categoryRows = topIndividualChampionshipRows(snapshot, individuals.filter(row => row.student.category === category));
    return { category, top: categoryRows.slice(0, 3) };
  }), [individuals]);
  const searchResults = React.useMemo(() => { const query=search.trim().toLowerCase(); if(!query)return []; return individuals.filter(row=>row.student.name.toLowerCase().includes(query)||row.student.id.toLowerCase().includes(query)).slice(0,20); }, [individuals,search]);
  const paradeStudents = React.useMemo(() => individuals.filter(row=>row.points>=PARADE_THRESHOLD).filter(row=>paradeHouseFilter==='All'||row.student.house===paradeHouseFilter).filter(row=>paradeCategoryFilter==='All'||row.student.category===paradeCategoryFilter), [individuals,paradeHouseFilter,paradeCategoryFilter]);
  const downloadParadeList = () => { const rows=paradeStudents.map(row=>({'Comp No':row.student.id,Name:row.student.name,Class:row.student.className,House:row.student.house,Category:row.student.category,Points:row.points})); const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows); ws['!cols']=[{wch:10},{wch:28},{wch:10},{wch:12},{wch:16},{wch:8}]; XLSX.utils.book_append_sheet(wb,ws,'Athletic Parade'); const data=XLSX.write(wb,{bookType:'xlsx',type:'array'}); downloadBlob(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`Athletics 2026 Parade List ${new Date().toISOString().slice(0,10)}.xlsx`,showToast); };
  return (
    <section className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="royal-kicker mb-1">Athletics Championship</div><h2 className="text-3xl font-black text-white tracking-tight">Individual Performance</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">Top scorers in every age category, a full points lookup, and the Athletic Parade selection list.</p></div></div>
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 lg:p-6"><div className="flex items-center gap-3 mb-5"><div className="size-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-primary"><Icon name="search" size="21" /></div><div><div className="royal-kicker mb-1">Points Lookup</div><h3 className="text-lg font-black text-white">Search a Student's Points</h3></div></div><div className="relative"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size="18" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or computer number..." className="royal-input w-full rounded-xl py-3 pl-10 pr-4 text-sm" /></div>{search.trim()&&<div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">{searchResults.map(row=>{const cfg=houseConfig(row.student.house);return <div key={`${row.student.id}|${row.student.name}`} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{row.student.name}</div><div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-slate-500"><span className={cfg.text}>{row.student.house}</span><span>•</span><span>{row.student.category}</span></div></div><div className="shrink-0 text-right"><div className="text-lg font-black text-primary">{row.points}</div><div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Pts</div></div></div>})}{searchResults.length===0&&<div className="lg:col-span-2 rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-6 text-center text-sm text-slate-500">No student matches that search, or they haven't scored any points yet.</div>}</div>}</div>
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 lg:p-6"><div className="flex items-center gap-3 mb-5"><div className="size-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-primary"><Icon name="emoji_events" size="21" /></div><div><div className="royal-kicker mb-1">Age Category Race</div><h3 className="text-lg font-black text-white">Top 3 Scorers per Age Category</h3></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{topByCategory.map(({category,top})=><div key={category} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4"><div className="mb-3 text-xs font-black uppercase tracking-wider text-primary">{category}</div><div className="space-y-2">{top.length===0&&<div className="text-[11px] text-slate-500">No scores yet.</div>}{top.map((row,index)=>{const cfg=houseConfig(row.student.house);const rank=top.findIndex(candidate=>candidate.points===row.points)+1;return <div key={`${row.student.id}|${row.student.name}`} className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className={`flex size-5 shrink-0 items-center justify-center rounded text-[9px] font-black ${rank===1?'bg-yellow-400/10 text-yellow-300':rank===2?'bg-slate-300/10 text-slate-200':'bg-amber-600/10 text-amber-400'}`}>{rank}</span><span className="truncate text-xs font-bold text-white" title={row.student.name}>{row.student.name}</span></div><div className="flex shrink-0 items-center gap-2"><span className={`text-[9px] font-bold uppercase ${cfg.text}`}>{row.student.house}</span><span className="text-xs font-black text-primary">{row.points}</span></div></div>})}</div></div>)}</div></div>
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 lg:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5"><div className="flex items-center gap-3"><div className="size-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-primary"><Icon name="military_tech" size="21" /></div><div><div className="royal-kicker mb-1">Selection List</div><h3 className="text-lg font-black text-white">Students Selected for the Athletic Parade</h3></div></div><button onClick={downloadParadeList} disabled={paradeStudents.length===0} className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40"><Icon name="table_chart" size="16" /> Download .xlsx</button></div><p className="mb-4 text-xs text-slate-400">Students who have scored {PARADE_THRESHOLD} or more championship points across all their events.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-5"><select value={paradeHouseFilter} onChange={e=>setParadeHouseFilter(e.target.value)} className="royal-input rounded-xl px-3 py-3 text-sm"><option value="All">All Houses</option>{HOUSES.map(h=><option key={h} value={h}>{h}</option>)}</select><select value={paradeCategoryFilter} onChange={e=>setParadeCategoryFilter(e.target.value)} className="royal-input rounded-xl px-3 py-3 text-sm"><option value="All">All Age Categories</option>{ATHLETICS_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">{paradeStudents.map(row=>{const cfg=houseConfig(row.student.house);return <div key={`${row.student.id}|${row.student.name}`} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{row.student.name}</div><div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-slate-500"><span className={cfg.text}>{row.student.house}</span><span>•</span><span>{row.student.category}</span><span>•</span><span>#{row.student.id}</span></div></div><div className="shrink-0 text-right"><div className="text-lg font-black text-primary">{row.points}</div><div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Pts</div></div></div>})}{paradeStudents.length===0&&<div className="lg:col-span-2 rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center text-sm text-slate-500">No students meet the {PARADE_THRESHOLD}-point parade threshold for this filter yet.</div>}</div></div>
    </section>
  );
};

export const AthleticsLeaderboard: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot; isLoggedIn?: boolean }> = ({students,snapshot,isLoggedIn=false}) => {
  const [tab,setTab]=React.useState<LeaderboardTab>('house');
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1 w-fit">
        <button type="button" onClick={()=>setTab('house')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wider ${tab==='house'?'bg-primary/15 text-primary':'text-slate-400'}`}>House Performance</button>
        <button type="button" onClick={()=>setTab('individual')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wider ${tab==='individual'?'bg-primary/15 text-primary':'text-slate-400'}`}>Individual Performance</button>
      </div>
      {tab==='house'
        ? <HousePerformance students={students} snapshot={snapshot} isLoggedIn={isLoggedIn} />
        : <IndividualPerformance students={students} snapshot={snapshot} />
      }
    </div>
  );
};

export default AthleticsLeaderboard;
