import React from 'react';
import { Icon } from '../components/Icon';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import { useStaffAuth } from '../components/auth/StaffAuthProvider';
import studentClasses from '../utils/studentClasses.json';
import {
  ATHLETICS_EVENTS,
  AthleticsEvent,
  AthleticsResult,
  AthleticsResultStatus,
  AthleticsSnapshot,
  getAthleticsSnapshot,
  getPrepAthleticsStudents,
  saveAthleticsSnapshot,
  subscribeToAthleticsData,
} from '../utils/athleticsStorage';

const HOUSES = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'] as const;
const CATEGORIES = [
  'PD U11', 'PD U12',
  'GD U13', 'GD U14', 'GD U16', 'GD Opens',
  'BD U13', 'BD U14', 'BD U16', 'BD Opens'
] as const;

type Category = typeof CATEGORIES[number];
const TRACK_EVENTS = new Set(['100m', '200m', '400m', '800m', '1500m', '3000m']);
const FIELD_EVENTS = new Set(['long-jump', 'high-jump', 'shot-put', 'discus-throw', 'javelin-throw', 'triple-jump']);
const RESULT_STATUSES: AthleticsResultStatus[] = ['pending', 'finished', 'dnf', 'absent', 'medically_excused'];

const categoryMatches = (studentCategory: string, category: Category) => {
  if (category.startsWith('PD ')) {
    const age = category.slice(3);
    return studentCategory === `PDB Under ${age === 'U11' ? '11' : '12'}` || studentCategory === `PDG Under ${age === 'U11' ? '11' : '12'}`;
  }
  const [dept, age] = category.split(' ');
  const ageValue = age === 'Opens' ? 'Opens' : `Under ${age.slice(1)}`;
  return studentCategory === `${dept} ${ageValue}`;
};

const categoryShort = (studentCategory: string) => {
  if (studentCategory.startsWith('PDB Under 11') || studentCategory.startsWith('PDG Under 11')) return 'PD U11';
  if (studentCategory.startsWith('PDB Under 12') || studentCategory.startsWith('PDG Under 12')) return 'PD U12';
  return studentCategory.replace(' Under ', ' U').replace('BD Opens', 'BD Opens').replace('GD Opens', 'GD Opens');
};

const statusLabel = (status: AthleticsResultStatus) => ({
  pending: 'Pending', finished: 'Finished', dnf: 'DNF', absent: 'Absent', medically_excused: 'Medical Leave'
}[status]);

const statusStyle = (status: AthleticsResultStatus) => ({
  finished: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  dnf: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  absent: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  medically_excused: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  pending: 'border-slate-500/20 bg-slate-500/10 text-slate-300'
}[status]);

const houseBadge = (house: string) => {
  const styles: Record<string, string> = {
    Vindhya: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    Himalaya: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    Nilgiri: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    Siwalik: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  };
  return styles[house] || 'border-white/10 bg-white/5 text-slate-300';
};

const parseTrack = (value = '') => {
  const parts = value.trim().split(':').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return Number.POSITIVE_INFINITY;
  return parts[0] * 60 + parts[1] + parts[2] / 1000;
};

const parseField = (value = '') => {
  const n = Number(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
};

const Athletics: React.FC = () => {
  const { showToast } = useToast();
  const { isLoggedIn } = useStaffAuth();
  const [snapshot, setSnapshot] = React.useState<AthleticsSnapshot>(() => getAthleticsSnapshot());
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<Category>('PD U11');
  const [search, setSearch] = React.useState('');
  const [houseFilter, setHouseFilter] = React.useState('All');
  const [savedStudent, setSavedStudent] = React.useState<string | null>(null);

  const students = React.useMemo(() => getPrepAthleticsStudents(studentClasses as Record<string, string>), []);
  const studentMap = React.useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  React.useEffect(() => {
    setSnapshot(getAthleticsSnapshot());
    return subscribeToAthleticsData(setSnapshot);
  }, []);

  const selectedEvent = ATHLETICS_EVENTS.find(e => e.id === selectedEventId) || null;
  const selectedEnrollment = selectedEvent ? snapshot.enrollments.find(e => e.eventId === selectedEvent.id)?.studentIds || [] : [];

  const categoryStudents = React.useMemo(() => students.filter(s => categoryMatches(s.category, selectedCategory)), [students, selectedCategory]);
  const filteredStudents = React.useMemo(() => categoryStudents.filter(s => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
    return matchesSearch && (houseFilter === 'All' || s.house === houseFilter);
  }), [categoryStudents, search, houseFilter]);

  const enrolledEventIdsForStudent = React.useCallback((studentId: string) => {
    return snapshot.enrollments.filter(e => e.studentIds.includes(studentId)).map(e => e.eventId);
  }, [snapshot.enrollments]);

  const canAddStudent = React.useCallback((studentId: string, event: AthleticsEvent) => {
    const ids = enrolledEventIdsForStudent(studentId);
    if (ids.includes(event.id)) return { ok: true, reason: '' };
    if (ids.length >= 3) return { ok: false, reason: 'A student can take no more than 3 athletics events.' };
    const trackCount = ids.filter(id => TRACK_EVENTS.has(id)).length + (event.kind === 'track' ? 1 : 0);
    const fieldCount = ids.filter(id => FIELD_EVENTS.has(id)).length + (event.kind === 'field' ? 1 : 0);
    if (trackCount > 2 || fieldCount > 2) return { ok: false, reason: 'The allowed combination is 2 track + 1 field or 2 field + 1 track.' };
    return { ok: true, reason: '' };
  }, [enrolledEventIdsForStudent]);

  const saveNext = (next: AthleticsSnapshot, title: string, description: string) => {
    setSnapshot(next);
    void saveAthleticsSnapshot(next);
    showToast({ title, description });
  };

  const toggleEnrollment = (event: AthleticsEvent, studentId: string) => {
    if (!isLoggedIn) return;
    const current = snapshot.enrollments.find(e => e.eventId === event.id)?.studentIds || [];
    const enrolled = current.includes(studentId);
    if (!enrolled) {
      const check = canAddStudent(studentId, event);
      if (!check.ok) {
        showToast({ title: 'Enrollment blocked', description: check.reason });
        return;
      }
    }
    const enrollments = snapshot.enrollments.map(entry => entry.eventId === event.id
      ? { ...entry, studentIds: enrolled ? entry.studentIds.filter(id => id !== studentId) : [...entry.studentIds, studentId] }
      : entry);
    const results = enrolled ? snapshot.results.filter(r => !(r.eventId === event.id && r.studentId === studentId)) : snapshot.results;
    saveNext({ enrollments, results }, enrolled ? 'Student Removed' : 'Student Enrolled', enrolled ? 'The student was removed from this event.' : `${studentMap.get(studentId)?.name || 'Student'} was enrolled.`);
  };

  const enrollFiltered = () => {
    if (!isLoggedIn || !selectedEvent) return;
    const entry = snapshot.enrollments.find(e => e.eventId === selectedEvent.id);
    const current = entry?.studentIds || [];
    const addable = filteredStudents.filter(s => !current.includes(s.id) && canAddStudent(s.id, selectedEvent).ok);
    const enrollments = snapshot.enrollments.map(e => e.eventId === selectedEvent.id
      ? { ...e, studentIds: Array.from(new Set([...e.studentIds, ...addable.map(s => s.id)])) }
      : e);
    saveNext({ ...snapshot, enrollments }, 'Bulk Enrollment Complete', `${addable.length} eligible students added. Students already at their event limit were skipped.`);
  };

  const clearRoster = () => {
    if (!isLoggedIn || !selectedEvent || !window.confirm(`Clear all enrollments for ${selectedEvent.name}?`)) return;
    saveNext({ enrollments: snapshot.enrollments.map(e => e.eventId === selectedEvent.id ? { ...e, studentIds: [] } : e), results: snapshot.results.filter(r => r.eventId !== selectedEvent.id) }, 'Roster Cleared', `${selectedEvent.name} is now empty.`);
  };

  const updateResult = (studentId: string, patch: Partial<AthleticsResult>) => {
    if (!isLoggedIn || !selectedEvent) return;
    const existing = snapshot.results.find(r => r.eventId === selectedEvent.id && r.studentId === studentId);
    const nextResult: AthleticsResult = { eventId: selectedEvent.id, studentId, status: existing?.status || 'pending', timing: existing?.timing || '', position: existing?.position, ...patch };
    const results = existing
      ? snapshot.results.map(r => r.eventId === selectedEvent.id && r.studentId === studentId ? nextResult : r)
      : [...snapshot.results, nextResult];
    saveNext({ ...snapshot, results }, 'Result Saved', `${selectedEvent.name} result updated.`);
    setSavedStudent(studentId);
    window.setTimeout(() => setSavedStudent(null), 1200);
  };

  const autoRank = () => {
    if (!isLoggedIn || !selectedEvent) return;
    const enrolled = selectedEnrollment.map(id => snapshot.results.find(r => r.eventId === selectedEvent.id && r.studentId === id)).filter((r): r is AthleticsResult => Boolean(r && r.status === 'finished' && r.timing));
    enrolled.sort((a, b) => selectedEvent.kind === 'track' ? parseTrack(a.timing) - parseTrack(b.timing) : parseField(b.timing) - parseField(a.timing));
    const rank = new Map(enrolled.map((r, i) => [r.studentId, i + 1]));
    saveNext({ ...snapshot, results: snapshot.results.map(r => r.eventId === selectedEvent.id && rank.has(r.studentId) ? { ...r, position: rank.get(r.studentId) } : r) }, 'Positions Calculated', `Ranked ${enrolled.length} finished competitors.`);
  };

  const categoryCount = (category: Category) => students.filter(s => categoryMatches(s.category, category)).length;
  const eventEnrollmentCount = (event: AthleticsEvent) => snapshot.enrollments.find(e => e.eventId === event.id)?.studentIds.length || 0;

  return (
    <div className="max-w-[1500px] mx-auto space-y-7 pb-12">
      <section className="border-b border-primary/10 pb-6 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <div>
          <div className="royal-kicker mb-2">Track & Field Desk</div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Athletics 2026</h1>
          <p className="text-slate-400 mt-2 max-w-4xl text-sm leading-relaxed">12 athletics events across every eligible category. Each student may enter a maximum of three events, with only 2 track + 1 field or 2 field + 1 track combinations permitted.</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider ${isLoggedIn ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
          <Icon name={isLoggedIn ? 'verified_user' : 'lock'} size="17" className="inline mr-2" />{isLoggedIn ? 'Staff Editing Active' : 'Read Only Mode'}
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Events', ATHLETICS_EVENTS.length],
          ['Categories', CATEGORIES.length],
          ['Track Events', TRACK_EVENTS.size],
          ['Field Events', FIELD_EVENTS.size]
        ].map(([label, value]) => (
          <div key={String(label)} className="glass-panel rounded-xl border border-primary/10 p-4">
            <div className="text-[10px] uppercase font-black tracking-wider text-slate-500">{label}</div>
            <div className="text-3xl font-black text-white mt-1">{value}</div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <div className="royal-kicker mb-1">Competition Categories</div>
          <h2 className="text-2xl font-black text-white">Choose a category</h2>
          <p className="text-xs text-slate-400 mt-1">Every category below contains the complete collection of 12 event cards.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {CATEGORIES.map(category => (
            <button key={category} onClick={() => setSelectedCategory(category)} className={`rounded-xl border px-3 py-3 text-left transition-all ${selectedCategory === category ? 'border-primary/50 bg-primary/10 text-white shadow-lg shadow-primary/10' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-primary/25'}`}>
              <div className="text-sm font-black">{category}</div>
              <div className="text-[10px] uppercase tracking-wider mt-1 opacity-70">{categoryCount(category)} students</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="royal-kicker mb-1">{selectedCategory}</div>
            <h2 className="text-2xl font-black text-white">Event Cards</h2>
          </div>
          <div className="text-xs text-slate-400">6 Track • 6 Field • 12 total</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ATHLETICS_EVENTS.map(event => {
            const count = eventEnrollmentCount(event);
            const isTrack = event.kind === 'track';
            return (
              <button key={event.id} onClick={() => setSelectedEventId(event.id)} className="text-left glass-panel rounded-2xl border border-primary/10 p-5 hover:border-primary/40 hover:bg-white/[0.04] transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${isTrack ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-sky-500/30 bg-sky-500/10 text-sky-300'}`}>{isTrack ? 'Track' : 'Field'}</span>
                    <h3 className="text-xl font-black text-white mt-3 group-hover:text-primary transition-colors">{event.name}</h3>
                  </div>
                  <Icon name={isTrack ? 'directions_run' : 'sports_handball'} className="text-primary text-[27px]" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3"><div className="text-[9px] uppercase font-black text-slate-500">Unit</div><div className="text-xs font-bold text-slate-200 mt-1">{event.unit}</div></div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3"><div className="text-[9px] uppercase font-black text-slate-500">Enrolled</div><div className="text-lg font-black text-white mt-0.5">{count}</div></div>
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">Open event <Icon name="arrow_forward" size="13" /></div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedEvent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-2xl flex flex-col">
            <ModalHeader kicker={`${selectedCategory} • Athletics 2026`} icon={selectedEvent.kind === 'track' ? 'directions_run' : 'sports_handball'} title={selectedEvent.name} subtitle={`${selectedEvent.unit} • ${selectedEnrollment.length} enrolled`} onClose={() => setSelectedEventId(null)} />
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-2 relative">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size="18" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, computer number, class..." className="royal-input rounded-xl pl-10 pr-4 py-3 w-full text-sm" />
                </div>
                <select value={houseFilter} onChange={e => setHouseFilter(e.target.value)} className="royal-input rounded-xl px-3 py-3 text-sm"><option>All</option>{HOUSES.map(h => <option key={h}>{h}</option>)}</select>
                {isLoggedIn && <button onClick={enrollFiltered} className="royal-secondary-btn rounded-xl px-3 py-3 text-xs font-black uppercase tracking-wider">Enroll Eligible ({filteredStudents.length})</button>}
              </div>

              <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div><div className="text-xs font-black uppercase tracking-wider text-primary">Event rules</div><div className="text-sm text-slate-300 mt-1">Maximum 3 events per student. Allowed: <b>2 Track + 1 Field</b> or <b>2 Field + 1 Track</b>.</div></div>
                  <div className="text-xs font-black text-slate-400">Result unit: <span className="text-white">{selectedEvent.unit}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredStudents.map(student => {
                  const enrolled = selectedEnrollment.includes(student.id);
                  const total = enrolledEventIdsForStudent(student.id).length;
                  const limit = canAddStudent(student.id, selectedEvent);
                  return (
                    <button key={student.id} disabled={!isLoggedIn || (!enrolled && !limit.ok)} onClick={() => toggleEnrollment(selectedEvent, student.id)} className={`rounded-xl border p-4 text-left transition-all ${enrolled ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : limit.ok ? 'border-white/10 bg-white/[0.02] hover:border-primary/30' : 'border-rose-500/20 bg-rose-500/[0.03] opacity-60'} disabled:cursor-not-allowed`}>
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="font-black text-white truncate">{student.name}</div><div className="text-[11px] text-slate-400 mt-1">#{student.id} • Class {student.className}</div><div className="text-[10px] text-primary mt-1 font-bold">{categoryShort(student.category)}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${houseBadge(student.house)}`}>{student.house}</span></div>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between"><span className={`text-[10px] font-black uppercase ${enrolled ? 'text-emerald-300' : 'text-slate-500'}`}>{enrolled ? '✓ Enrolled' : 'Not enrolled'}</span><span className="text-[10px] text-slate-500">{total}/3 events</span></div>
                      {!enrolled && !limit.ok && <div className="text-[9px] text-rose-300 mt-2 leading-tight">{limit.reason}</div>}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div><h3 className="text-lg font-black text-white">Results</h3><p className="text-xs text-slate-400 mt-1">{selectedEvent.kind === 'track' ? 'Enter Mins&Secs&Milliseconds as MM:SS:MMM.' : 'Enter Metres&Centimetres as metres.centimetres, e.g. 6.45.'}</p></div>
                  <div className="flex gap-2">{isLoggedIn && <button onClick={autoRank} className="royal-primary-btn rounded-xl px-4 py-2 text-xs font-black uppercase">Auto-Rank</button>}{isLoggedIn && <button onClick={clearRoster} className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-4 py-2 text-xs font-black uppercase">Clear</button>}</div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="royal-data-table min-w-[900px]"><thead><tr><th>Competitor</th><th>House</th><th>Status</th><th>{selectedEvent.kind === 'track' ? 'Time (MM:SS:MMM)' : 'Distance (M.CM)'}</th><th>Position</th></tr></thead>
                    <tbody>{selectedEnrollment.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-slate-500">No students enrolled in this event.</td></tr> : selectedEnrollment.map(id => {
                      const student = studentMap.get(id); if (!student) return null;
                      const result = snapshot.results.find(r => r.eventId === selectedEvent.id && r.studentId === student.id) || { eventId: selectedEvent.id, studentId: student.id, status: 'pending' as AthleticsResultStatus, timing: '' };
                      return <tr key={student.id}><td><div className="font-black text-white">{student.name}</div><div className="text-[10px] text-slate-500">#{student.id} • {categoryShort(student.category)}</div></td><td><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${houseBadge(student.house)}`}>{student.house}</span></td><td><select disabled={!isLoggedIn} value={result.status} onChange={e => updateResult(student.id, { status: e.target.value as AthleticsResultStatus })} className={`royal-input rounded-lg px-2 py-2 text-xs ${statusStyle(result.status)}`}>{RESULT_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></td><td><input disabled={!isLoggedIn} value={result.timing || ''} onChange={e => updateResult(student.id, { timing: e.target.value })} placeholder={selectedEvent.kind === 'track' ? '00:12:345' : '6.45'} className="royal-input rounded-lg px-3 py-2 text-xs font-mono font-bold text-amber-300 min-w-[160px]" />{savedStudent === student.id && <span className="ml-2 text-emerald-400 text-xs">✓ Saved</span>}</td><td><input disabled={!isLoggedIn} type="number" min="1" value={result.position || ''} onChange={e => updateResult(student.id, { position: e.target.value ? Number(e.target.value) : undefined })} placeholder="#" className="royal-input rounded-lg px-2 py-2 text-xs w-20 text-center" /></td></tr>;
                    })}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Athletics;
