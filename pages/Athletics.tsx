import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
import { useStaffAuth } from '../components/auth/StaffAuthProvider';
import studentClasses from '../utils/studentClasses.json';
import { ATHLETICS_EVENTS, AthleticsSnapshot, getAthleticsSnapshot, getPrepAthleticsStudents, saveAthleticsSnapshot, subscribeToAthleticsData, RELAY_HOUSES } from '../utils/athleticsStorage';
import { subscribeToManagedStudents, syncAug30StudentsToFirestore } from '../utils/studentStorage';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../utils/athleticsCategories';
import AthleticsLeaderboard from '../components/athletics/AthleticsLeaderboard';
import AthleticsSummary from '../components/athletics/AthleticsSummary';
import { AthleticsAnalytics } from '../components/athletics/AthleticsAnalytics';
import AthleticsViewEvents from '../components/athletics/AthleticsViewEvents';
import AthleticsEventManager from '../components/athletics/AthleticsEventManager';
import StudentManager from '../components/student/StudentManager';
import NewResultAwardOverlay from '../components/athletics/NewResultAwardOverlay';

const EXCLUSIVE_EVENT_CATEGORIES: Record<string, AthleticsCategory[]> = { '3000m': ['BD Opens'], '110m-hurdles': ['BD Opens'], 'triple-jump': ['BD Opens'], 'javelin-throw': ['BD Opens'] };
type PageTab = 'view' | 'manage' | 'leaderboard' | 'summary' | 'analytics' | 'points';
type AthleticsDepartmentFilter = 'BD' | 'GD' | 'PD';
const departmentForAthleticsCategory = (category: AthleticsCategory): AthleticsDepartmentFilter => category.startsWith('BD') ? 'BD' : category.startsWith('GD') ? 'GD' : 'PD';

const Athletics: React.FC = () => {
  const { isLoggedIn } = useStaffAuth();
  const [snapshot, setSnapshot] = React.useState<AthleticsSnapshot>(() => getAthleticsSnapshot());
  const [pageTab, setPageTab] = React.useState<PageTab>('view');
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<AthleticsCategory>('PDB Under 11');
  const [selectedDepartment, setSelectedDepartment] = React.useState<AthleticsDepartmentFilter>('PD');
  const departmentCategories = ATHLETICS_CATEGORIES.filter(category => departmentForAthleticsCategory(category) === selectedDepartment);
  const chooseDepartment = (department: AthleticsDepartmentFilter) => { setSelectedDepartment(department); setSelectedCategory(ATHLETICS_CATEGORIES.find(category => departmentForAthleticsCategory(category) === department) as AthleticsCategory); };
  const [students, setStudents] = React.useState(() => getPrepAthleticsStudents(studentClasses as Record<string, string>));

  React.useEffect(() => { setSnapshot(getAthleticsSnapshot()); return subscribeToAthleticsData(setSnapshot); }, []);
  React.useEffect(() => subscribeToManagedStudents(() => {
    setStudents(getPrepAthleticsStudents(studentClasses as Record<string, string>));
  }), []);
  React.useEffect(() => { if (!isLoggedIn && pageTab === 'manage') setPageTab('view'); }, [isLoggedIn, pageTab]);

  React.useEffect(() => {
    if (!isLoggedIn) return;
    void syncAug30StudentsToFirestore().catch((error) => {
      console.error('Unable to sync Aug 30 student additions to Firestore:', error);
    });
  }, [isLoggedIn]);

  const visibleEvents = React.useMemo(() => ATHLETICS_EVENTS.filter(event => { const allowed = EXCLUSIVE_EVENT_CATEGORIES[event.id]; return !allowed || allowed.includes(selectedCategory); }), [selectedCategory]);
  const selectedEvent = React.useMemo(() => ATHLETICS_EVENTS.find(event => event.id === selectedEventId) || null, [selectedEventId]);
  const handleSave = React.useCallback((nextSnapshot: AthleticsSnapshot, _title: string, _description: string) => { setSnapshot(nextSnapshot); void saveAthleticsSnapshot(nextSnapshot); }, []);
  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-12">
      <section className="flex flex-col gap-5 border-b border-primary/10 pb-6 xl:flex-row xl:items-end xl:justify-between"><div><div className="royal-kicker mb-2">Track & Field Desk</div><h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Athletics 2026</h1><p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">Athletics events organised by exact department and age category.</p></div><div className={`rounded-xl border px-4 py-3 text-xs font-black uppercase ${isLoggedIn ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>{isLoggedIn ? 'Staff Editing Active' : 'Read Only Mode'}</div></section>

      <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-primary/10 bg-slate-950/25 p-1.5 shadow-inner shadow-black/10 sm:gap-2 xl:w-auto">
          {([
            { id: 'view', label: 'View Events', icon: 'calendar_month' },
            ...(isLoggedIn ? [{ id: 'manage', label: 'Manage Events', icon: 'settings' }] : []),
            { id: 'leaderboard', label: 'Leaderboard', icon: 'emoji_events' },
            { id: 'summary', label: 'Summary', icon: 'summarize' },
            { id: 'analytics', label: 'Analytics', icon: 'monitoring' },
            { id: 'points', label: 'Points System', icon: 'calculate' },
          ] as { id: PageTab; label: string; icon: string }[]).map(tab => (
            <button key={tab.id} type="button" onClick={() => setPageTab(tab.id)} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all duration-200 sm:px-4 sm:text-[11px] ${pageTab === tab.id ? 'bg-primary text-slate-950 shadow-lg shadow-primary/15' : 'text-slate-400 hover:bg-white/[0.045] hover:text-slate-100'}`}>
              <Icon name={tab.icon} className="text-base" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="hidden text-xs font-medium text-slate-500 sm:block">Scoring updates live.</div>
      </section>

      {pageTab === 'view' && <AthleticsViewEvents students={students} snapshot={snapshot} />}
      {pageTab === 'leaderboard' && <AthleticsLeaderboard students={students} snapshot={snapshot} isLoggedIn={isLoggedIn} />}
      {pageTab === 'summary' && <AthleticsSummary students={students} snapshot={snapshot} />}
      {pageTab === 'analytics' && <AthleticsAnalytics students={students} snapshot={snapshot} />}
      {pageTab === 'points' && <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.08] text-primary"><Icon name="calculate" className="text-2xl" /></div><div><div className="royal-kicker mb-1">Athletics Championship</div><h2 className="text-3xl font-black tracking-tight text-white">Points Permutations</h2><p className="mt-1 text-sm text-slate-400">A breakdown of how individual and house championship points are awarded.</p></div></div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="glass-panel relative overflow-hidden rounded-[28px] border border-primary/15 bg-blue-950/20 p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between"><span className="rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary">Phase 1</span><Icon name="timer" className="text-xl text-primary/20" /></div>
            <h3 className="text-2xl font-black text-white">Qualifying Phase</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">Points earned during department heats and trials.</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4"><div><div className="font-black text-white">Qualified and finished</div><p className="mt-1 text-xs leading-relaxed text-slate-500">A qualifying result marked Qualified earns the qualification point.</p></div><span className="shrink-0 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-300">+1 pt</span></div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4"><div><div className="font-black text-white">Qualifying-only event</div><p className="mt-1 text-xs leading-relaxed text-slate-500">If finals are not enabled, qualified finishers also receive placement points based on their qualifying rank.</p></div><span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300">+ placement</span></div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4"><div><div className="font-black text-white">Progression to finals</div><p className="mt-1 text-xs leading-relaxed text-slate-500">Qualifying placement is replaced by finals placement when finals are enabled. The +1 qualification point remains.</p></div><span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300">No extra pts</span></div>
            </div>
          </div>
          <div className="glass-panel relative overflow-hidden rounded-[28px] border border-primary/15 bg-blue-950/20 p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between"><span className="rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary">Phase 2</span><Icon name="emoji_events" className="text-xl text-primary/20" /></div>
            <h3 className="text-2xl font-black text-white">Finals Phase</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">Placement points are awarded from the finals results when finals are enabled.</p>
            <div className="mt-6 rounded-2xl border border-primary/15 bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-[0.16em] text-amber-400">Positional Score</span><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Individual events</span></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{place:'1st',pts:4},{place:'2nd',pts:3},{place:'3rd',pts:2},{place:'4th',pts:1}].map(item=><div key={item.place} className="rounded-xl border border-white/5 bg-slate-950/25 px-3 py-4 text-center"><div className="text-[10px] font-bold text-slate-500">{item.place}</div><div className="mt-1 text-2xl font-black text-white">+{item.pts}</div></div>)}</div>
              <p className="mt-3 text-center text-xs italic text-slate-500">Ranks beyond 4th receive no placement points.</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4"><div><div className="font-black text-white">New record bonus</div><p className="mt-1 text-xs leading-relaxed text-slate-500">Awarded once per athlete per event, even if a record is broken in both rounds.</p></div><span className="shrink-0 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-black text-amber-300">+3 pts</span></div>
          </div>
        </div>
        <div className="glass-panel rounded-[28px] border border-primary/15 p-6 lg:p-8">
          <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.06] text-primary"><Icon name="groups" className="text-xl" /></div><div><div className="royal-kicker mb-1">House Championship</div><h3 className="text-xl font-black text-white">Relay Points</h3></div></div>
          <p className="mt-2 text-sm text-slate-400">Relays contribute to house standings only, not individual student totals. A finished relay team with four listed students is ranked for its event and category.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[{place:'1st',pts:8},{place:'2nd',pts:6},{place:'3rd',pts:4},{place:'4th',pts:2}].map(item=><div key={item.place} className="rounded-2xl border border-white/5 bg-white/[0.025] p-4 text-center"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.place}</div><div className="mt-1 text-2xl font-black text-primary">+{item.pts}</div><div className="text-[9px] font-bold uppercase text-slate-500">House pts</div></div>)}</div>
          <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm leading-relaxed text-slate-400"><span className="font-bold text-white">Ties:</span> Students with equal championship points share the same position. Relay points do not break individual championship ties. For event rankings, equal recorded performances share a position.</div>
        </div>
        <p className="text-xs text-slate-500">This tab explains the current scoring rules. It does not edit or write to the athletics database.</p>
      </section>}

      {pageTab === 'manage' && <>
        <section className="space-y-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="royal-kicker mb-1">Event Management</div><h2 className="text-2xl font-black text-white">Choose a department & age group</h2></div><StudentManager /></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{([{id:"BD",title:"Boys’ Department",count:4},{id:"GD",title:"Girls’ Department",count:4},{id:"PD",title:"Prep Department",count:4}] as const).map(dept => <button key={dept.id} type="button" onClick={() => chooseDepartment(dept.id)} className={`rounded-2xl border p-4 text-left transition-all ${selectedDepartment===dept.id?"border-primary/40 bg-primary/[0.08] shadow-lg shadow-primary/5":"border-white/10 bg-white/[0.02] hover:border-primary/25"}`}><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Department</span><span className="text-[9px] font-black text-slate-500">{dept.id}</span></div><div className="mt-2 text-base font-black text-white">{dept.title}</div><div className="mt-1 text-xs text-slate-400">{dept.count} age categories</div></button>)}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{departmentCategories.map(category => <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`rounded-xl border px-3 py-3 text-left ${selectedCategory === category ? 'border-primary/50 bg-primary/10 text-white' : 'border-white/10 bg-white/[0.02] text-slate-400'}`}><div className="text-sm font-black">{category}</div><div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{students.filter(student => student.category === category).length} students</div></button>)}</div></section>

        <section className="space-y-4"><div className="flex items-end justify-between"><div><div className="royal-kicker mb-1">{selectedCategory}</div><h2 className="text-2xl font-black text-white">Event Cards</h2></div><div className="text-xs text-slate-400">{visibleEvents.length} events</div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleEvents.map(event => {
          if (event.kind === 'relay') {
            const relayTeams = RELAY_HOUSES.map(house => snapshot.relayTeams.find(team => team.eventId === event.id && team.category === selectedCategory && team.house === house));
            const readyTeams = relayTeams.filter(team => team?.studentIds.length === 4).length;
            const finishedTeams = relayTeams.filter(team => team?.status === 'finished').length;
            return <button key={event.id} type="button" onClick={() => setSelectedEventId(event.id)} className="glass-panel group rounded-2xl border border-primary/10 p-5 text-left transition-all hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[9px] font-black uppercase text-primary">House Relay</span>
                  <h3 className="mt-3 text-xl font-black text-white group-hover:text-primary">{event.name}</h3>
                </div>
                <Icon name="groups" className="text-[27px] text-primary" />
              </div>
              <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Teams Ready</span>
                  <span className="text-lg font-black text-white">{readyTeams}/4</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(readyTeams / 4) * 100}%` }} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider">
                <span className="text-slate-500">{finishedTeams}/4 Results Set</span>
                <span className="text-primary">One Race • Housewise →</span>
              </div>
            </button>;
          }

          const finals = snapshot.finals.find(entry => entry.eventId === event.id && entry.category === selectedCategory);
          const enrollment = snapshot.enrollments.find(entry => entry.eventId === event.id && entry.category === selectedCategory);
          return <button key={event.id} type="button" onClick={() => setSelectedEventId(event.id)} className="glass-panel group rounded-2xl border border-primary/10 p-5 text-left transition-all hover:border-primary/40">
            <div className="flex items-start justify-between gap-3">
              <div><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase ${event.kind==='track'?'border-amber-500/30 bg-amber-500/10 text-amber-300':'border-sky-500/30 bg-sky-500/10 text-sky-300'}`}>{event.kind==='track'?'Track':'Field'}</span><h3 className="mt-3 text-xl font-black text-white group-hover:text-primary">{event.name}</h3></div>
              <Icon name={event.kind==='track'?'directions_run':'sports_handball'} className="text-[27px] text-primary" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><div className="text-[9px] font-black uppercase text-slate-500">Enrolled</div><div className="mt-0.5 text-lg font-black text-white">{enrollment?.studentIds.filter(id => students.some(student => student.id === id && student.category === selectedCategory)).length || 0}</div></div>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><div className="text-[9px] font-black uppercase text-slate-500">Finals</div><div className={`mt-1 text-sm font-black ${finals?.enabled?'text-emerald-300':'text-slate-500'}`}>{finals?.enabled?'Allotted':'Qualifying only'}</div></div>
            </div>
            <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-primary">Open event →</div>
          </button>;
        })}</div></section>

        {selectedEvent && selectedEvent.kind !== 'relay' && <NewResultAwardOverlay event={selectedEvent} category={selectedCategory} students={students} snapshot={snapshot} isLoggedIn={isLoggedIn} onSave={handleSave} />}

        {selectedEvent && typeof document !== 'undefined' && createPortal(<AthleticsEventManager event={selectedEvent} category={selectedCategory} students={students} snapshot={snapshot} isLoggedIn={isLoggedIn} onSave={handleSave} onClose={() => setSelectedEventId(null)} />, document.body)}
      </>}
    </div>
  );
};

export default Athletics;
