import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
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
type PageTab = 'events' | 'leaderboard';
type ResultParts = { first: string; second: string; third: string };

const TRACK_EVENTS = new Set(['100m', '200m', '400m', '800m', '1500m', '3000m']);
const FIELD_EVENTS = new Set(['long-jump', 'high-jump', 'shot-put', 'discus-throw', 'javelin-throw', 'triple-jump']);
const RESULT_STATUSES: AthleticsResultStatus[] = ['pending', 'finished', 'dnf', 'absent', 'medically_excused'];

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

const placementPoints = (position?: number) => {
  if (position === 1) return 4;
  if (position === 2) return 3;
  if (position === 3) return 2;
  if (position === 4) return 1;
  return 0;
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
  const [metres, centimetres = ''] = (timing || '').split('.');
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

const resultStageOf = (result: AthleticsResult) => result.stage || 'qualifying';

const getQualifyingPoints = (result?: AthleticsResult) => {
  if (!result) return 0;
  return result.qualified || result.status === 'finished' ? 1 : 0;
};

const Athletics: React.FC = () => {
  const { showToast } = useToast();
  const { isLoggedIn } = useStaffAuth();
  const [snapshot, setSnapshot] = React.useState<AthleticsSnapshot>(() => getAthleticsSnapshot());
  const [pageTab, setPageTab] = React.useState<PageTab>('events');
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<Category>('PD U11');
  const [stage, setStage] = React.useState<AthleticsStage>('qualifying');
  const [search, setSearch] = React.useState('');
  const [houseFilter, setHouseFilter] = React.useState('All');
  const [savedStudent, setSavedStudent] = React.useState<string | null>(null);

  const students = React.useMemo(() => getPrepAthleticsStudents(studentClasses as Record<string, string>), []);
  const studentMap = React.useMemo(() => new Map(students.map(student => [student.id, student])), [students]);

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

  const selectedEvent = ATHLETICS_EVENTS.find(event => event.id === selectedEventId) || null;
  const finalsConfig = selectedEvent ? snapshot.finals.find(entry => entry.eventId === selectedEvent.id) : undefined;
  const finalsEnabled = Boolean(finalsConfig?.enabled);
  const qualifyingEnrollment = selectedEvent
    ? snapshot.enrollments.find(entry => entry.eventId === selectedEvent.id)?.studentIds || []
    : [];
  const finalistIds = finalsConfig?.studentIds || [];
  const currentEnrollment = stage === 'finals' ? finalistIds : qualifyingEnrollment;

  const categoryStudents = React.useMemo(
    () => students.filter(student => categoryMatches(student.category, selectedCategory)),
    [students, selectedCategory]
  );

  const filteredStudents = React.useMemo(() => categoryStudents.filter(student => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || student.id.toLowerCase().includes(q) || student.name.toLowerCase().includes(q) || student.className.toLowerCase().includes(q);
    return matchesSearch && (houseFilter === 'All' || student.house === houseFilter);
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
      ? { ...entry, studentIds: enrolled ? entry.studentIds.filter(id => id !== studentId) : [...entry.studentIds, studentId] }
      : entry);
    const results = enrolled
      ? snapshot.results.filter(result => !(result.eventId === event.id && result.studentId === studentId))
      : snapshot.results;
    const finals = enrolled
      ? snapshot.finals.map(entry => entry.eventId === event.id ? { ...entry, studentIds: entry.studentIds.filter(id => id !== studentId) } : entry)
      : snapshot.finals;
    saveNext(
      { ...snapshot, enrollments, results, finals },
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
      enabled ? `${selectedEvent.name} now has a separate finals stage.` : `Finals have been turned off for ${selectedEvent.name}.`
    );
  };

  const toggleQualified = (studentId: string) => {
    if (!isLoggedIn || !selectedEvent || stage !== 'qualifying') return;
    const existing = snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === studentId && resultStageOf(result) === 'qualifying');
    const nextResult: AthleticsResult = {
      eventId: selectedEvent.id,
      studentId,
      stage: 'qualifying',
      status: existing?.status || 'pending',
      timing: existing?.timing || '',
      position: existing?.position,
      qualified: !existing?.qualified
    };
    const results = existing
      ? snapshot.results.map(result => result.eventId === selectedEvent.id && result.studentId === studentId && resultStageOf(result) === 'qualifying' ? nextResult : result)
      : [...snapshot.results, nextResult];
    saveNext({ ...snapshot, results }, nextResult.qualified ? 'Athlete Qualified' : 'Qualification Removed', nextResult.qualified ? `${studentMap.get(studentId)?.name || 'Athlete'} receives the qualifying point.` : 'The athlete is no longer marked qualified.');
  };

  const toggleFinalist = (studentId: string) => {
    if (!isLoggedIn || !selectedEvent || !finalsEnabled || stage !== 'qualifying') return;
    const current = finalistIds;
    const nextStudentIds = current.includes(studentId)
      ? current.filter(id => id !== studentId)
      : [...current, studentId];
    const finals = snapshot.finals.map(entry => entry.eventId === selectedEvent.id ? { ...entry, studentIds: nextStudentIds } : entry);
    saveNext({ ...snapshot, finals }, current.includes(studentId) ? 'Finalist Removed' : 'Added to Finals', `${studentMap.get(studentId)?.name || 'Student'} ${current.includes(studentId) ? 'was removed from' : 'was added to'} the finals roster.`);
  };

  const autoPickFinalists = () => {
    if (!isLoggedIn || !selectedEvent || !finalsEnabled) return;
    const candidates = qualifyingEnrollment
      .map(studentId => snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === studentId && resultStageOf(result) === 'qualifying' && result.status === 'finished' && result.timing))
      .filter((result): result is AthleticsResult => Boolean(result));
    candidates.sort((a, b) => selectedEvent.kind === 'track'
      ? parseTrackTiming(a.timing) - parseTrackTiming(b.timing)
      : parseFieldDistance(b.timing) - parseFieldDistance(a.timing));
    const nextStudentIds = candidates.slice(0, 8).map(result => result.studentId);
    const finals = snapshot.finals.map(entry => entry.eventId === selectedEvent.id ? { ...entry, studentIds: nextStudentIds } : entry);
    saveNext({ ...snapshot, finals }, 'Finalists Selected', `${nextStudentIds.length} qualifying competitors were selected. You can still adjust the finals roster manually.`);
  };

  const getResult = (studentId: string, resultStage: AthleticsStage): AthleticsResult => (
    snapshot.results.find(result => result.eventId === selectedEvent?.id && result.studentId === studentId && resultStageOf(result) === resultStage) || {
      eventId: selectedEvent?.id || '',
      studentId,
      stage: resultStage,
      status: 'pending',
      timing: '',
      qualified: false
    }
  );

  const updateResult = (studentId: string, resultStage: AthleticsStage, patch: Partial<AthleticsResult>) => {
    if (!isLoggedIn || !selectedEvent) return;
    const existing = snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === studentId && resultStageOf(result) === resultStage);
    const nextResult: AthleticsResult = {
      eventId: selectedEvent.id,
      studentId,
      stage: resultStage,
      status: existing?.status || 'pending',
      timing: existing?.timing || '',
      position: existing?.position,
      qualified: existing?.qualified || false,
      ...patch
    };
    const results = existing
      ? snapshot.results.map(result => result.eventId === selectedEvent.id && result.studentId === studentId && resultStageOf(result) === resultStage ? nextResult : result)
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
    const timing = next.first === '' && next.second === '' ? '' : `${next.first || '0'}.${(next.second || '0').padStart(2, '0')}`;
    updateResult(studentId, resultStage, { timing });
  };

  const autoRank = () => {
    if (!isLoggedIn || !selectedEvent) return;
    const ranked = currentEnrollment
      .map(studentId => getResult(studentId, stage))
      .filter(result => result.status === 'finished' && Boolean(result.timing));
    ranked.sort((a, b) => selectedEvent.kind === 'track'
      ? parseTrackTiming(a.timing) - parseTrackTiming(b.timing)
      : parseFieldDistance(b.timing) - parseFieldDistance(a.timing));
    const rankMap = new Map(ranked.map((result, index) => [result.studentId, index + 1]));
    const results = snapshot.results.map(result => {
      const resultStage = resultStageOf(result);
      return result.eventId === selectedEvent.id && resultStage === stage && rankMap.has(result.studentId)
        ? { ...result, stage: resultStage, position: rankMap.get(result.studentId) }
        : result;
    });
    saveNext({ ...snapshot, results }, 'Positions Calculated', `${ranked.length} finished competitors ranked in ${stage}.`);
  };

  const eventPointsForStudent = React.useCallback((studentId: string, event: AthleticsEvent) => {
    const qualifying = snapshot.results.find(result => result.eventId === event.id && result.studentId === studentId && resultStageOf(result) === 'qualifying');
    const finalConfig = snapshot.finals.find(entry => entry.eventId === event.id);
    const finalsEnabledForEvent = Boolean(finalConfig?.enabled);
    const finals = finalsEnabledForEvent
      ? snapshot.results.find(result => result.eventId === event.id && result.studentId === studentId && resultStageOf(result) === 'finals')
      : undefined;

    let points = getQualifyingPoints(qualifying);
    if (finalsEnabledForEvent) {
      if (finals?.status === 'finished') points += placementPoints(finals.position);
    } else if (qualifying?.status === 'finished') {
      points += placementPoints(qualifying.position);
    }
    return points;
  }, [snapshot.results, snapshot.finals]);

  const leaderboard = React.useMemo(() => {
    const byHouse = HOUSES.map(house => ({ house, points: 0, athletes: 0 }));
    const houseMap = new Map(byHouse.map(row => [row.house, row]));
    const individual = students.map(student => {
      const points = ATHLETICS_EVENTS.reduce((total, event) => total + eventPointsForStudent(student.id, event), 0);
      if (points > 0) {
        const house = houseMap.get(student.house);
        if (house) house.points += points;
      }
      return { student, points };
    }).filter(row => row.points > 0).sort((a, b) => b.points - a.points || a.student.name.localeCompare(b.student.name));
    byHouse.forEach(row => {
      row.athletes = individual.filter(item => item.student.house === row.house).length;
    });
    return { houses: byHouse.sort((a, b) => b.points - a.points || HOUSES.indexOf(a.house) - HOUSES.indexOf(b.house)), individual };
  }, [students, eventPointsForStudent]);

  const maxHousePoints = Math.max(...leaderboard.houses.map(row => row.points), 0);
  const categoryCount = (category: Category) => students.filter(student => categoryMatches(student.category, category)).length;
  const eventEnrollmentCount = (event: AthleticsEvent) => snapshot.enrollments.find(entry => entry.eventId === event.id)?.studentIds.length || 0;

  const modal = selectedEvent ? (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md">
      <div className="relative flex w-[calc(100vw-1.5rem)] max-w-[1220px] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-[0_30px_100px_rgba(0,0,0,0.72)]">
        <div className="shrink-0 border-b border-primary/15 bg-[#0b121e] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex mt-0.5 size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Icon name={selectedEvent.kind === 'track' ? 'directions_run' : 'sports_handball'} size="23" />
            </div>
            <div className="min-w-0 flex-1 pr-2">
              <div className="royal-kicker mb-1">{selectedCategory} • Athletics 2026</div>
              <h2 className="truncate text-2xl sm:text-3xl font-black tracking-tight text-white">{selectedEvent.name}</h2>
              <div className="mt-1 text-xs sm:text-sm text-slate-400">{selectedEvent.kind === 'track' ? 'Track' : 'Field'} event • {stage === 'qualifying' ? 'Qualifying' : 'Finals'}</div>
            </div>
            <button onClick={() => setSelectedEventId(null)} aria-label="Close event" className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 transition hover:border-primary/30 hover:text-white">
              <Icon name="close" size="22" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-1">
              <button onClick={() => setStage('qualifying')} className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${stage === 'qualifying' ? 'bg-primary/15 text-primary' : 'text-slate-400 hover:text-white'}`}>Qualifying</button>
              {finalsEnabled && <button onClick={() => setStage('finals')} className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${stage === 'finals' ? 'bg-primary/15 text-primary' : 'text-slate-400 hover:text-white'}`}>Finals <span className="ml-1 text-[10px] opacity-70">{finalistIds.length}</span></button>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button disabled={!isLoggedIn} onClick={toggleFinals} className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 ${finalsEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-primary/30'}`}>
                <Icon name={finalsEnabled ? 'check_circle' : 'flag'} size="15" className="mr-2 inline" />{finalsEnabled ? 'Finals Allotted' : 'Allot Finals'}
              </button>
              {stage === 'qualifying' && finalsEnabled && <button disabled={!isLoggedIn} onClick={autoPickFinalists} className="royal-secondary-btn rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-50">Auto-pick Top 8</button>}
            </div>
          </div>

          {stage === 'qualifying' && <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-primary">Event setup</div>
                <div className="mt-1 text-sm text-slate-300">{finalsEnabled ? 'Qualifying and finals are separate. Mark athletes as Qualified, then use Add to Finals explicitly for the athletes who should progress.' : 'This event currently has one qualifying stage. Qualifying positions count toward points because there is no finals stage.'}</div>
              </div>
              <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-400">{qualifyingEnrollment.length} roster entries • {finalistIds.length} finalists</div>
            </div>
          </div>}

          {stage === 'qualifying' && <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2 relative"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size="18" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, computer number, class..." className="royal-input rounded-xl pl-10 pr-4 py-3 w-full text-sm" /></div>
            <select value={houseFilter} onChange={e => setHouseFilter(e.target.value)} className="royal-input rounded-xl px-3 py-3 text-sm"><option>All</option>{HOUSES.map(house => <option key={house}>{house}</option>)}</select>
            {isLoggedIn ? <button onClick={enrollFiltered} className="royal-secondary-btn rounded-xl px-3 py-3 text-xs font-black uppercase tracking-wider">Enroll Eligible ({filteredStudents.filter(student => !qualifyingEnrollment.includes(student.id) && canAddStudent(student.id, selectedEvent).ok).length})</button> : <div />}
          </div>}

          {stage === 'qualifying' && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredStudents.map(student => {
              const enrolled = qualifyingEnrollment.includes(student.id);
              const total = enrolledEventIdsForStudent(student.id).length;
              const limit = canAddStudent(student.id, selectedEvent);
              return <div key={student.id} className={`rounded-xl border p-4 transition-all ${enrolled ? 'border-emerald-500/35 bg-emerald-500/[0.045]' : limit.ok ? 'border-white/10 bg-white/[0.02]' : 'border-rose-500/20 bg-rose-500/[0.03] opacity-60'}`}>
                <button disabled={!isLoggedIn || (!enrolled && !limit.ok)} onClick={() => toggleEnrollment(selectedEvent, student.id)} className="w-full text-left disabled:cursor-not-allowed">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate font-black text-white">{student.name}</div><div className="mt-1 text-[11px] text-slate-400">#{student.id} • Class {student.className}</div><div className="mt-1 text-[10px] font-bold text-primary">{categoryShort(student.category)}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${houseBadge(student.house)}`}>{student.house}</span></div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2"><span className={`text-[10px] font-black uppercase ${enrolled ? 'text-emerald-300' : 'text-slate-500'}`}>{enrolled ? '✓ Enrolled' : 'Not enrolled'}</span><span className="text-[10px] text-slate-500">{total}/3 events</span></div>
                </button>
                {!enrolled && !limit.ok && <div className="mt-2 text-[9px] leading-tight text-rose-300">{limit.reason}</div>}
              </div>;
            })}
          </div>}

          {stage === 'finals' && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.035] p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-black uppercase tracking-wider text-emerald-300">Finals roster</div><div className="mt-1 text-sm text-slate-300">Only athletes explicitly added to finals appear below. Qualifying points stay separate from finals placement points.</div></div><div className="text-xs font-black text-slate-400">{currentEnrollment.length} finalists</div></div></div>}

          <div className="border-t border-white/10 pt-5">
            <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div><h3 className="text-lg font-black text-white">{stage === 'qualifying' ? 'Qualifying Results' : 'Finals Results'}</h3><p className="mt-1 text-xs text-slate-400">{selectedEvent.kind === 'track' ? 'Enter minutes, seconds and milliseconds separately.' : 'Enter metres and centimetres separately.'}</p></div>
              <div className="flex flex-wrap gap-2">{isLoggedIn && <button onClick={autoRank} className="royal-primary-btn rounded-xl px-4 py-2 text-xs font-black uppercase">Auto-Rank</button>}{isLoggedIn && stage === 'qualifying' && <button onClick={clearRoster} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase text-rose-300">Clear</button>}</div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="royal-data-table min-w-[1160px]">
                <thead><tr><th>Competitor</th><th>House</th><th>Status</th><th>{selectedEvent.kind === 'track' ? 'Time' : 'Distance'}</th><th>Position</th>{stage === 'qualifying' && <th>Qualification</th>}{stage === 'qualifying' && finalsEnabled && <th>Finals</th>}</tr></thead>
                <tbody>
                  {currentEnrollment.length === 0 ? <tr><td colSpan={stage === 'qualifying' && finalsEnabled ? 7 : stage === 'qualifying' ? 6 : 5} className="py-10 text-center text-slate-500">{stage === 'finals' ? 'No finalists have been allotted yet.' : 'No students enrolled in this event.'}</td></tr> : currentEnrollment.map(studentId => {
                    const student = studentMap.get(studentId);
                    if (!student) return null;
                    const result = getResult(student.id, stage);
                    const qual = getResult(student.id, 'qualifying');
                    const qualified = Boolean(qual.qualified);
                    const finalist = finalistIds.includes(student.id);
                    const key = `${stage}:${student.id}`;
                    const trackParts = splitTrackTiming(result.timing);
                    const fieldParts = splitFieldDistance(result.timing);
                    return <tr key={student.id} className={stage === 'qualifying' && qualified ? 'bg-emerald-500/[0.035]' : ''}>
                      <td><div className={`font-black ${stage === 'qualifying' && qualified ? 'text-emerald-200' : 'text-white'}`}>{qualified && stage === 'qualifying' ? '✓ ' : ''}{student.name}</div><div className="text-[10px] text-slate-500">#{student.id} • {categoryShort(student.category)}</div></td>
                      <td><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${houseBadge(student.house)}`}>{student.house}</span></td>
                      <td><select disabled={!isLoggedIn} value={result.status} onChange={e => updateResult(student.id, stage, { status: e.target.value as AthleticsResultStatus })} className={`royal-input rounded-lg px-2 py-2 text-xs ${statusStyle(result.status)}`}>{RESULT_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></td>
                      <td>{selectedEvent.kind === 'track' ? <div className="flex min-w-[280px] items-center gap-2"><div className="flex-1"><input aria-label={`${student.name} minutes`} disabled={!isLoggedIn} type="number" min="0" max="999" value={trackParts.first} onChange={e => updateTrackPart(student.id, stage, 'first', e.target.value, 999)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" placeholder="0" /><div className="mt-1 text-center text-[8px] uppercase tracking-wider text-slate-600">Min</div></div><span className="font-black text-slate-600">:</span><div className="flex-1"><input aria-label={`${student.name} seconds`} disabled={!isLoggedIn} type="number" min="0" max="59" value={trackParts.second} onChange={e => updateTrackPart(student.id, stage, 'second', e.target.value, 59)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" placeholder="0" /><div className="mt-1 text-center text-[8px] uppercase tracking-wider text-slate-600">Sec</div></div><span className="font-black text-slate-600">:</span><div className="flex-1"><input aria-label={`${student.name} milliseconds`} disabled={!isLoggedIn} type="number" min="0" max="999" value={trackParts.third} onChange={e => updateTrackPart(student.id, stage, 'third', e.target.value, 999)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" placeholder="0" /><div className="mt-1 text-center text-[8px] uppercase tracking-wider text-slate-600">MS</div></div></div> : <div className="flex min-w-[220px] items-center gap-2"><div className="flex-1"><input aria-label={`${student.name} metres`} disabled={!isLoggedIn} type="number" min="0" max="999" value={fieldParts.first} onChange={e => updateFieldPart(student.id, stage, 'first', e.target.value)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" placeholder="0" /><div className="mt-1 text-center text-[8px] uppercase tracking-wider text-slate-600">Metres</div></div><span className="font-black text-slate-600">.</span><div className="flex-1"><input aria-label={`${student.name} centimetres`} disabled={!isLoggedIn} type="number" min="0" max="99" value={fieldParts.second} onChange={e => updateFieldPart(student.id, stage, 'second', e.target.value)} className="royal-input w-full rounded-lg px-2 py-2 text-center font-mono text-sm" placeholder="00" /><div className="mt-1 text-center text-[8px] uppercase tracking-wider text-slate-600">Centimetres</div></div></div>}{savedStudent === key && <span className="ml-2 text-xs text-emerald-400">✓</span>}</td>
                      <td><input disabled={!isLoggedIn} type="number" min="1" value={result.position || ''} onChange={e => updateResult(student.id, stage, { position: e.target.value ? Number(e.target.value) : undefined })} placeholder="#" className="royal-input w-20 rounded-lg px-2 py-2 text-center text-xs" /></td>
                      {stage === 'qualifying' && <td><button disabled={!isLoggedIn} onClick={() => toggleQualified(student.id)} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${qualified ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)]' : 'border-white/10 bg-white/[0.025] text-slate-400 hover:border-emerald-500/30 hover:text-emerald-300'}`}>{qualified ? '✓ Qualified' : 'Qualified'}</button></td>}
                      {stage === 'qualifying' && finalsEnabled && <td><button disabled={!isLoggedIn} onClick={() => toggleFinalist(student.id)} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${finalist ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 bg-white/[0.025] text-slate-300 hover:border-primary/30 hover:text-primary'}`}>{finalist ? '✓ In Finals' : 'Add to Finals'}</button></td>}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return <div className="mx-auto max-w-[1500px] space-y-7 pb-12">
    <section className="flex flex-col gap-5 border-b border-primary/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div><div className="royal-kicker mb-2">Track & Field Desk</div><h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Athletics 2026</h1><p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">12 athletics events across every eligible category. Each student may enter a maximum of three events, with only 2 track + 1 field or 2 field + 1 track combinations permitted.</p></div>
      <div className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider ${isLoggedIn ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}><Icon name={isLoggedIn ? 'verified_user' : 'lock'} size="17" className="mr-2 inline" />{isLoggedIn ? 'Staff Editing Active' : 'Read Only Mode'}</div>
    </section>

    <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1">
        <button onClick={() => setPageTab('events')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${pageTab === 'events' ? 'bg-primary/15 text-primary shadow-inner' : 'text-slate-400 hover:text-white'}`}><Icon name="sprint" size="15" className="mr-2 inline" />Events</button>
        <button onClick={() => setPageTab('leaderboard')} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${pageTab === 'leaderboard' ? 'bg-primary/15 text-primary shadow-inner' : 'text-slate-400 hover:text-white'}`}><Icon name="leaderboard" size="15" className="mr-2 inline" />Leaderboard</button>
      </div>
      <div className="text-xs text-slate-500">Scoring is calculated live from qualifying and finals results.</div>
    </section>

    {pageTab === 'events' ? <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Events', ATHLETICS_EVENTS.length], ['Categories', CATEGORIES.length], ['Track Events', TRACK_EVENTS.size], ['Field Events', FIELD_EVENTS.size]].map(([label, value]) => <div key={String(label)} className="glass-panel rounded-xl border border-primary/10 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-3xl font-black text-white">{value}</div></div>)}
      </section>

      <section className="space-y-4"><div><div className="royal-kicker mb-1">Competition Categories</div><h2 className="text-2xl font-black text-white">Choose a category</h2><p className="mt-1 text-xs text-slate-400">Every category below contains the complete collection of 12 event cards.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{CATEGORIES.map(category => <button key={category} onClick={() => setSelectedCategory(category)} className={`rounded-xl border px-3 py-3 text-left transition-all ${selectedCategory === category ? 'border-primary/50 bg-primary/10 text-white shadow-lg shadow-primary/10' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-primary/25 hover:text-white'}`}><div className="text-sm font-black">{category}</div><div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{categoryCount(category)} students</div></button>)}</div>
      </section>

      <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="royal-kicker mb-1">{selectedCategory}</div><h2 className="text-2xl font-black text-white">Event Cards</h2></div><div className="text-xs text-slate-400">6 Track • 6 Field • 12 total</div></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{ATHLETICS_EVENTS.map(event => { const count = eventEnrollmentCount(event); const finals = snapshot.finals.find(entry => entry.eventId === event.id); const isTrack = event.kind === 'track'; return <button key={event.id} onClick={() => setSelectedEventId(event.id)} className="glass-panel group rounded-2xl border border-primary/10 p-5 text-left transition-all hover:border-primary/40 hover:bg-white/[0.04]"><div className="flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${isTrack ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-sky-500/30 bg-sky-500/10 text-sky-300'}`}>{isTrack ? 'Track' : 'Field'}</span><h3 className="mt-3 text-xl font-black text-white transition-colors group-hover:text-primary">{event.name}</h3></div><Icon name={isTrack ? 'directions_run' : 'sports_handball'} className="text-[27px] text-primary" /></div><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><div className="text-[9px] font-black uppercase text-slate-500">Enrolled</div><div className="mt-0.5 text-lg font-black text-white">{count}</div></div><div className="rounded-lg border border-white/5 bg-white/[0.03] p-3"><div className="text-[9px] font-black uppercase text-slate-500">Finals</div><div className={`mt-1 text-sm font-black ${finals?.enabled ? 'text-emerald-300' : 'text-slate-500'}`}>{finals?.enabled ? 'Allotted' : 'Qualifying only'}</div></div></div><div className="mt-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary">Open event <Icon name="arrow_forward" size="13" /></div></button>; })}</div>
      </section>
    </> : <section className="space-y-5">
      <div><div className="royal-kicker mb-1">Athletics Championship</div><h2 className="text-3xl font-black text-white">House Leaderboard</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">Live house standings across all athletics events and categories. Qualifying gives 1 point. Placement points are 4/3/2/1 for 1st/2nd/3rd/4th, and when an event has finals, only finals positions receive those bonus points.</p></div>

      <div className="glass-panel rounded-2xl border border-primary/10 p-5 sm:p-6"><div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-black text-white">House standings</h3><p className="mt-1 text-xs text-slate-500">Bars are scaled to the current highest-scoring house.</p></div><div className="text-xs font-black uppercase tracking-wider text-primary">Total House Points</div></div>
        <div className="space-y-5">{leaderboard.houses.map((row, index) => { const width = maxHousePoints > 0 ? Math.max(5, (row.points / maxHousePoints) * 100) : 5; return <div key={row.house}><div className="mb-2 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="w-7 text-sm font-black text-slate-500">#{index + 1}</div><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${houseBadge(row.house)}`}>{row.house}</span><span className="truncate text-xs text-slate-500">{row.athletes} scoring athlete{row.athletes === 1 ? '' : 's'}</span></div><div className="text-lg font-black text-white">{row.points} pts</div></div><div className="h-4 overflow-hidden rounded-full border border-white/10 bg-white/[0.035]"><div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(201,163,74,0.26),rgba(201,163,74,0.92),rgba(255,244,189,0.98))] shadow-[0_0_24px_rgba(201,163,74,0.18)] transition-all duration-500" style={{ width: `${width}%` }} /></div></div>})}</div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl border border-primary/10 p-5"><h3 className="text-lg font-black text-white">Scoring rules</h3><div className="mt-4 space-y-2 text-sm text-slate-300"><div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"><span>Qualifying</span><b className="text-primary">+1</b></div><div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"><span>1st place</span><b className="text-primary">+4</b></div><div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"><span>2nd place</span><b className="text-primary">+3</b></div><div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"><span>3rd place</span><b className="text-primary">+2</b></div><div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"><span>4th place</span><b className="text-primary">+1</b></div><p className="pt-2 text-xs leading-relaxed text-slate-500">The qualifying point contributes to both the athlete and their house. If an event has finals, qualifying position is ignored for bonus points and only finals position can add +4/+3/+2/+1.</p></div></div>

        <div className="glass-panel rounded-2xl border border-primary/10 p-5"><div className="flex items-end justify-between gap-3"><div><h3 className="text-lg font-black text-white">Top individual scorers</h3><p className="mt-1 text-xs text-slate-500">Points accumulated across all events entered.</p></div><div className="text-xs font-black uppercase tracking-wider text-primary">{leaderboard.individual.length} scorers</div></div><div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto custom-scrollbar pr-1">{leaderboard.individual.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">No points have been recorded yet.</div> : leaderboard.individual.slice(0, 12).map((row, index) => <div key={row.student.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3"><div className="flex min-w-0 items-center gap-3"><div className="w-6 text-xs font-black text-slate-600">{index + 1}</div><div className="min-w-0"><div className="truncate text-sm font-black text-white">{row.student.name}</div><div className="mt-0.5 text-[10px] text-slate-500">{row.student.house} • {categoryShort(row.student.category)}</div></div></div><div className="shrink-0 text-sm font-black text-primary">{row.points}</div></div>)}</div></div>
      </div>
    </section>}

    {selectedEvent && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
  </div>;
};

export default Athletics;
