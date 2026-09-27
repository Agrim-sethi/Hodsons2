import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { PodiumStep } from '../hodsons/shared';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../../utils/athleticsCategories';
import { ATHLETICS_EVENTS, AthleticsEvent, AthleticsHouse, AthleticsResult, AthleticsSnapshot, RELAY_HOUSES, rankedRelayTeams, isRelayEvent } from '../../utils/athleticsStorage';
import { PodiumPlayer } from '../hodsons/types';
import { rankedEventResults, eventPointBreakdown } from '../../utils/athleticsScoring';

type AthleticsStudent = { id: string; name: string; house: AthleticsHouse; category: AthleticsCategory; className: string; };
type Stage = 'qualifying' | 'finals';

const EXCLUSIVE_EVENT_CATEGORIES: Record<string, AthleticsCategory[]> = { '3000m': ['BD Opens'], '110m-hurdles': ['BD Opens'], 'triple-jump': ['BD Opens'], 'javelin-throw': ['BD Opens'] };
const isTrack = (event: AthleticsEvent) => event.kind === 'track';
const displayResult = (_event: AthleticsEvent, result?: AthleticsResult) => (!result || result.status !== 'finished' || !result.timing) ? '—' : result.timing;
const RelayPodiumTile: React.FC<{ house?: AthleticsHouse; position: number; timing?: string; runnerCount: number }> = ({ house, position, timing, runnerCount }) => {
  const config = house ? houseConfig(house) : null;
  const height = position === 1 ? 'min-h-[118px]' : position === 2 ? 'min-h-[104px]' : position === 3 ? 'min-h-[94px]' : 'min-h-[86px]';
  return <div className={'flex flex-col justify-end rounded-xl border px-2.5 py-3 text-center ' + height + ' ' + (house ? 'border-primary/20 bg-primary/[0.05]' : 'border-white/5 bg-black/10')}>
    <div className="text-[9px] font-black uppercase tracking-wider text-slate-600">#{position}</div>
    <div className={'mt-1 text-[10px] font-black uppercase ' + (config?.text || 'text-slate-600')}>{house || 'TBD'}</div>
    <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">{runnerCount}/4 runners</div>
    <div className="mt-1 font-mono text-[10px] font-black text-slate-300">{timing || 'TBD'}</div>
  </div>;
};

const houseConfig = (house: string) => { const key = house.toLowerCase() as keyof typeof HOUSE_COLORS; return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri; };

const AthleticsViewEvents: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot; }> = ({ students, snapshot }) => {
    const [category, setCategory] = React.useState<AthleticsCategory>('PDB Under 11');
    const [selectedEvent, setSelectedEvent] = React.useState<AthleticsEvent | null>(null);
    const [stage, setStage] = React.useState<Stage>('qualifying');
    const [activeTab, setActiveTab] = React.useState<Stage | 'audit'>('qualifying');

    const visibleEvents = React.useMemo(() => ATHLETICS_EVENTS.filter(event => { const allowedCategories = EXCLUSIVE_EVENT_CATEGORIES[event.id]; return !allowedCategories || allowedCategories.includes(category); }), [category]);
    const studentMap = React.useMemo(() => new Map(students.map(student => [student.id, student])), [students]);
    const finalsFor = (eventId: string) => snapshot.finals.find(entry => entry.eventId === eventId && entry.category === category);
    const hasEventRecord = (eventId: string, studentId: string) =>
        snapshot.results.some(result =>
            result.eventId === eventId &&
            result.category === category &&
            result.studentId === studentId &&
            result.newResultAwarded === true
        );

    const rankedResults = React.useCallback((event: AthleticsEvent, requestedStage: Stage) => {
        return rankedEventResults(snapshot, event, category, students, requestedStage);
    }, [snapshot, category, students]);

    const podiumFor = React.useCallback((event: AthleticsEvent) => {
        const finals = finalsFor(event.id);
        const activeStage: Stage = finals?.enabled ? 'finals' : 'qualifying';
        return rankedResults(event, activeStage).slice(0, 3);
    }, [rankedResults, snapshot, category]);

    const openEvent = (event: AthleticsEvent) => { const initial: Stage = finalsFor(event.id)?.enabled ? 'finals' : 'qualifying'; setSelectedEvent(event); setStage(initial); setActiveTab(initial); };
    const selectedFinalsEnabled = selectedEvent ? Boolean(finalsFor(selectedEvent.id)?.enabled) : false;
    const selectedRanked = selectedEvent && !isRelayEvent(selectedEvent) ? rankedResults(selectedEvent, stage) : [];
    const selectedHouseTotals = selectedEvent && !isRelayEvent(selectedEvent) ? (() => {
        const enrollment = snapshot.enrollments.find(entry => entry.eventId === selectedEvent.id && entry.category === category);
        const finals = snapshot.finals.find(entry => entry.eventId === selectedEvent.id && entry.category === category);
        const resultIds = snapshot.results.filter(item => item.eventId === selectedEvent.id && item.category === category).map(item => item.studentId);
        const ids = [...new Set([...(enrollment?.studentIds || []), ...(finals?.studentIds || []), ...resultIds])];
        const totals = {} as Record<AthleticsHouse, { qualification: number; placement: number; newRecord: number; total: number }>;
        RELAY_HOUSES.forEach(house => { totals[house] = { qualification: 0, placement: 0, newRecord: 0, total: 0 }; });
        ids.forEach(id => { const student = studentMap.get(id); if (!student) return; const points = eventPointBreakdown(snapshot, student, selectedEvent); const total = totals[student.house]; total.qualification += points.qualification; total.placement += points.placement; total.newRecord += points.newRecord; total.total += points.total; });
        return totals;
    })() : {};
    const selectedRelayTeams = selectedEvent && isRelayEvent(selectedEvent)
        ? RELAY_HOUSES.map(house => snapshot.relayTeams.find(team => team.eventId === selectedEvent.id && team.category === category && team.house === house))
        : [];
    const selectedRelayRanked = selectedEvent && isRelayEvent(selectedEvent)
        ? rankedRelayTeams(snapshot, selectedEvent.id, category)
        : [];
    const selectedRelayPositions = new Map(selectedRelayRanked.map(team => [team.house, team.computedPosition]));

    const makePlayer = (entry: ReturnType<typeof rankedResults>[number] | undefined): PodiumPlayer | null => {
        if (!entry) return null;
        return { id: entry.student.id, name: entry.student.name, house: entry.student.house, position: entry.computedPosition, rank: entry.computedPosition, timing: entry.result.timing };
    };

    const modal = selectedEvent ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5">
          <div className="relative flex max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-[0_30px_100px_rgba(0,0,0,0.72)]">
            <div className="shrink-0 border-b border-primary/15 bg-[#0b121e] px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-4">
                <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary sm:flex"><Icon name={selectedEvent.kind === 'relay' ? 'groups' : isTrack(selectedEvent) ? 'directions_run' : 'sports_handball'} size="23" /></div>
                <div className="min-w-0 flex-1"><div className="royal-kicker mb-1">{category} • Athletics 2026</div><h2 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{selectedEvent.name}</h2><p className="mt-1 text-xs text-slate-400 sm:text-sm">{isRelayEvent(selectedEvent) ? 'House relay results' : 'Published results'}</p></div>
                <button onClick={() => setSelectedEvent(null)} className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 hover:border-primary/30 hover:text-white"><Icon name="close" size="22" /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 custom-scrollbar sm:p-6">
              {isRelayEvent(selectedEvent) ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] px-4 py-3"><div><div className="royal-kicker mb-1">House Relay</div><div className="text-xs text-slate-400">One round • 4 houses • 8 / 6 / 4 / 2 points</div></div><div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{selectedRelayTeams.filter(team => team?.status === 'finished').length}/4 finished • {selectedRelayTeams.filter(team => team?.status === 'dnf').length} DNF</div></div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {selectedRelayTeams.map((team, index) => {
                      const house = RELAY_HOUSES[index];
                      const config = houseConfig(house);
                      const finished = team?.status === 'finished';
                      return <div key={house} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between gap-3"><div><div className={'text-xs font-black uppercase ' + config.text}>{house}</div><div className="mt-1 text-[9px] text-slate-500">{team?.studentIds.length || 0}/4 runners</div></div><span className={'rounded-full border px-2 py-1 text-[8px] font-black uppercase ' + (finished ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : team?.status === 'dnf' ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/[0.03] text-slate-500')}>{finished ? 'Finished' : team?.status === 'dnf' ? 'DNF' : 'Pending'}</span></div>
                        <div className="mt-3 flex flex-wrap gap-1.5">{(team?.studentIds || []).map(id => <span key={id} className="rounded-md border border-white/10 bg-black/10 px-2 py-1 text-[9px] font-bold text-slate-300">{studentMap.get(id)?.name || id}</span>)}</div>
                        <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/5 bg-black/10 p-2"><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">Time</div><div className="mt-1 font-mono text-xs font-black text-slate-200">{finished ? team?.timing : '—'}</div></div><div className="rounded-lg border border-white/5 bg-black/10 p-2"><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">Place</div><div className="mt-1 text-xs font-black text-primary">{selectedRelayPositions.get(house) ? '#' + selectedRelayPositions.get(house) : '—'}</div></div></div>
                      </div>;
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1"><button onClick={() => { setStage('qualifying'); setActiveTab('qualifying'); }} className={'rounded-lg px-4 py-2 text-xs font-black uppercase ' + (activeTab === 'qualifying' ? 'bg-primary/15 text-primary' : 'text-slate-400')}>Qualifying</button>{selectedFinalsEnabled && <button onClick={() => { setStage('finals'); setActiveTab('finals'); }} className={'rounded-lg px-4 py-2 text-xs font-black uppercase ' + (activeTab === 'finals' ? 'bg-primary/15 text-primary' : 'text-slate-400')}>Finals</button>}<button onClick={() => setActiveTab('audit')} className={'rounded-lg px-4 py-2 text-xs font-black uppercase ' + (activeTab === 'audit' ? 'bg-primary/15 text-primary' : 'text-slate-400')}>Points Audit</button></div>{activeTab !== 'audit' && <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{selectedRanked.length} finished result{selectedRanked.length === 1 ? '' : 's'}</div></div>}
                  {activeTab !== 'audit' && <div className="overflow-hidden rounded-2xl border border-white/10"><div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><span>Competitor</span><span>{isTrack(selectedEvent) ? 'Time' : 'Distance'}</span><span>Position</span></div>{selectedRanked.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No completed results have been published yet.</div> : selectedRanked.map(({student,result,computedPosition}) => { const config=houseConfig(student.house); return <div key={stage + ':' + student.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"><div className="min-w-0"><div className="truncate font-black text-white">{student.name}</div><div className="mt-0.5 text-[10px] text-slate-500">#{student.id} • Class {student.className}</div><span className={'mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ' + config.bg + '/20 ' + config.text + ' ' + config.border + '/30'}>{student.house}</span>{computedPosition===1 && hasEventRecord(selectedEvent.id, student.id) && <span className="ml-2 mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300"><Icon name="verified" size="11" /> New Record</span>}</div><div className="font-mono text-sm font-black text-slate-200">{displayResult(selectedEvent,result)}</div><div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">#{computedPosition}</div></div>; })}</div>}
                  {activeTab === 'audit' &&                   <section className="overflow-hidden rounded-2xl border border-white/10">
                    <div className="border-b border-white/10 bg-white/[0.025] px-4 py-3"><h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">Central event points log</h3><p className="mt-1 text-[10px] text-slate-500">Unified qualifying + finals tally. Qualification: +1; placement: scored round only; new record: +3 once per athlete/event.</p></div>
                    <div className="grid grid-cols-[1fr_repeat(4,auto)] gap-3 border-b border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500"><span>House</span><span>Qual.</span><span>Place</span><span>Record</span><span>Total</span></div>
                    {RELAY_HOUSES.map(house => {
                      const total = selectedHouseTotals[house] || { qualification: 0, placement: 0, newRecord: 0, total: 0 };
                      const config = houseConfig(house);
                      return <div key={'house-audit:'+house} className="grid grid-cols-[1fr_repeat(4,auto)] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
                        <span className={'text-xs font-black uppercase '+config.text}>{house}</span>
                        <span className="text-xs tabular-nums text-slate-300">{total.qualification}</span>
                        <span className="text-xs tabular-nums text-slate-300">{total.placement}</span>
                        <span className="text-xs tabular-nums text-slate-300">{total.newRecord}</span>
                        <span className="text-xs font-black tabular-nums text-primary">{total.total}</span>
                      </div>;
                    })}
                  </section>}
                </div>
              )}
            </div>
          </div>
        </div>
    ) : null;

    return <><section className="space-y-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="royal-kicker mb-1">Age Category Results</div><h2 className="text-2xl font-black text-white">Athletics Event Results</h2><p className="mt-1 text-sm text-slate-400">Published results for every event, organised by department and age category.</p></div><div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{visibleEvents.length} events</div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{ATHLETICS_CATEGORIES.map(item=><button key={item} onClick={()=>setCategory(item)} className={`rounded-xl border px-3 py-3 text-left ${category===item?'border-primary/50 bg-primary/10 text-white':'border-white/10 bg-white/[0.02] text-slate-400'}`}><div className="text-sm font-black">{item}</div><div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{students.filter(student=>student.category===item).length} students</div></button>)}</div></section><section className="space-y-4"><div className="flex items-end justify-between gap-3"><div><div className="royal-kicker mb-1">{category}</div><h2 className="text-2xl font-black text-white">Event Results</h2></div><div className="text-xs text-slate-400">Click a card for full results</div></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleEvents.map(event=>{
  if (isRelayEvent(event)) {
    const rankedTeams = rankedRelayTeams(snapshot, event.id, category);
    const byPosition = new Map(rankedTeams.map(team => [team.computedPosition, team]));
    return <button key={event.id} onClick={() => openEvent(event)} className="glass-panel group rounded-2xl border border-primary/10 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[9px] font-black uppercase text-primary">House Relay</span><h3 className="mt-3 text-xl font-black text-white group-hover:text-primary">{event.name}</h3></div><Icon name="groups" className="text-[27px] text-primary" /></div>
      <div className="mt-5 grid grid-cols-2 gap-1 border-t border-white/5 pt-4 sm:grid-cols-4">{[1,2,3,4].map(position => { const team=byPosition.get(position); return <RelayPodiumTile key={position} house={team?.house} position={position} timing={team?.timing} runnerCount={team?.studentIds.length || 0} />; })}</div>
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">4-house podium</span><span className="text-[10px] font-black uppercase tracking-wider text-primary">View race →</span></div>
    </button>;
  }
  const podium=podiumFor(event); const p1=podium[0]; const p2=podium[1]; const p3=podium[2];
  return <button key={event.id} onClick={() => openEvent(event)} className="glass-panel group rounded-2xl border border-primary/10 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-start justify-between gap-3"><div><span className={'inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + (isTrack(event)?'border-amber-500/30 bg-amber-500/10 text-amber-300':'border-sky-500/30 bg-sky-500/10 text-sky-300')}>{isTrack(event)?'Track':'Field'}</span><h3 className="mt-3 text-xl font-black text-white group-hover:text-primary">{event.name}</h3></div><Icon name={isTrack(event)?'directions_run':'sports_handball'} className="text-[27px] text-primary" /></div><div className="mt-5 grid grid-cols-3 items-end gap-1 border-t border-white/5 pt-4"><PodiumStep player={makePlayer(p2)} rank={2} /><PodiumStep player={makePlayer(p1)} rank={1} /><PodiumStep player={makePlayer(p3)} rank={3} /></div>{p1 && hasEventRecord(event.id, p1.student.id)&&<div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-emerald-300"><Icon name="verified" size="13" /> New Record</div>}<div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Published podium</span><span className="text-[10px] font-black uppercase tracking-wider text-primary">View results →</span></div></button>;
})}</div></section>{selectedEvent&&typeof document!=='undefined'?createPortal(modal,document.body):null}</>;
};

export default AthleticsViewEvents;
