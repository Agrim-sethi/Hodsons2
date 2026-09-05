import React from 'react';
import { createPortal } from 'react-dom';
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
  AthleticsStage,
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

type ResultParts = { first: string; second: string; third: string };

const categoryMatches = (studentCategory: string, category: Category) => {
  if (category.startsWith('PD ')) {
    const age = category === 'PD U11' ? '11' : '12';
    return studentCategory === `PDB Under ${age}` || studentCategory === `PDG Under ${age}`;
  }
  const [dept, age] = category.split(' ');
  const ageValue = age === 'Opens' ? 'Opens' : `Under ${age.slice(1)}`;
  return studentCategory === `${dept} ${ageValue}`;
};

const categoryShort = (studentCategory: string) => {
  if (studentCategory.includes('Under 11')) return 'PD U11';
  if (studentCategory.includes('Under 12')) return 'PD U12';
  return studentCategory.replace(' Under ', ' U');
};

const statusLabel = (status: AthleticsResultStatus) => ({
  pending: 'Pending',
  finished: 'Finished',
  dnf: 'DNF',
  absent: 'Absent',
  medically_excused: 'Medical Leave'
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

const parseTrackTiming = (value = '') => {
  const parts = value.trim().split(':').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return Number.POSITIVE_INFINITY;
  return parts[0] * 60 + parts[1] + parts[2] / 1000;
};

const parseFieldDistance = (value = '') => {
  const normalized = value.trim().replace(',', '.');
  const metres = Number(normalized);
  return Number.isFinite(metres) ? metres : Number.NEGATIVE_INFINITY;
};

const splitTrackTiming = (timing?: string): ResultParts => {
  const parts = (timing || '').split(':');
  return {
    first: parts[0] || '0',
    second: parts[1] || '0',
    third: parts[2] || '0'
  };
};

const splitFieldDistance = (timing?: string): Pick<ResultParts, 'first' | 'second'> => {
  const value = timing || '';
  const [metres, centimetres = ''] = value.split('.');
  return {
    first: metres || '',
    second: centimetres ? centimetres.slice(0, 2) : ''
  };
};

const clampNumber = (value: string, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(parsed)));
};

const Athletics: React.FC = () => {
  const { showToast } = useToast();
  const { isLoggedIn } = useStaffAuth();
  const [snapshot, setSnapshot] = React.useState<AthleticsSnapshot>(() => getAthleticsSnapshot());
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<Category>('PD U11');
  const [stage, setStage] = React.useState<AthleticsStage>('qualifying');
  const [search, setSearch] = React.useState('');
  const [houseFilter, setHouseFilter] = React.useState('All');
  const [savedStudent, setSavedStudent] = React.useState<string | null>(null);

  const students = React.useMemo(() => getPrepAthleticsStudents(studentClasses as Record<string, string>), []);
  const studentMap = React.useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  React.useEffect(() => {
    setSnapshot(getAthleticsSnapshot());
    return subscribeToAthleticsData(setSnapshot);
  }, []);

  React.useEffect(() => {
    if (!selectedEventId) return;
    setStage('qualifying');
    setSearch('');
    setHouseFilter('All');
  }, [selectedEventId]);

  const selectedEvent = ATHLETICS_EVENTS.find(e => e.id === selectedEventId) || null;
  const finalsConfig = selectedEvent ? snapshot.finals.find(entry => entry.eventId === selectedEvent.id) : undefined;
  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const qualifyingEnrollment = selectedEvent ? snapshot.enrollments.find(e => e.eventId === selectedEvent.id)?.studentIds || [] : [];
  const finalistIds = finalsConfig?.studentIds || [];
  const currentEnrollment = stage === 'finals' ? finalistIds : qualifyingEnrollment;

  const categoryStudents = React.useMemo(
    () => students.filter(s => categoryMatches(s.category, selectedCategory)),
    [students, selectedCategory]
  );

  const filteredStudents = React.useMemo(() => categoryStudents.filter(s => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
    return matchesSearch && (houseFilter === 'All' || s.house === houseFilter);
  }), [categoryStudents, search, houseFilter]);

  const enrolledEventIdsForStudent = React.useCallback((studentId: string) => (
    snapshot.enrollments.filter(entry => entry.studentIds.includes(studentId)).map(entry => entry.eventId)
  ), [snapshot.enrollments]);

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
    const current = snapshot.enrollments.find(entry => entry.eventId === event.id)?.studentIds || [];
    const enrolled = current.includes(studentId);

    if (!enrolled) {
      const check = canAddStudent(studentId, event);
      if (!check.ok) {
        showToast({ title: 'Enrollment blocked', description: check.reason });
        return;
      }
    }

    const enrollments = snapshot.enrollments.map(entry => entry.eventId === event.id
      ? {
          ...entry,
          studentIds: enrolled
            ? entry.studentIds.filter(id => id !== studentId)
            : [...entry.studentIds, studentId]
        }
      : entry);

    const results = enrolled
      ? snapshot.results.filter(result => !(result.eventId === event.id && result.studentId === studentId))
      : snapshot.results;

    saveNext(
      { ...snapshot, enrollments, results },
      enrolled ? 'Student Removed' : 'Student Enrolled',
      enrolled ? 'The student was removed from this event.' : `${studentMap.get(studentId)?.name || 'Student'} was enrolled.`
    );
  };

  const enrollFiltered = () => {
    if (!isLoggedIn || !selectedEvent || stage !== 'qualifying') return;
    const entry = snapshot.enrollments.find(item => item.eventId === selectedEvent.id);
    const current = entry?.studentIds || [];
    const addable = filteredStudents.filter(student => !current.includes(student.id) && canAddStudent(student.id, selectedEvent).ok);
    const enrollments = snapshot.enrollments.map(item => item.eventId === selectedEvent.id
      ? { ...item, studentIds: Array.from(new Set([...item.studentIds, ...addable.map(student => student.id)])) }
      : item);
    saveNext({ ...snapshot, enrollments }, 'Bulk Enrollment Complete', `${addable.length} eligible students added.`);
  };

  const clearRoster = () => {
    if (!isLoggedIn || !selectedEvent || stage !== 'qualifying') return;
    if (!window.confirm(`Clear all qualifying enrollments for ${selectedEvent.name}?`)) return;
    saveNext(
      {
        ...snapshot,
        enrollments: snapshot.enrollments.map(entry => entry.eventId === selectedEvent.id ? { ...entry, studentIds: [] } : entry),
        finals: snapshot.finals.map(entry => entry.eventId === selectedEvent.id ? { ...entry, studentIds: [] } : entry),
        results: snapshot.results.filter(result => result.eventId !== selectedEvent.id)
      },
      'Qualifying Roster Cleared',
      `${selectedEvent.name} has been reset.`
    );
  };

  const toggleFinals = () => {
    if (!isLoggedIn || !selectedEvent) return;
    const enabled = !finalsEnabled;
    const finals = snapshot.finals.map(entry => entry.eventId === selectedEvent.id
      ? { ...entry, enabled, studentIds: enabled ? entry.studentIds : [] }
      : entry);
    if (!enabled) setStage('qualifying');
    saveNext(
      { ...snapshot, finals },
      enabled ? 'Finals Allotted' : 'Finals Removed',
      enabled
        ? `${selectedEvent.name} now has a qualifying stage followed by a finals stage.`
        : `Finals have been turned off for ${selectedEvent.name}.`
    );
  };

  const toggleFinalist = (studentId: string) => {
    if (!isLoggedIn || !selectedEvent || !finalsEnabled) return;
    const current = finalistIds;
    const nextStudentIds = current.includes(studentId)
      ? current.filter(id => id !== studentId)
      : [...current, studentId];
    const finals = snapshot.finals.map(entry => entry.eventId === selectedEvent.id ? { ...entry, studentIds: nextStudentIds } : entry);
    saveNext({ ...snapshot, finals }, current.includes(studentId) ? 'Finalist Removed' : 'Finalist Added', `${studentMap.get(studentId)?.name || 'Student'} ${current.includes(studentId) ? 'was removed from' : 'was added to'} the finals roster.`);
  };

  const autoPickFinalists = () => {
    if (!isLoggedIn || !selectedEvent || !finalsEnabled) return;
    const candidates = qualifyingEnrollment
      .map(studentId => snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === studentId && (result.stage || 'qualifying') === 'qualifying' && result.status === 'finished' && result.timing))
      .filter((result): result is AthleticsResult => Boolean(result));

    candidates.sort((a, b) => selectedEvent.kind === 'track'
      ? parseTrackTiming(a.timing) - parseTrackTiming(b.timing)
      : parseFieldDistance(b.timing) - parseFieldDistance(a.timing));

    const nextStudentIds = candidates.slice(0, 8).map(result => result.studentId);
    const finals = snapshot.finals.map(entry => entry.eventId === selectedEvent.id ? { ...entry, studentIds: nextStudentIds } : entry);
    saveNext({ ...snapshot, finals }, 'Finalists Selected', `${nextStudentIds.length} qualifying competitors were selected. You can still adjust the finals roster manually.`);
  };

  const getResult = (studentId: string, resultStage: AthleticsStage): AthleticsResult => (
    snapshot.results.find(result => result.eventId === selectedEvent?.id && result.studentId === studentId && (result.stage || 'qualifying') === resultStage) || {
      eventId: selectedEvent?.id || '',
      studentId,
      stage: resultStage,
      status: 'pending',
      timing: ''
    }
  );

  const updateResult = (studentId: string, resultStage: AthleticsStage, patch: Partial<AthleticsResult>) => {
    if (!isLoggedIn || !selectedEvent) return;
    const existing = snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === studentId && (result.stage || 'qualifying') === resultStage);
    const nextResult: AthleticsResult = {
      eventId: selectedEvent.id,
      studentId,
      stage: resultStage,
      status: existing?.status || 'pending',
      timing: existing?.timing || '',
      position: existing?.position,
      ...patch
    };
    const results = existing
      ? snapshot.results.map(result => result.eventId === selectedEvent.id && result.studentId === studentId && (result.stage || 'qualifying') === resultStage ? nextResult : result)
      : [...snapshot.results, nextResult];
    saveNext({ ...snapshot, results }, 'Result Saved', `${selectedEvent.name} ${resultStage} result updated.`);
    setSavedStudent(`${resultStage}:${studentId}`);
    window.setTimeout(() => setSavedStudent(null), 900);
  };

  const updateTrackPart = (studentId: string, resultStage: AthleticsStage, key: keyof ResultParts, raw: string, max: number) => {
    const current = splitTrackTiming(getResult(studentId, resultStage).timing);
    const next = { ...current, [key]: String(clampNumber(raw, max)) };
    const normalized = `${clampNumber(next.first, 999)}:${clampNumber(next.second, 59)}:${clampNumber(next.third, 999)}`;
    updateResult(studentId, resultStage, { timing: normalized });
  };

  const updateFieldPart = (studentId: string, resultStage: AthleticsStage, key: 'first' | 'second', raw: string) => {
    const current = splitFieldDistance(getResult(studentId, resultStage).timing);
    const next = { ...current, [key]: raw.replace(/[^0-9]/g, '').slice(0, key === 'first' ? 3 : 2) };
    const metres = next.first;
    const centimetres = next.second;
    const timing = metres === '' && centimetres === '' ? '' : `${metres || '0'}.${(centimetres || '0').padStart(2, '0')}`;
    updateResult(studentId, resultStage, { timing });
  };

  const autoRank = () => {
    if (!isLoggedIn || !selectedEvent) return;
    const ranked = currentEnrollment
      .map(studentId => getResult(studentId, stage))
      .filter(result => result.status === 'finished' && Boolean(result.timing));

    ranked.sort((a, b) => stage === 'qualifying'
      ? (selectedEvent.kind === 'track' ? parseTrackTiming(a.timing) - parseTrackTiming(b.timing) : parseFieldDistance(b.timing) - parseFieldDistance(a.timing))
      : (selectedEvent.kind === 'track' ? parseTrackTiming(a.timing) - parseTrackTiming(b.timing) : parseFieldDistance(b.timing) - parseFieldDistance(a.timing)));

    const rankMap = new Map(ranked.map((result, index) => [result.studentId, index + 1]));
    const results = snapshot.results.map(result => {
      const resultStage = result.stage || 'qualifying';
      return result.eventId === selectedEvent.id && resultStage === stage && rankMap.has(result.studentId)
        ? { ...result, stage: resultStage, position: rankMap.get(result.studentId) }
        : result;
    });

    saveNext({ ...snapshot, results }, 'Positions Calculated', `${ranked.length} finished competitors ranked in ${stage}.`);
  };

  const categoryCount = (category: Category) => students.filter(student => categoryMatches(student.category, category)).length;
  const eventEnrollmentCount = (event: AthleticsEvent) => snapshot.enrollments.find(entry => entry.eventId === event.id)?.studentIds.length || 0;

  const selectedFinalistCount = finalistIds.length;

  const modal = selectedEvent ? (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="relative flex w-[calc(100vw-2rem)] max-w-[1180px] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
        <ModalHeader
          kicker={`${selectedCategory} • Athletics 2026`}
          icon={selectedEvent.kind === 'track' ? 'directions_run' : 'sports_handball'}
          title={selectedEvent.name}
          subtitle={`${selectedEvent.kind === 'track' ? 'Track' : 'Field'} event • ${stage === 'qualifying' ? 'Qualifying' : 'Finals'}`}
          onClose={() => setSelectedEventId(null)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-1">
              <button
                onClick={() => setStage('qualifying')}
                className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${stage === 'qualifying' ? 'bg-primary/15 text-primary' : 'text-slate-400 hover:text-white'}`}
              >
                Qualifying
              </button>
              {finalsEnabled && (
                <button
                  onClick={() => setStage('finals')}
                  className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${stage === 'finals' ? 'bg-primary/15 text-primary' : 'text-slate-400 hover:text-white'}`}
                >
                  Finals <span className="ml-1 text-[10px] opacity-70">{selectedFinalistCount}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={!isLoggedIn}
                onClick={toggleFinals}
                className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 ${finalsEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-primary/30'}`}
              >
                <Icon name={finalsEnabled ? 'check_circle' : 'flag'} size="15" className="mr-2 inline" />
                {finalsEnabled ? 'Finals Allotted' : 'Allot Finals'}
              </button>
              {stage === 'qualifying' && finalsEnabled && (
                <button disabled={!isLoggedIn} onClick={autoPickFinalists} className="royal-secondary-btn rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-50">
                  Auto-pick Top 8
                </button>
              )}
            </div>
          </div>

          {stage === 'qualifying' && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-primary">Event setup</div>
                  <div className="text-sm text-slate-300 mt-1">
                    {finalsEnabled
                      ? 'Qualifying is held first. Mark the athletes who should continue into the finals, then switch to Finals to record the second-stage results.'
                      : 'This event currently has a single qualifying stage. You can allot a finals stage at any point.'}
                  </div>
                </div>
                <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-400">
                  {qualifyingEnrollment.length} qualified roster entries • {selectedFinalistCount} finalists
                </div>
              </div>
            </div>
          )}

          {stage === 'qualifying' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2 relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size="18" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, computer number, class..." className="royal-input rounded-xl pl-10 pr-4 py-3 w-full text-sm" />
              </div>
              <select value={houseFilter} onChange={e => setHouseFilter(e.target.value)} className="royal-input rounded-xl px-3 py-3 text-sm">
                <option>All</option>
                {HOUSES.map(house => <option key={house}>{house}</option>)}
              </select>
              {isLoggedIn ? (
                <button onClick={enrollFiltered} className="royal-secondary-btn rounded-xl px-3 py-3 text-xs font-black uppercase tracking-wider">
                  Enroll Eligible ({filteredStudents.filter(student => !qualifyingEnrollment.includes(student.id) && canAddStudent(student.id, selectedEvent).ok).length})
                </button>
              ) : <div />}
            </div>
          )}

          {stage === 'qualifying' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredStudents.map(student => {
                const enrolled = qualifyingEnrollment.includes(student.id);
                const total = enrolledEventIdsForStudent(student.id).length;
                const limit = canAddStudent(student.id, selectedEvent);
                const finalist = finalistIds.includes(student.id);
                return (
                  <div key={student.id} className={`rounded-xl border p-4 transition-all ${enrolled ? 'border-emerald-500/40 bg-emerald-500/[0.055]' : limit.ok ? 'border-white/10 bg-white/[0.02]' : 'border-rose-500/20 bg-rose-500/[0.03] opacity-60'}`}>
                    <button disabled={!isLoggedIn || (!enrolled && !limit.ok)} onClick={() => toggleEnrollment(selectedEvent, student.id)} className="w-full text-left disabled:cursor-not-allowed">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-black text-white truncate">{student.name}</div>
                          <div className="text-[11px] text-slate-400 mt-1">#{student.id} • Class {student.className}</div>
                          <div className="text-[10px] text-primary mt-1 font-bold">{categoryShort(student.category)}</div>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${houseBadge(student.house)}`}>{student.house}</span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase ${enrolled ? 'text-emerald-300' : 'text-slate-500'}`}>{enrolled ? '✓ Enrolled' : 'Not enrolled'}</span>
                        <span className="text-[10px] text-slate-500">{total}/3 events</span>
                      </div>
                    </button>
                    {enrolled && finalsEnabled && (
                      <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 cursor-pointer">
                        <input type="checkbox" checked={finalist} disabled={!isLoggedIn} onChange={() => toggleFinalist(student.id)} className="accent-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Finalist</span>
                        {finalist && <span className="ml-auto text-[10px] font-black text-emerald-300">Selected</span>}
                      </label>
                    )}
                    {!enrolled && !limit.ok && <div className="text-[9px] text-rose-300 mt-2 leading-tight">{limit.reason}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {stage === 'finals' && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-primary">Finals roster</div>
                  <div className="text-sm text-slate-300 mt-1">Only athletes allotted to the finals appear here. The finals results are stored separately from qualifying.</div>
                </div>
                <div className="text-xs font-black text-slate-400">{currentEnrollment.length} finalists</div>
              </div>
            </div>
          )}

          <div className="border-t border-white/10 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-black text-white">{stage === 'qualifying' ? 'Qualifying Results' : 'Finals Results'}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedEvent.kind === 'track' ? 'Enter each result using minutes, seconds and milliseconds in separate fields.' : 'Enter each result using metres and centimetres in separate fields.'}</p>
              </div>
              <div className="flex gap-2">
                {isLoggedIn && <button onClick={autoRank} className="royal-primary-btn rounded-xl px-4 py-2 text-xs font-black uppercase">Auto-Rank</button>}
                {isLoggedIn && stage === 'qualifying' && <button onClick={clearRoster} className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-4 py-2 text-xs font-black uppercase">Clear</button>}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="royal-data-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>Competitor</th>
                    <th>House</th>
                    <th>Status</th>
                    <th>{selectedEvent.kind === 'track' ? 'Time' : 'Distance'}</th>
                    <th>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEnrollment.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-500">{stage === 'finals' ? 'No finalists have been allotted yet.' : 'No students enrolled in this event.'}</td></tr>
                  ) : currentEnrollment.map(studentId => {
                    const student = studentMap.get(studentId);
                    if (!student) return null;
                    const result = getResult(student.id, stage);
                    const key = `${stage}:${student.id}`;
                    const trackParts = splitTrackTiming(result.timing);
                    const fieldParts = splitFieldDistance(result.timing);
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="font-black text-white">{student.name}</div>
                          <div className="text-[10px] text-slate-500">#{student.id} • {categoryShort(student.category)}</div>
                        </td>
                        <td><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${houseBadge(student.house)}`}>{student.house}</span></td>
                        <td>
                          <select disabled={!isLoggedIn} value={result.status} onChange={e => updateResult(student.id, stage, { status: e.target.value as AthleticsResultStatus })} className={`royal-input rounded-lg px-2 py-2 text-xs ${statusStyle(result.status)}`}>
                            {RESULT_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                          </select>
                        </td>
                        <td>
                          {selectedEvent.kind === 'track' ? (
                            <div className="flex items-center gap-2 min-w-[270px]">
                              <div className="flex-1"><input aria-label={`${student.name} minutes`} disabled={!isLoggedIn} type="number" min="0" max="999" value={trackParts.first} onChange={e => updateTrackPart(student.id, stage, 'first', e.target.value, 999)} className="royal-input rounded-lg px-2 py-2 w-full text-sm font-mono text-center" placeholder="0" /><div className="text-[8px] text-slate-600 text-center mt-1 uppercase tracking-wider">Min</div></div>
                              <span className="text-slate-600 font-black">:</span>
                              <div className="flex-1"><input aria-label={`${student.name} seconds`} disabled={!isLoggedIn} type="number" min="0" max="59" value={trackParts.second} onChange={e => updateTrackPart(student.id, stage, 'second', e.target.value, 59)} className="royal-input rounded-lg px-2 py-2 w-full text-sm font-mono text-center" placeholder="0" /><div className="text-[8px] text-slate-600 text-center mt-1 uppercase tracking-wider">Sec</div></div>
                              <span className="text-slate-600 font-black">:</span>
                              <div className="flex-1"><input aria-label={`${student.name} milliseconds`} disabled={!isLoggedIn} type="number" min="0" max="999" value={trackParts.third} onChange={e => updateTrackPart(student.id, stage, 'third', e.target.value, 999)} className="royal-input rounded-lg px-2 py-2 w-full text-sm font-mono text-center" placeholder="0" /><div className="text-[8px] text-slate-600 text-center mt-1 uppercase tracking-wider">MS</div></div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-[220px]">
                              <div className="flex-1"><input aria-label={`${student.name} metres`} disabled={!isLoggedIn} type="number" min="0" max="999" value={fieldParts.first} onChange={e => updateFieldPart(student.id, stage, 'first', e.target.value)} className="royal-input rounded-lg px-2 py-2 w-full text-sm font-mono text-center" placeholder="0" /><div className="text-[8px] text-slate-600 text-center mt-1 uppercase tracking-wider">Metres</div></div>
                              <span className="text-slate-600 font-black">.</span>
                              <div className="flex-1"><input aria-label={`${student.name} centimetres`} disabled={!isLoggedIn} type="number" min="0" max="99" value={fieldParts.second} onChange={e => updateFieldPart(student.id, stage, 'second', e.target.value)} className="royal-input rounded-lg px-2 py-2 w-full text-sm font-mono text-center" placeholder="00" /><div className="text-[8px] text-slate-600 text-center mt-1 uppercase tracking-wider">Centimetres</div></div>
                            </div>
                          )}
                          {savedStudent === key && <span className="ml-2 text-emerald-400 text-xs">✓</span>}
                        </td>
                        <td>
                          <input disabled={!isLoggedIn} type="number" min="1" value={result.position || ''} onChange={e => updateResult(student.id, stage, { position: e.target.value ? Number(e.target.value) : undefined })} placeholder="#" className="royal-input rounded-lg px-2 py-2 text-xs w-20 text-center" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

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
            const finals = snapshot.finals.find(entry => entry.eventId === event.id);
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
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <div className="text-[9px] uppercase font-black text-slate-500">Enrolled</div>
                    <div className="text-lg font-black text-white mt-0.5">{count}</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <div className="text-[9px] uppercase font-black text-slate-500">Finals</div>
                    <div className={`text-sm font-black mt-1 ${finals?.enabled ? 'text-emerald-300' : 'text-slate-500'}`}>{finals?.enabled ? 'Allotted' : 'Qualifying only'}</div>
                  </div>
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">Open event <Icon name="arrow_forward" size="13" /></div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedEvent && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
    </div>
  );
};

export default Athletics;
