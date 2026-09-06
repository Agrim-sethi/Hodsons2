import React from 'react';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS } from '../constants';
import { getEvents, saveEvent, updateEvent, deleteEvent, Event, subscribeToGeneralData } from '../utils/storage';
import { formatEventTime } from '../utils/eventTime';
import { useStaffAuth } from '../components/auth/StaffAuthProvider';
import { useToast } from '../components/ui/ToastProvider';

const HOUSE_BY_CODE: Record<string, { name: string; config: typeof HOUSE_COLORS.vindhya }> = {
  V: { name: 'Vindhya', config: HOUSE_COLORS.vindhya },
  H: { name: 'Himalaya', config: HOUSE_COLORS.himalaya },
  N: { name: 'Nilgiri', config: HOUSE_COLORS.nilgiri },
  S: { name: 'Siwalik', config: HOUSE_COLORS.siwalik },
};

const getHouse = (code: string) => HOUSE_BY_CODE[code] ?? null;

const getTeams = (event: Event) => {
  if (event.participation === 'inter_school') {
    return [event.homeSchool?.trim() || event.title.trim() || 'Sanawar A', event.opponentSchool?.trim() || 'TBD'];
  }
  if (event.participation === 'houses') {
    return (event.houses || []).map((code) => getHouse(code)?.name || code);
  }
  return [];
};

const EventCard: React.FC<{ event: Event; isStaff: boolean; onViewDetails: () => void }> = ({ event, isStaff, onViewDetails }) => {
  const teams = getTeams(event);
  const score = event.result?.trim() || '';

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 border border-primary/10 transition-all group relative overflow-hidden hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="royal-kicker flex items-center gap-1">
            <Icon name={event.sportIcon || 'sports'} className="text-[14px]" />
            {event.sport} • {event.subtext || event.ageCategory || 'Fixture'}
          </span>
          <h3 className="text-white text-lg font-bold leading-tight truncate">{event.title || event.homeSchool || event.sport}</h3>
        </div>
        <div className="px-2 py-1 royal-stat-card rounded text-xs font-medium text-white text-center min-w-[40px]">
          <span className="block text-[10px] text-slate-400 uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
          <span className="block text-sm font-bold">{new Date(event.date).getDate()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between py-4 border-y border-white/5 relative z-10">
        {event.participation === 'inter_school' ? (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex flex-col items-center gap-2 w-[38%]">
              <div className="size-14 rounded-full bg-background-dark p-1 ring-2 ring-primary shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-primary"><Icon name="school" size="24" /></div>
              </div>
              <span className="text-white text-sm font-semibold max-w-[125px] text-center line-clamp-2">{teams[0]}</span>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-2xl font-black text-white tracking-wider">{score || 'VS'}</span>
              <span className="text-xs text-slate-400 font-mono bg-background-dark px-2 py-0.5 rounded">{formatEventTime(event.time)}</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-[38%]">
              <div className="size-14 rounded-full bg-background-dark p-1 ring-2 ring-red-500/50 shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-red-500/20 flex items-center justify-center text-red-400"><Icon name="school" size="24" /></div>
              </div>
              <span className="text-white text-sm font-semibold max-w-[125px] text-center line-clamp-2">{teams[1]}</span>
            </div>
          </div>
        ) : event.participation === 'houses' ? (
          <div className="flex w-full items-center justify-between gap-2">
            {teams.slice(0, 2).map((team, index) => {
              const houseCode = event.houses?.[index];
              const house = houseCode ? getHouse(houseCode) : null;
              return (
                <React.Fragment key={`${team}-${index}`}>
                  {index > 0 && <span className="text-2xl font-black text-white/20">VS</span>}
                  <div className="flex flex-col items-center gap-2 w-[38%]">
                    <div className={`size-14 rounded-full bg-background-dark p-1 ring-2 ${house?.config.border || 'ring-white/20'} shadow-lg flex items-center justify-center`}>
                      <div className={`w-full h-full rounded-full ${house?.config.bg || 'bg-white/10'} flex items-center justify-center text-white font-bold text-xl`}>{houseCode || '?'}</div>
                    </div>
                    <span className="text-white text-sm font-semibold text-center">{team}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full gap-2">
            <div className="flex items-center justify-center gap-4 text-white/50"><Icon name="person" size="30" /><Icon name="person" size="30" /><Icon name="person" size="30" /></div>
            <span className="text-white text-sm font-semibold italic">Individual Event</span>
            {score && <span className="text-xl font-black text-white">{score}</span>}
          </div>
        )}
      </div>

      {score && <div className="relative z-10 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Final Result • {score}</span></div>}

      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Icon name="location_on" className="text-[18px]" />{event.venue}</div>
        <button onClick={onViewDetails} className="w-full royal-secondary-btn text-sm font-medium py-2 rounded-lg">View Details{isStaff && ' • Manage'}</button>
      </div>
    </div>
  );
};

const Events: React.FC = () => {
  const { isLoggedIn } = useStaffAuth();
  const { showToast } = useToast();
  const [events, setEvents] = React.useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [scoreForm, setScoreForm] = React.useState({ score: '', winner: '', comments: '', scorers: '', points: '', mvp: '' });

  const emptyForm = {
    title: '', sport: '', sportIcon: 'sports', subtext: '', ageCategory: '', date: '', time: '', venue: '', teachers: '',
    participation: 'houses' as Event['participation'], houses: [] as string[], homeSchool: '', opponentSchool: '',
  };
  const [form, setForm] = React.useState(emptyForm);

  const loadEvents = React.useCallback(() => {
    setEvents(getEvents().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  }, []);

  React.useEffect(() => {
    loadEvents();
    const unsubscribe = subscribeToGeneralData(() => loadEvents());
    return () => unsubscribe();
  }, [loadEvents]);

  React.useEffect(() => {
    if (selectedEvent) {
      setScoreForm({
        score: selectedEvent.result || '',
        winner: selectedEvent.resultDetails?.winner || '',
        comments: selectedEvent.resultDetails?.comments || '',
        scorers: selectedEvent.resultDetails?.scorers || '',
        points: selectedEvent.resultDetails?.points || '',
        mvp: selectedEvent.resultDetails?.mvp || '',
      });
    }
  }, [selectedEvent]);

  const toggleHouse = (code: string) => {
    setForm((prev) => {
      if (prev.houses.includes(code)) return { ...prev, houses: prev.houses.filter((house) => house !== code) };
      if (prev.houses.length >= 2) return prev;
      return { ...prev, houses: [...prev.houses, code] };
    });
  };

  const resetAndClose = () => {
    setForm(emptyForm);
    setEditingEventId(null);
    setShowAddModal(false);
  };

  const openAddModal = () => {
    setForm(emptyForm);
    setEditingEventId(null);
    setShowAddModal(true);
  };

  const openEditModal = (event: Event) => {
    setForm({
      title: event.title || '', sport: event.sport || '', sportIcon: event.sportIcon || 'sports', subtext: event.subtext || '',
      ageCategory: event.ageCategory || '', date: event.date, time: event.time || '', venue: event.venue || '', teachers: event.teachers || '',
      participation: event.participation, houses: event.houses || [], homeSchool: event.homeSchool || '', opponentSchool: event.opponentSchool || '',
    });
    setEditingEventId(event.id);
    setSelectedEvent(null);
    setShowAddModal(true);
  };

  const buildEvent = (id: string): Event => ({
    id,
    sport: form.sport.trim(),
    sportIcon: form.sportIcon.trim() || 'sports',
    participation: form.participation,
    ageCategory: form.ageCategory.trim() || 'Open',
    time: form.time,
    date: form.date,
    venue: form.venue.trim(),
    teachers: form.teachers.trim(),
    title: form.title.trim() || form.homeSchool.trim(),
    subtext: form.subtext.trim(),
    ...(form.participation === 'houses' ? { houses: form.houses } : {}),
    ...(form.participation === 'inter_school' ? { homeSchool: form.homeSchool.trim(), opponentSchool: form.opponentSchool.trim() || 'TBD' } : {}),
  });

  const handleSaveEvent = () => {
    if (!form.sport.trim() || !form.date || !form.time || !form.venue.trim()) {
      showToast({ title: 'Missing Details', description: 'Sport, date, time and venue are required.' });
      return;
    }
    if (form.participation === 'inter_school' && !form.homeSchool.trim()) {
      showToast({ title: 'Missing Team', description: 'Enter Sanawar\'s team name for an inter-school event.' });
      return;
    }

    if (editingEventId) {
      const existing = events.find((item) => item.id === editingEventId) || getEvents().find((item) => item.id === editingEventId);
      updateEvent({
        ...buildEvent(editingEventId),
        completed: existing?.completed,
        result: existing?.result,
        resultDetails: existing?.resultDetails,
        athleticsDetail: existing?.athleticsDetail,
      });
      showToast({ title: 'Event Updated', description: 'Event details have been updated.' });
    } else {
      const next = buildEvent(`event_${Date.now()}`);
      saveEvent(next);
      showToast({ title: 'Event Added', description: `${next.title || next.sport} has been added.` });
    }
    loadEvents();
    resetAndClose();
  };

  const handleSaveScore = () => {
    if (!selectedEvent || !isLoggedIn) return;
    const score = scoreForm.score.trim();
    if (!score) {
      showToast({ title: 'Score Required', description: 'Enter the final score or result before saving.' });
      return;
    }

    const updated: Event = {
      ...selectedEvent,
      completed: true,
      result: score,
      resultDetails: {
        winner: scoreForm.winner.trim(),
        score,
        points: scoreForm.points.trim(),
        scorers: scoreForm.scorers.trim(),
        mvp: scoreForm.mvp.trim(),
        comments: scoreForm.comments.trim(),
      },
    };

    updateEvent(updated);
    setSelectedEvent(updated);
    loadEvents();
    showToast({ title: 'Result Saved', description: `${updated.title || updated.sport}: ${score}` });
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
    loadEvents();
    setSelectedEvent(null);
    setConfirmDeleteId(null);
    showToast({ title: 'Event Deleted', description: 'The event has been removed.' });
  };

  const upcomingEvents = events.filter((event) => !event.completed);
  const completedEvents = events.filter((event) => event.completed);

  return (
    <div className="max-w-7xl mx-auto w-full py-10 space-y-10">
      <div className="px-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="royal-kicker mb-2">Fixtures Desk</div>
          <h1 className="text-3xl font-bold text-white">Sports Events</h1>
          <p className="royal-subtitle mt-2 max-w-2xl">Upcoming fixtures, completed results, house matchups, and school contests.</p>
        </div>
        {isLoggedIn && <button onClick={openAddModal} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-primary hover:bg-primary/20 transition-all shrink-0"><Icon name="add_circle" size="18" /> Add Event</button>}
      </div>

      {events.length === 0 ? (
        <div className="mx-4 py-20 text-center glass-panel section-plaque rounded-2xl border-2 border-dashed border-primary/10">
          <Icon name="event_busy" className="text-5xl text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Events Found</h3>
          <p className="text-slate-400">Scheduled events will appear here once they are created through staff-managed controls.</p>
        </div>
      ) : (
        <>
          {upcomingEvents.length > 0 && <section><div className="px-4 mb-4 flex items-center gap-3"><span className="royal-kicker">Upcoming</span><span className="text-xs text-slate-500">{upcomingEvents.length} fixture{upcomingEvents.length === 1 ? '' : 's'}</span></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">{upcomingEvents.map((event) => <EventCard key={event.id} event={event} isStaff={isLoggedIn} onViewDetails={() => setSelectedEvent(event)} />)}</div></section>}
          {completedEvents.length > 0 && <section><div className="px-4 mb-4 flex items-center gap-3"><span className="royal-kicker">Completed Results</span><span className="text-xs text-slate-500">{completedEvents.length} result{completedEvents.length === 1 ? '' : 's'}</span></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">{completedEvents.map((event) => <EventCard key={event.id} event={event} isStaff={isLoggedIn} onViewDetails={() => setSelectedEvent(event)} />)}</div></section>}
        </>
      )}

      {selectedEvent && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent shrink-0"><div className="flex items-center gap-3"><div className="p-2 bg-primary/20 rounded-lg text-primary"><Icon name={selectedEvent.sportIcon || 'sports'} size="24" /></div><div><h2 className="text-xl font-bold text-white">{selectedEvent.title || selectedEvent.sport}</h2><p className="text-xs text-slate-500">{selectedEvent.sport} • {selectedEvent.ageCategory}</p></div></div><button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white"><Icon name="close" size="24" /></button></div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {selectedEvent.participation === 'inter_school' && <div className="rounded-xl border border-primary/10 bg-primary/[0.035] p-5"><div className="flex items-center justify-between gap-4"><div className="text-center flex-1"><div className="text-xs uppercase tracking-widest text-slate-500">Home</div><div className="mt-2 text-lg font-black text-white">{getTeams(selectedEvent)[0]}</div></div><div className="text-center px-3"><div className="text-xs text-slate-500 uppercase">{selectedEvent.completed ? 'Final' : 'VS'}</div><div className="text-2xl font-black text-white mt-1">{selectedEvent.result || 'TBD'}</div></div><div className="text-center flex-1"><div className="text-xs uppercase tracking-widest text-slate-500">Away</div><div className="mt-2 text-lg font-black text-white">{getTeams(selectedEvent)[1]}</div></div></div></div>}

          <div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-[10px] uppercase tracking-widest text-slate-500">Date</span><p className="text-white font-medium mt-1">{new Date(selectedEvent.date).toLocaleDateString()}</p></div><div><span className="text-[10px] uppercase tracking-widest text-slate-500">Time</span><p className="text-white font-medium mt-1">{formatEventTime(selectedEvent.time)}</p></div><div><span className="text-[10px] uppercase tracking-widest text-slate-500">Venue</span><p className="text-white font-medium mt-1">{selectedEvent.venue}</p></div><div><span className="text-[10px] uppercase tracking-widest text-slate-500">In-Charge</span><p className="text-white font-medium mt-1">{selectedEvent.teachers || '—'}</p></div></div>

          {isLoggedIn && <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-5 space-y-4"><div><div className="royal-kicker">Staff Only</div><h3 className="text-lg font-black text-white mt-1">Enter Event Result</h3><p className="text-xs text-slate-500 mt-1">Saving a result marks the event as completed and makes it appear in Overview → Recent Results.</p></div><div className="grid grid-cols-2 gap-3"><div className="col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Score / Result</label><input value={scoreForm.score} onChange={(e) => setScoreForm({ ...scoreForm, score: e.target.value })} placeholder="e.g. 3 - 1" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Winner</label><input value={scoreForm.winner} onChange={(e) => setScoreForm({ ...scoreForm, winner: e.target.value })} placeholder="Sanawar A" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">MVP</label><input value={scoreForm.mvp} onChange={(e) => setScoreForm({ ...scoreForm, mvp: e.target.value })} placeholder="Optional" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Points</label><input value={scoreForm.points} onChange={(e) => setScoreForm({ ...scoreForm, points: e.target.value })} placeholder="Optional" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scorers</label><input value={scoreForm.scorers} onChange={(e) => setScoreForm({ ...scoreForm, scorers: e.target.value })} placeholder="Optional" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm" /></div><div className="col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Comments</label><textarea value={scoreForm.comments} onChange={(e) => setScoreForm({ ...scoreForm, comments: e.target.value })} rows={3} placeholder="Optional result notes" className="royal-input w-full mt-1 rounded-xl px-3 py-2.5 text-sm resize-none" /></div></div><button onClick={handleSaveScore} className="w-full rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-background-dark hover:brightness-110">Save Result</button></div>}

          <div className="flex gap-2 pt-2">{isLoggedIn && <><button onClick={() => openEditModal(selectedEvent)} className="flex-1 rounded-xl bg-primary/10 text-primary border border-primary/20 py-3 text-xs font-black uppercase">Edit</button><button onClick={() => setConfirmDeleteId(selectedEvent.id)} className="flex-1 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 py-3 text-xs font-black uppercase">Delete</button></>}<button onClick={() => setSelectedEvent(null)} className="flex-1 rounded-xl bg-white/5 text-white border border-white/10 py-3 text-xs font-black uppercase">Dismiss</button></div>
        </div>
      </div></div>}

      {confirmDeleteId && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="glass-panel w-full max-w-sm rounded-2xl p-6 border border-red-500/20"><h2 className="text-lg font-bold text-white">Delete this event?</h2><p className="text-sm text-slate-400 mt-2">This permanently removes the fixture and its result.</p><div className="grid grid-cols-2 gap-3 mt-6"><button onClick={() => setConfirmDeleteId(null)} className="rounded-xl bg-white/5 text-white py-3 text-xs font-black uppercase">Cancel</button><button onClick={() => handleDeleteEvent(confirmDeleteId)} className="rounded-xl bg-red-500 text-white py-3 text-xs font-black uppercase">Delete</button></div></div></div>}

      {showAddModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[90vh] flex flex-col"><div className="p-6 border-b border-white/5 flex justify-between items-center"><h2 className="text-xl font-bold text-white">{editingEventId ? 'Edit Event' : 'Add Event'}</h2><button onClick={resetAndClose} className="text-slate-400 hover:text-white"><Icon name="close" size="24" /></button></div><div className="p-6 space-y-4 overflow-y-auto">
        <div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Inter-School Football" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Sport</label><input value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} placeholder="Football" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Icon</label><input value={form.sportIcon} onChange={(e) => setForm({ ...form, sportIcon: e.target.value })} placeholder="sports_soccer" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Time</label><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Venue</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Main Ground" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Age Category</label><input value={form.ageCategory} onChange={(e) => setForm({ ...form, ageCategory: e.target.value })} placeholder="U16" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div></div>
        <div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Participation</label><select value={form.participation} onChange={(e) => setForm({ ...form, participation: e.target.value as Event['participation'] })} className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm"><option value="houses">House vs House</option><option value="inter_school">Inter-School</option><option value="individual">Individual</option><option value="whole_school">Whole School</option></select></div>
        {form.participation === 'houses' && <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Houses</label><div className="grid grid-cols-4 gap-2">{Object.entries(HOUSE_BY_CODE).map(([code, house]) => <button type="button" key={code} onClick={() => toggleHouse(code)} className={`rounded-xl border py-3 text-xs font-black ${form.houses.includes(code) ? 'border-primary/40 bg-primary/15 text-primary' : 'border-white/10 bg-white/5 text-slate-400'}`}>{code}<span className="block text-[9px] mt-1">{house.name}</span></button>)}</div></div>}
        {form.participation === 'inter_school' && <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Sanawar Team</label><input value={form.homeSchool} onChange={(e) => setForm({ ...form, homeSchool: e.target.value })} placeholder="Sanawar A" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Opponent</label><input value={form.opponentSchool} onChange={(e) => setForm({ ...form, opponentSchool: e.target.value })} placeholder="TBD" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div></div>}
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Subtext</label><input value={form.subtext} onChange={(e) => setForm({ ...form, subtext: e.target.value })} placeholder="Final" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div><div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">In-Charge</label><input value={form.teachers} onChange={(e) => setForm({ ...form, teachers: e.target.value })} placeholder="Coach" className="royal-input w-full rounded-xl py-2.5 px-3.5 text-sm" /></div></div>
        <button onClick={handleSaveEvent} className="w-full rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-background-dark">{editingEventId ? 'Save Changes' : 'Create Event'}</button>
      </div></div></div>}
    </div>
  );
};

export default Events;
