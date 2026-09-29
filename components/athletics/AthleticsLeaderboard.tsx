import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Bar, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsSnapshot, AthleticsStudent, relayHousePoints, isRelayEvent } from '../../utils/athleticsStorage';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../../utils/athleticsCategories';
import { eventPointBreakdown } from '../../utils/athleticsScoring';
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

const eventPoints = (snapshot: AthleticsSnapshot, student: AthleticsStudent, event: AthleticsEvent) =>
  sharedEventPoints(snapshot, student, event);

const relayPointsForDepartment = (snapshot: AthleticsSnapshot, house: typeof HOUSES[number], department?: Department) => {
  if (!department) return relayHousePoints(snapshot, house);
  if (department === 'PD') return relayHousePoints(snapshot, house, 'PDB') + relayHousePoints(snapshot, house, 'PDG');
  return relayHousePoints(snapshot, house, department);
};

const buildHouseRows = (students: AthleticsStudent[], snapshot: AthleticsSnapshot, department?: Department) => HOUSES.map(house => {
  const inScope = students.filter(student => student.house === house && (!department || departmentOfCategory(student.category) === department));
  const individualPoints = inScope.reduce((sum, student) => sum + ATHLETICS_EVENTS.reduce((eventSum, event) => eventSum + eventPoints(snapshot, student, event), 0), 0);
  const points = individualPoints + relayPointsForDepartment(snapshot, house, department);
  return { name: house, house, points };
}).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

const buildIndividuals = (students: AthleticsStudent[], snapshot: AthleticsSnapshot) => sortIndividualChampionshipRows(
  snapshot,
  students.map(student => ({ student, points: studentPointsAcrossEvents(snapshot, student, ATHLETICS_EVENTS) })).filter(row => row.points > 0),
);

const AthleticsRaceChart: React.FC<{
  title: string;
  subtitle: string;
  data: { name: string; house: string; points: number }[];
  featured?: boolean;
  onSelectHouse?: (house: string) => void;
}> = ({ title, subtitle, data, featured = false, onSelectHouse }) => {
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
            <Tooltip cursor={{ fill: 'rgba(201,163,74,0.055)' }} contentStyle={{ backgroundColor: 'rgba(10, 20, 34, 0.96)', borderColor: 'rgba(201,163,74,0.28)', color: '#fff7e4', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 14px 32px rgba(0,0,0,0.42)' }} itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }} formatter={(value: number) => [`${value} pts`, 'Points']} />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.18)" />
            <Bar dataKey="points" radius={[0, 8, 8, 0]} barSize={featured ? 29 : 21} animationDuration={1000} cursor={onSelectHouse ? 'pointer' : 'default'} onClick={(entry: any) => { const house = entry?.house || entry?.payload?.house; if (house) onSelectHouse?.(house); }}>
              {data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={`url(#athletics_${gradientPrefix}_${entry.name})`} onClick={() => onSelectHouse?.(entry.house)} />)}
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
              <button type="button" key={entry.house} onClick={() => onSelectHouse?.(entry.house)} disabled={!onSelectHouse} aria-label={`Open ${entry.house} points validation`} className={`text-left rounded-2xl border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(201,163,74,0.03))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,244,214,0.04)] transition ${onSelectHouse ? 'cursor-pointer hover:border-primary/40 hover:bg-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary' : 'cursor-default'}`}>
                <div className="flex items-center justify-between gap-2"><span className={`truncate text-[8px] font-black uppercase tracking-[0.12em] ${config.text}`}>{entry.house}</span><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: config.hex }} /></div>
                <div className={`mt-1 text-xl font-black ${entry.points > 0 ? 'text-[#f4dfac]' : 'text-slate-500'}`}>{entry.points > 0 ? `+${entry.points}` : entry.points}</div><div className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-primary">View points audit →</div>
                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.04em] leading-tight text-slate-500 break-words">{onSelectHouse ? 'Click to audit points' : 'Championship Pts'}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PointsValidationModal: React.FC<{ house: string; students: AthleticsStudent[]; snapshot: AthleticsSnapshot; onClose: () => void }> = ({ house, students, snapshot, onClose }) => {
  const [category, setCategory] = React.useState<AthleticsCategory>(ATHLETICS_CATEGORIES[0]);
  const [eventId, setEventId] = React.useState(ATHLETICS_EVENTS[0]?.id || '');
  const event = ATHLETICS_EVENTS.find(item => item.id === eventId) || ATHLETICS_EVENTS[0];
  const eligibleStudents = students.filter(student => student.house === house && student.category === category);
  const rows = event && !isRelayEvent(event) ? eligibleStudents.map(student => ({
    student,
    points: eventPointBreakdown(snapshot, student, event, category),
  })).filter(row => row.points.total > 0).sort((a,b) => b.points.total-a.points.total || a.student.name.localeCompare(b.student.name)) : [];
  const displayedTotal = rows.reduce((sum,row)=>sum+row.points.total,0);
  // Mirror the View Events > Points Log participant set and house-total calculation.
  const enrollment = event ? snapshot.enrollments.find(entry => entry.eventId === event.id && entry.category === category) : undefined;
  const finals = event ? snapshot.finals.find(entry => entry.eventId === event.id && entry.category === category) : undefined;
  const resultIds = event ? snapshot.results.filter(item => item.eventId === event.id && item.category === category).map(item => item.studentId) : [];
  const auditIds = [...new Set([...(enrollment?.studentIds || []), ...(finals?.studentIds || []), ...resultIds])];
  const auditTotal = event && !isRelayEvent(event) ? auditIds.reduce((sum,id) => {
    const student = students.find(item => item.id === id);
    return sum + (student && student.house === house ? eventPointBreakdown(snapshot, student, event, category).total : 0);
  },0) : 0;
  const matches = displayedTotal === auditTotal;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 sm:p-6" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={house + ' points validation'} className="glass-panel w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-[28px] border border-primary/25 bg-[#0c1729] shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#0c1729] p-5 sm:p-6">
          <div><div className="royal-kicker mb-1">Scoring integrity check</div><h2 className="text-2xl font-black text-white">{house} Points Breakdown</h2><p className="mt-1 text-xs text-slate-400">Choose an age category and event to inspect individual points and compare with the View Events Points Log.</p></div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">✕</button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-primary">Age category</span><select value={category} onChange={e=>setCategory(e.target.value as AthleticsCategory)} className="royal-input w-full rounded-xl px-3 py-3 text-sm">{ATHLETICS_CATEGORIES.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-primary">Event</span><select value={eventId} onChange={e=>setEventId(e.target.value)} className="royal-input w-full rounded-xl px-3 py-3 text-sm">{ATHLETICS_EVENTS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        <div className="px-5 pb-5 sm:px-6">
          {event && isRelayEvent(event) ? <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-200">Relay points are house/team points and are not included in the individual athlete Points Log comparison.</div> : <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recalculated individual total</div><div className="mt-1 text-2xl font-black text-primary">{displayedTotal} pts</div><div className="mt-1 text-[10px] text-slate-500">{rows.length} scoring student{rows.length===1?'':'s'} • {category} • {event?.name}</div></div>
              <div className={'rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-wider '+(matches?'border-emerald-400/25 bg-emerald-500/10 text-emerald-300':'border-rose-400/25 bg-rose-500/10 text-rose-300')}>{matches?'✓ Matches Points Log':'! Mismatch'}</div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10"><div className="min-w-[600px]">
              <div className="grid grid-cols-[minmax(0,1fr)_70px_repeat(4,70px)] gap-2 bg-white/[0.03] px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500"><span>Student</span><span>House</span><span>Qual.</span><span>Place</span><span>Record</span><span>Total</span></div>
              {rows.length===0?<div className="px-4 py-8 text-center text-sm text-slate-500">No individual points recorded for this house, category and event.</div>:rows.map(({student,points})=><div key={student.id} className="grid grid-cols-[minmax(0,1fr)_70px_repeat(4,70px)] items-center gap-2 border-t border-white/5 px-4 py-3 text-xs"><span className="truncate font-bold text-slate-200">{student.name} <span className="text-slate-600">#{student.id}</span></span><span className="text-slate-400">{student.house}</span><span>{points.qualification}</span><span>{points.placement}</span><span>{points.newRecord}</span><strong className="text-primary">{points.total}</strong></div>)}
            </div></div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Comparison uses the same participant IDs and scoring breakdown as the View Events Points Log, then checks the selected house's summed total. This validates cross-screen consistency, not the underlying scoring formula independently.</p>
          </>}
        </div>
      </section>
    </div>
  );
};

const HousePerformance: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({ students, snapshot }) => {
  const [selectedHouse, setSelectedHouse] = React.useState<string | null>(null);
  const overall = buildHouseRows(students, snapshot);
  const bd = buildHouseRows(students, snapshot, 'BD');
  const gd = buildHouseRows(students, snapshot, 'GD');
  const pd = buildHouseRows(students, snapshot, 'PD');
  const maxOverall = Math.max(...overall.map(row => row.points), 0);

  return (
    <section className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="royal-kicker mb-1">Athletics Championship</div><h2 className="text-3xl font-black text-white tracking-tight">Championship Leaderboards</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">House race across every eligible event, with separate BD, GD, and PD department standings.</p></div><div className="rounded-xl border border-primary/10 bg-primary/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{maxOverall} pts leading house</div></div>
      <AthleticsRaceChart title="Overall House Standings" subtitle="Cumulative championship points across all Athletics events • Click a bar to audit points" data={overall} featured onSelectHouse={setSelectedHouse} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5"><AthleticsRaceChart title="BD Department Standings" subtitle="Boys Department race across eligible categories" data={bd} onSelectHouse={setSelectedHouse} /><AthleticsRaceChart title="GD Department Standings" subtitle="Girls Department race across eligible categories" data={gd} onSelectHouse={setSelectedHouse} /><AthleticsRaceChart title="PD Department Standings" subtitle="Prep Department race across PDB + PDG" data={pd} onSelectHouse={setSelectedHouse} /></div>{selectedHouse && <PointsValidationModal house={selectedHouse} students={students} snapshot={snapshot} onClose={()=>setSelectedHouse(null)} />}
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

export const AthleticsLeaderboard: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({students,snapshot}) => { const [tab,setTab]=React.useState<LeaderboardTab>('house'); return <div className="space-y-6"><div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1 w-fit"><button type="button" onClick={()=>setTab('house')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wider ${tab==='house'?'bg-primary/15 text-primary':'text-slate-400'}`}>House Performance</button><button type="button" onClick={()=>setTab('individual')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wider ${tab==='individual'?'bg-primary/15 text-primary':'text-slate-400'}`}>Individual Performance</button></div>{tab==='house'?<HousePerformance students={students} snapshot={snapshot}/>:<IndividualPerformance students={students} snapshot={snapshot}/>}</div>; };

export default AthleticsLeaderboard;
