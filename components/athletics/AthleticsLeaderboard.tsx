import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Bar, Cell } from 'recharts';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsSnapshot, AthleticsStudent } from '../../utils/athleticsStorage';

const HOUSES = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'] as const;
type Department = 'BD' | 'GD' | 'PD';

const EXCLUSIVE_EVENT_CATEGORIES: Record<string, string[]> = {
  '3000m': ['BD Opens'],
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

const eventPoints = (snapshot: AthleticsSnapshot, student: AthleticsStudent, event: AthleticsEvent) => {
  if (!eventAllowedForCategory(event, student.category)) return 0;
  const qualifying = snapshot.results.find(r => r.eventId === event.id && r.studentId === student.id && (r.stage || 'qualifying') === 'qualifying');
  const finalsConfig = snapshot.finals.find(f => f.eventId === event.id);
  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const finals = finalsEnabled ? snapshot.results.find(r => r.eventId === event.id && r.studentId === student.id && (r.stage || 'qualifying') === 'finals') : undefined;
  let points = qualifying && (qualifying.qualified || qualifying.status === 'finished') ? 1 : 0;
  if (finalsEnabled) {
    if (finals?.status === 'finished') points += placementPoints(finals.position);
  } else if (qualifying?.status === 'finished') {
    points += placementPoints(qualifying.position);
  }
  return points;
};

const buildHouseRows = (students: AthleticsStudent[], snapshot: AthleticsSnapshot, department?: Department) => HOUSES.map(house => {
  const inScope = students.filter(student => student.house === house && (!department || departmentOfCategory(student.category) === department));
  const points = inScope.reduce((sum, student) => sum + ATHLETICS_EVENTS.reduce((eventSum, event) => eventSum + eventPoints(snapshot, student, event), 0), 0);
  return { name: house, house, points };
}).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

const buildIndividuals = (students: AthleticsStudent[], snapshot: AthleticsSnapshot) => students.map(student => ({
  student,
  points: ATHLETICS_EVENTS.reduce((sum, event) => sum + eventPoints(snapshot, student, event), 0)
})).filter(row => row.points > 0).sort((a, b) => b.points - a.points || a.student.name.localeCompare(b.student.name));

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
      <div className="absolute top-0 right-0 p-5 opacity-[0.035] pointer-events-none">
        <Icon name="bar_chart" className={featured ? 'text-[170px]' : 'text-[120px]'} />
      </div>
      <div className="relative z-10 flex items-start gap-3 mb-5">
        <div className={`${featured ? 'size-12' : 'size-10'} shrink-0 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary`}>
          <Icon name={featured ? 'leaderboard' : 'account_tree'} size={featured ? '25' : '21'} />
        </div>
        <div className="min-w-0">
          <div className="royal-kicker mb-1">{featured ? 'Championship Race' : 'Department Race'}</div>
          <h3 className={`${featured ? 'text-2xl' : 'text-lg'} font-black tracking-tight text-white`}>{title}</h3>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 rounded-full border border-primary/10 bg-white/[0.025] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          {data.reduce((sum, item) => sum + item.points, 0)} total pts
        </div>
      </div>
      <div className="relative z-10 w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: featured ? 34 : 22, left: 10, bottom: 2 }}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`${gradientPrefix}-${entry.name}-${index}`} id={`athletics_${gradientPrefix}_${entry.name}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={houseConfig(entry.house).hex} stopOpacity={0.58} />
                  <stop offset="100%" stopColor={houseConfig(entry.house).hex} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal vertical={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: featured ? 12 : 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={featured ? 104 : 82} tick={{ fill: '#fff', fontSize: featured ? 14 : 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(201,163,74,0.055)' }}
              contentStyle={{ backgroundColor: 'rgba(10, 20, 34, 0.96)', borderColor: 'rgba(201,163,74,0.28)', color: '#fff7e4', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 14px 32px rgba(0,0,0,0.42)' }}
              itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
              formatter={(value: number) => [`${value} pts`, 'Points']}
            />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.18)" />
            <Bar dataKey="points" radius={[0, 8, 8, 0]} barSize={featured ? 29 : 21} animationDuration={1000}>
              {data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={`url(#athletics_${gradientPrefix}_${entry.name})`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={`relative z-10 mt-5 border-t border-primary/10 ${featured ? 'pt-5' : 'pt-4'}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/80">Per House Points</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Quick Counter</span>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {data.map(entry => {
            const config = houseConfig(entry.house);
            return (
              <div key={entry.house} className="rounded-2xl border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(201,163,74,0.03))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,244,214,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-[0.19em] ${config.text}`}>{entry.house}</span>
                  <span className="size-2 rounded-full" style={{ backgroundColor: config.hex }} />
                </div>
                <div className={`mt-1 text-xl font-black ${entry.points > 0 ? 'text-[#f4dfac]' : 'text-slate-500'}`}>{entry.points > 0 ? `+${entry.points}` : entry.points}</div>
                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-500">Championship Pts</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AthleticsLeaderboard: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({ students, snapshot }) => {
  const overall = buildHouseRows(students, snapshot);
  const bd = buildHouseRows(students, snapshot, 'BD');
  const gd = buildHouseRows(students, snapshot, 'GD');
  const pd = buildHouseRows(students, snapshot, 'PD');
  const individuals = buildIndividuals(students, snapshot);
  const maxOverall = Math.max(...overall.map(row => row.points), 0);

  return (
    <section className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="royal-kicker mb-1">Athletics Championship</div>
          <h2 className="text-3xl font-black text-white tracking-tight">Championship Leaderboards</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">House race across every eligible event, with separate BD, GD, and PD department standings.</p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-primary/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{maxOverall} pts leading house</div>
      </div>
      <AthleticsRaceChart title="Overall House Standings" subtitle="Cumulative championship points across all Athletics events" data={overall} featured />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <AthleticsRaceChart title="BD Department Standings" subtitle="Boys Department race across eligible categories" data={bd} />
        <AthleticsRaceChart title="GD Department Standings" subtitle="Girls Department race across eligible categories" data={gd} />
        <AthleticsRaceChart title="PD Department Standings" subtitle="Prep Department race across PDB + PDG" data={pd} />
      </div>
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-primary"><Icon name="emoji_events" size="21" /></div>
          <div><div className="royal-kicker mb-1">Individual Race</div><h3 className="text-lg font-black text-white">Top Individual Scorers</h3></div>
          <div className="ml-auto text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 hidden sm:block">Live points</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {individuals.slice(0, 12).map((row, index) => {
            const cfg = houseConfig(row.student.house);
            return (
              <div key={`${row.student.id}|${row.student.name}`} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-3 hover:border-primary/15 hover:bg-primary/[0.025] transition-all">
                <div className="flex min-w-0 items-center gap-3"><span className="w-6 shrink-0 text-xs font-black text-slate-600">{index + 1}</span><div className="min-w-0"><div className="truncate text-sm font-black text-white">{row.student.name}</div><div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-slate-500"><span className={cfg.text}>{row.student.house}</span><span>•</span><span>{row.student.category}</span></div></div></div>
                <div className="shrink-0 text-right"><div className="text-lg font-black text-primary">{row.points}</div><div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Pts</div></div>
              </div>
            );
          })}
          {individuals.length === 0 && <div className="lg:col-span-2 rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center text-sm text-slate-500">No scored athletes yet. Results will populate the championship race automatically.</div>}
        </div>
      </div>
    </section>
  );
};

export default AthleticsLeaderboard;
