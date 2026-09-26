import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
import { useStaffAuth } from '../components/auth/StaffAuthProvider';
import studentClasses from '../utils/studentClasses.json';
import { ATHLETICS_EVENTS, AthleticsSnapshot, getAthleticsSnapshot, getPrepAthleticsStudents, saveAthleticsSnapshot, subscribeToAthleticsData, RELAY_HOUSES } from '../utils/athleticsStorage';
import { syncAug30StudentsToFirestore } from '../utils/studentStorage';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../utils/athleticsCategories';
import AthleticsLeaderboard from '../components/athletics/AthleticsLeaderboard';
import AthleticsSummary from '../components/athletics/AthleticsSummary';
import { AthleticsAnalytics } from '../components/athletics/AthleticsAnalytics';
import AthleticsViewEvents from '../components/athletics/AthleticsViewEvents';
import AthleticsEventManager from '../components/athletics/AthleticsEventManager';
import StudentManager from '../components/student/StudentManager';
import NewResultAwardOverlay from '../components/athletics/NewResultAwardOverlay';

const EXCLUSIVE_EVENT_CATEGORIES: Record<string, AthleticsCategory[]> = { '3000m': ['BD Opens'], '110m-hurdles': ['BD Opens'], 'triple-jump': ['BD Opens'], 'javelin-throw': ['BD Opens'] };
type PageTab = 'view' | 'manage' | 'leaderboard' | 'summary' | 'analytics';

const Athletics: React.FC = () => {
  const { isLoggedIn } = useStaffAuth();
  const [snapshot, setSnapshot] = React.useState<AthleticsSnapshot>(() => getAthleticsSnapshot());
  const [pageTab, setPageTab] = React.useState<PageTab>('view');
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<AthleticsCategory>('PDB Under 11');
  const students = React.useMemo(() => getPrepAthleticsStudents(studentClasses as Record<string, string>), []);

  React.useEffect(() => { setSnapshot(getAthleticsSnapshot()); return subscribeToAthleticsData(setSnapshot); }, []);
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

      <section className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1"><button type="button" onClick={() => setPageTab('view')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase ${pageTab === 'view' ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}>View Events</button>{isLoggedIn && <button type="button" onClick={() => setPageTab('manage')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase ${pageTab === 'manage' ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}>Manage Events</button>}<button type="button" onClick={() => setPageTab('leaderboard')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase ${pageTab === 'leaderboard' ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}>Leaderboard</button><button type="button" onClick={() => setPageTab('summary')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase ${pageTab === 'summary' ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}>Summary</button><button type="button" onClick={() => setPageTab('analytics')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase ${pageTab === 'analytics' ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}>Analytics</button></div><div className="hidden text-xs text-slate-500 sm:block">Scoring updates live.</div></section>

      {pageTab === 'view' && <AthleticsViewEvents students={students} snapshot={snapshot} />}
      {pageTab === 'leaderboard' && <AthleticsLeaderboard students={students} snapshot={snapshot} />}
      {pageTab === 'summary' && <AthleticsSummary students={students} snapshot={snapshot} />}
      {pageTab === 'analytics' && <AthleticsAnalytics students={students} snapshot={snapshot} />}

      {pageTab === 'manage' && <>
        <section className="space-y-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="royal-kicker mb-1">Event Management</div><h2 className="text-2xl font-black text-white">Choose a department & age group</h2></div><StudentManager /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{ATHLETICS_CATEGORIES.map(category => <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`rounded-xl border px-3 py-3 text-left ${selectedCategory === category ? 'border-primary/50 bg-primary/10 text-white' : 'border-white/10 bg-white/[0.02] text-slate-400'}`}><div className="text-sm font-black">{category}</div><div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{students.filter(student => student.category === category).length} students</div></button>)}</div></section>

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
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><div className="text-[9px] font-black uppercase text-slate-500">Enrolled</div><div className="mt-0.5 text-lg font-black text-white">{enrollment?.studentIds.length||0}</div></div>
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
