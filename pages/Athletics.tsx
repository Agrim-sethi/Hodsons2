import React from 'react';
import { createPortal } from 'react-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';

/* ─── Injected animation keyframes ─────────────────────────────────────── */
const ANIM_STYLES = `
  @keyframes ath-card-in {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  @keyframes ath-tick-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-20deg); }
    55%  { opacity: 1; transform: scale(1.25) rotate(4deg); }
    75%  { transform: scale(0.92) rotate(-2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes ath-tick-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.6) translateY(-4px); }
  }
  @keyframes ath-tab-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ath-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes ath-modal-in {
    from { opacity: 0; transform: scale(0.94) translateY(16px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes ath-badge-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201,163,74,0); }
    50%       { box-shadow: 0 0 0 6px rgba(201,163,74,0.18); }
  }
  @keyframes ath-row-flash {
    0%   { background: rgba(16,185,129,0.18); }
    100% { background: transparent; }
  }
  .ath-card-in       { animation: ath-card-in 0.45s cubic-bezier(.22,.68,0,1.2) both; }
  .ath-tab-in        { animation: ath-tab-in  0.22s ease both; }
  .ath-modal-in      { animation: ath-modal-in 0.28s cubic-bezier(.22,.68,0,1.15) both; }
  .ath-shimmer-border {
    position: relative;
  }
  .ath-shimmer-border::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(120deg, transparent 20%, rgba(201,163,74,0.45) 50%, transparent 80%);
    background-size: 200% 100%;
    animation: ath-shimmer 2.8s linear infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .ath-shimmer-border:hover::before { opacity: 1; }
  .ath-row-flash { animation: ath-row-flash 1.2s ease forwards; }
`;
import { Icon } from '../components/Icon';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import { useStaffAuth } from '../components/auth/StaffAuthProvider';
import { HOUSE_COLORS } from '../constants';
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
  AthleticsDepartment
} from '../utils/athleticsStorage';
import { AthleticsEventStats, buildAthleticsDerivedData } from '../utils/athleticsDerived';

const HOUSES = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'] as const;
const RESULT_STATUSES: AthleticsResultStatus[] = ['pending', 'finished', 'dnf', 'absent', 'medically_excused'];

const houseConfig = (house: string) => {
  const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
  return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const statusLabel = (status: string) => {
  switch (status as AthleticsResultStatus) {
    case 'medically_excused': return 'Medical Leave';
    case 'dnf': return 'DNF';
    case 'absent': return 'Absent';
    case 'finished': return 'Finished';
    case 'pending': return 'Pending';
    default: return status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
};

const statusBadgeStyle = (status: AthleticsResultStatus) => {
  switch (status) {
    case 'finished': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'dnf': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'absent': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'medically_excused': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
};

const downloadWorkbook = (filename: string, rows: Record<string, any>[]) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Athletics 2026');
  XLSX.writeFile(workbook, filename);
};

/* ─── Saved-tick component ──────────────────────────────────────────────── */
const SavedTick: React.FC<{ visible: boolean }> = ({ visible }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'rgba(16,185,129,0.18)',
      border: '1.5px solid rgba(16,185,129,0.5)',
      animation: visible ? 'ath-tick-pop 0.45s cubic-bezier(.22,.68,0,1.3) both' : 'ath-tick-out 0.3s ease forwards',
      flexShrink: 0,
      pointerEvents: 'none',
    }}
    title="Saved"
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const StatTile = ({ label, value, accent = 'text-white', icon }: { label: string; value: React.ReactNode; accent?: string; icon?: string }) => (
  <div className="rounded-xl border border-primary/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 flex flex-col justify-between shadow-lg shadow-black/20 relative overflow-hidden group hover:border-primary/20 transition-all">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{label}</span>
      {icon && <Icon name={icon} className="text-primary/40 text-[16px] group-hover:text-primary/70 transition-colors" />}
    </div>
    <span className={`text-2xl sm:text-3xl font-black leading-none mt-2 tracking-tight ${accent}`}>{value}</span>
  </div>
);

const AthleticsPodium = ({ stats }: { stats: AthleticsEventStats }) => {
  const steps = [
    { athlete: stats.podium[1], rank: 2, height: 'h-24 sm:h-28', badgeColor: 'from-slate-400/30 to-slate-600/30 border-slate-300/40 text-slate-200', medal: '🥈', label: '2nd' },
    { athlete: stats.podium[0], rank: 1, height: 'h-32 sm:h-36', badgeColor: 'from-amber-400/40 to-yellow-600/40 border-amber-300/60 text-amber-200 shadow-[0_0_15px_rgba(201,163,74,0.3)]', medal: '🥇', label: '1st' },
    { athlete: stats.podium[2], rank: 3, height: 'h-20 sm:h-24', badgeColor: 'from-amber-800/30 to-amber-950/30 border-amber-700/40 text-amber-300', medal: '🥉', label: '3rd' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end min-h-[220px] sm:min-h-[250px] pt-4">
      {steps.map(({ athlete, rank, height, badgeColor, medal, label }) => {
        const config = athlete ? houseConfig(athlete.house) : HOUSE_COLORS.nilgiri;
        return (
          <div key={rank} className="flex flex-col items-center justify-end min-w-0">
            <div className="min-h-[90px] mb-2 flex flex-col items-center justify-end text-center w-full px-1">
              {athlete ? (
                <>
                  <div className="text-base mb-0.5">{medal}</div>
                  <span className="text-xs font-black text-white w-full truncate" title={athlete.name}>
                    {athlete.name}
                  </span>
                  <span className={`mt-1 rounded-full border ${config.border}/40 ${config.bg}/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${config.text} shrink-0`}>
                    {athlete.house}
                  </span>
                  <span className="mt-1 text-[10px] font-extrabold text-amber-300/90 font-mono">
                    {athlete.timing || 'No time'}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center opacity-40">
                  <span className="text-xs font-bold text-slate-500 italic">Unassigned</span>
                  <span className="text-[10px] text-slate-600">Pending</span>
                </div>
              )}
            </div>
            <div className={`w-full ${height} rounded-t-xl border-t-4 ${athlete ? config.border : 'border-white/10'} bg-gradient-to-t ${athlete ? config.gradient : 'from-white/5 to-white/10'} flex flex-col items-center justify-start pt-3 shadow-xl shadow-black/40 relative overflow-hidden`}>
              <div className={`rounded-full bg-gradient-to-b ${badgeColor} border px-2.5 py-0.5 text-xs font-black tracking-wider uppercase shadow-md`}>
                {label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const EventCard: React.FC<{stats: AthleticsEventStats; onOpen: () => void; animDelay?: number}> = ({ stats, onOpen, animDelay = 0 }) => {
  const typeBadge = {
    sprint: { label: 'Sprint', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: 'sprint' },
    middle_distance: { label: 'Middle Distance', bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', icon: 'directions_run' },
    distance: { label: 'Distance', bg: 'bg-blue-500/10 text-blue-300 border-blue-500/30', icon: 'timer' },
    relay: { label: 'Relay', bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30', icon: 'military_tech' }
  }[stats.event.type] || { label: stats.event.type, bg: 'bg-slate-500/10 text-slate-300 border-slate-500/30', icon: 'sprint' };

  const totalPoints = HOUSES.reduce((sum, house) => sum + stats.houseStats[house].points, 0);

  return (
    <div
      onClick={onOpen}
      style={{ animationDelay: `${animDelay}ms` }}
      className="ath-card-in ath-shimmer-border glass-panel rounded-2xl border border-primary/15 p-6 hover:border-primary/50 hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer shadow-xl shadow-black/30 hover:-translate-y-1.5 hover:shadow-primary/10 relative overflow-hidden flex flex-col justify-between"
    >
      {/* Animated glow orb */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/12 group-hover:scale-125 transition-all duration-500" />
      {/* Bottom edge shimmer line */}
      <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="royal-kicker">Athletics 2026</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${typeBadge.bg}`}>
                {typeBadge.label}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white leading-tight tracking-tight group-hover:text-primary transition-colors duration-200">{stats.event.name}</h3>
          </div>
          <div className="size-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary flex items-center justify-center group-hover:scale-115 group-hover:rotate-3 group-hover:border-primary/50 transition-all duration-300 shadow-md shrink-0">
            <Icon name={typeBadge.icon} className="text-[26px]" />
          </div>
        </div>

        <div className="mt-5 border-t border-b border-primary/10 py-4 my-4">
          <AthleticsPodium stats={stats} />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
          <StatTile label="Enrolled" value={stats.enrolled} icon="groups" />
          <StatTile label="Finished" value={stats.finished} accent="text-emerald-400" icon="check_circle" />
          <StatTile label="Best Timing" value={stats.bestTiming || '--'} accent="text-amber-300 font-mono text-xl sm:text-2xl" icon="timer" />
          <StatTile label="House Points" value={totalPoints} accent="text-white" icon="emoji_events" />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 font-semibold">
          <span>Click to view detailed rosters & results</span>
          <span className="text-primary font-black uppercase text-[11px] tracking-wider flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform duration-200">
            Open Event <Icon name="arrow_forward" size="14" />
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Athletics page ───────────────────────────────────────────────────── */
const Athletics: React.FC = () => {
  const { showToast } = useToast();
  const { isLoggedIn } = useStaffAuth();
  const [snapshot, setSnapshot] = React.useState<AthleticsSnapshot>(getAthleticsSnapshot());
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'enrollments' | 'results'>('overview');
  const [tabKey, setTabKey] = React.useState(0); // bump to retrigger tab animation
  const [studentSearch, setStudentSearch] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState<'All' | 'PDB' | 'PDG' | 'BD' | 'GD'>('All');
  const [houseFilter, setHouseFilter] = React.useState<'All' | typeof HOUSES[number]>('All');
  const [savedStudentId, setSavedStudentId] = React.useState<string | null>(null); // for saved-tick animation

  const students = React.useMemo(
    () => getPrepAthleticsStudents(studentClasses as Record<string, string>),
    []
  );

  React.useEffect(() => {
    setSnapshot(getAthleticsSnapshot());
    return subscribeToAthleticsData(setSnapshot);
  }, []);

  // Close modal on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEventId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const derived = React.useMemo(
    () => buildAthleticsDerivedData(snapshot.enrollments, snapshot.results, students),
    [snapshot, students]
  );

  const selectedStats = selectedEventId ? derived.eventStats.find(stats => stats.event.id === selectedEventId) || null : null;
  const selectedEvent = selectedStats?.event || ATHLETICS_EVENTS[0];
  const enrolledIds = selectedStats ? snapshot.enrollments.find(entry => entry.eventId === selectedEvent.id)?.studentIds || [] : [];
  const studentMap = React.useMemo(() => new Map(students.map(student => [student.id, student])), [students]);
  const enrolledStudents = enrolledIds.map(id => studentMap.get(id)).filter(Boolean) as typeof students;

  const saveNextSnapshot = (nextSnapshot: AthleticsSnapshot, toastTitle: string, description: string) => {
    setSnapshot(nextSnapshot);
    saveAthleticsSnapshot(nextSnapshot);
    showToast({ title: toastTitle, description });
  };

  const toggleEnrollment = (event: AthleticsEvent, studentId: string) => {
    if (!isLoggedIn) return;
    const nextEnrollments = snapshot.enrollments.map(entry => {
      if (entry.eventId !== event.id) return entry;
      const exists = entry.studentIds.includes(studentId);
      return {
        ...entry,
        studentIds: exists
          ? entry.studentIds.filter(id => id !== studentId)
          : [...entry.studentIds, studentId]
      };
    });

    const nextResults = nextEnrollments.find(entry => entry.eventId === event.id)?.studentIds.includes(studentId)
      ? snapshot.results
      : snapshot.results.filter(result => !(result.eventId === event.id && result.studentId === studentId));

    saveNextSnapshot(
      { enrollments: nextEnrollments, results: nextResults },
      'Enrollment Updated',
      'The Athletics event roster has been updated.'
    );
  };

  const enrollAllFiltered = () => {
    if (!isLoggedIn || !selectedEvent) return;
    const toAddIds = filteredStudents.map(s => s.id);
    const existing = snapshot.enrollments.find(entry => entry.eventId === selectedEvent.id)?.studentIds || [];
    const merged = Array.from(new Set([...existing, ...toAddIds]));

    const nextEnrollments = snapshot.enrollments.map(entry =>
      entry.eventId === selectedEvent.id ? { ...entry, studentIds: merged } : entry
    );

    saveNextSnapshot(
      { enrollments: nextEnrollments, results: snapshot.results },
      'Bulk Enrolled',
      `Enrolled ${toAddIds.length} students into ${selectedEvent.name}.`
    );
  };

  const clearAllEnrollments = () => {
    if (!isLoggedIn || !selectedEvent) return;
    if (!window.confirm(`Are you sure you want to remove ALL enrollments from ${selectedEvent.name}?`)) return;

    const nextEnrollments = snapshot.enrollments.map(entry =>
      entry.eventId === selectedEvent.id ? { ...entry, studentIds: [] } : entry
    );
    const nextResults = snapshot.results.filter(result => result.eventId !== selectedEvent.id);

    saveNextSnapshot(
      { enrollments: nextEnrollments, results: nextResults },
      'Enrollments Cleared',
      `Cleared all roster entries for ${selectedEvent.name}.`
    );
  };

  const updateResult = (studentId: string, patch: Partial<AthleticsResult>) => {
    if (!isLoggedIn) return;
    const existing = snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === studentId);
    const nextResult: AthleticsResult = {
      eventId: selectedEvent.id,
      studentId,
      status: existing?.status || 'pending',
      timing: existing?.timing || '',
      position: existing?.position,
      ...patch
    };

    const nextResults = existing
      ? snapshot.results.map(result => result.eventId === selectedEvent.id && result.studentId === studentId ? nextResult : result)
      : [...snapshot.results, nextResult];

    saveNextSnapshot(
      { ...snapshot, results: nextResults },
      'Result Saved',
      'The Athletics result table and charts have been updated.'
    );

    // Trigger the saved-tick animation for this row
    setSavedStudentId(studentId);
    setTimeout(() => setSavedStudentId(null), 2000);
  };

  const autoRankEvent = () => {
    if (!isLoggedIn) return;
    const finishedResults = enrolledIds
      .map(studentId => snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === studentId))
      .filter((result): result is AthleticsResult => Boolean(result && result.status === 'finished' && result.timing))
      .sort((a, b) => {
        const parse = (timing = '') => {
          const parts = timing.split(':').map(segment => parseInt(segment, 10));
          if (parts.some(value => Number.isNaN(value))) return Number.POSITIVE_INFINITY;
          if (parts.length === 3) return (parts[0] * 60) + parts[1] + parts[2] / 100;
          if (parts.length === 2) return parts[0] * 60 + parts[1];
          return parts[0];
        };
        return parse(a.timing) - parse(b.timing);
      });

    const rankMap = new Map(finishedResults.map((result, index) => [result.studentId, index + 1]));
    const nextResults = snapshot.results.map(result => {
      if (result.eventId !== selectedEvent.id || !rankMap.has(result.studentId)) return result;
      return { ...result, position: rankMap.get(result.studentId) };
    });

    saveNextSnapshot({ ...snapshot, results: nextResults }, 'Positions Calculated', `Ranked ${finishedResults.length} finish timings automatically.`);
  };

  const exportAllResults = () => {
    const rows = ATHLETICS_EVENTS.flatMap(event => {
      const ids = snapshot.enrollments.find(entry => entry.eventId === event.id)?.studentIds || [];
      return ids.map(studentId => {
        const student = studentMap.get(studentId);
        const result = snapshot.results.find(entry => entry.eventId === event.id && entry.studentId === studentId);
        return {
          Event: event.name,
          ComputerNumber: studentId,
          Name: student?.name || '',
          Class: student?.className || '',
          Department: student?.department || '',
          House: student?.house || '',
          Status: result ? statusLabel(result.status) : 'Pending',
          Timing: result?.timing || '',
          Position: result?.position || ''
        };
      });
    });
    downloadWorkbook(`Athletics 2026 Results ${new Date().toISOString().slice(0, 10)}.xlsx`, rows);
  };

  const exportEventRoster = () => {
    const rows = enrolledStudents.map(student => {
      const result = snapshot.results.find(entry => entry.eventId === selectedEvent.id && entry.studentId === student.id);
      return {
        Event: selectedEvent.name,
        ComputerNumber: student.id,
        Name: student.name,
        Class: student.className,
        Department: student.department,
        House: student.house,
        Status: result ? statusLabel(result.status) : 'Pending',
        Timing: result?.timing || '',
        Position: result?.position || ''
      };
    });
    downloadWorkbook(`Athletics 2026 ${selectedEvent.name} Roster.xlsx`, rows);
  };

  const [eventDeptFilter, setEventDeptFilter] = React.useState<'All' | 'BD' | 'GD' | 'PD'>('All');

  const filteredEventStats = React.useMemo(() => {
    let events = derived.eventStats;
    if (eventDeptFilter !== 'All') {
      events = events.filter(stats => {
        const depts = stats.event.departments as string[];
        if (eventDeptFilter === 'PD') {
          return depts.includes('PDB') || depts.includes('PDG');
        }
        return depts.includes(eventDeptFilter);
      });
    }
    // Simple sort by event name
    return events.slice().sort((a, b) => a.event.name.localeCompare(b.event.name));
  }, [derived.eventStats, eventDeptFilter]);

  // UI dashboard for sorting events
  const eventDashboard = (
    <div className="flex items-center gap-4 mb-4">
      <span className="text-sm font-black text-white">Sort Events By Department:</span>
      <select
        value={eventDeptFilter}
        onChange={e => setEventDeptFilter(e.target.value as any)}
        className="royal-input rounded-xl px-3 py-2.5 text-sm"
      >
        <option value="All">All</option>
        <option value="BD">BD</option>
        <option value="GD">GD</option>
        <option value="PD">Prep (PDB/PDG)</option>
      </select>
    </div>
  );

  const filteredStudents = React.useMemo(() => students.filter(student => {
    const matchesDepartment = departmentFilter === 'All' ||
      (departmentFilter === 'PD' ? (student.department === 'PDB' || student.department === 'PDG') : student.department === departmentFilter);
    const matchesHouse = houseFilter === 'All' || student.house === houseFilter;
    const query = studentSearch.trim().toLowerCase();
    const matchesSearch = !query || [student.id, student.name, student.house, student.className].some(value => value.toLowerCase().includes(query));
    return matchesDepartment && matchesHouse && matchesSearch;
  }), [students, departmentFilter, houseFilter, studentSearch]);

  const resultRows = enrolledStudents.map(student => ({
    student,
    result: snapshot.results.find(result => result.eventId === selectedEvent.id && result.studentId === student.id) || {
      eventId: selectedEvent.id,
      studentId: student.id,
      status: 'pending' as const
    }
  }));

  const houseChartData = selectedStats
    ? HOUSES.map(house => ({
      name: house,
      points: selectedStats.houseStats[house].points,
      enrolled: selectedStats.houseStats[house].enrolled,
      finished: selectedStats.houseStats[house].finished,
      color: houseConfig(house).hex
    }))
    : [];

  const statusPieData = [
    { name: 'Finished', value: selectedStats?.finished || 0, color: '#10b981' },
    { name: 'DNF', value: selectedStats?.dnf || 0, color: '#f59e0b' },
    { name: 'Absent', value: selectedStats?.absent || 0, color: '#ef4444' },
    { name: 'Medical Leave', value: selectedStats?.med || 0, color: '#a855f7' },
    { name: 'Pending', value: selectedStats ? Math.max(selectedStats.enrolled - selectedStats.resulted, 0) : 0, color: '#475569' }
  ].filter(entry => entry.value > 0);

  return (
    <div className="max-w-[1500px] mx-auto space-y-8 pb-12">
      {/* Inject animation CSS once */}
      <style>{ANIM_STYLES}</style>
      {/* Top Banner Section */}
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between border-b border-primary/10 pb-6">
        <div>
          <div className="royal-kicker mb-2">Track Desk</div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Athletics 2026</h1>
          <p className="text-slate-400 mt-2 max-w-3xl text-sm sm:text-base leading-relaxed">
            Track & Field Desk for Prep Boys (PDB) and Prep Girls (PDG). Manage event enrollments, record times, auto-calculate ranks, and monitor house standings.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportAllResults} className="royal-secondary-btn rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg">
            <Icon name="download" className="text-[18px]" />
            Export All Results
          </button>
          <div className={`rounded-xl border px-5 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2.5 shadow-lg transition-all ${isLoggedIn ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-primary/20 bg-white/[0.03] text-slate-400'}`}>
            <Icon name={isLoggedIn ? 'verified_user' : 'lock'} className="text-[18px]" />
            {isLoggedIn ? 'Staff Editing Active' : 'Read Only Mode'}
          </div>
        </div>
      </section>

      {/* Top Summary Stat Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Events" value={ATHLETICS_EVENTS.length} accent="text-amber-400 font-mono" icon="sprint" />
        <StatTile label="Total Enrollments" value={derived.eventStats.reduce((sum, event) => sum + event.enrolled, 0)} icon="groups" />
        <StatTile label="Total Finished" value={derived.eventStats.reduce((sum, event) => sum + event.finished, 0)} accent="text-emerald-400" icon="check_circle" />
        <StatTile
          label="Leading House"
          value={derived.standings[0]?.name || '--'}
          accent={derived.standings[0] ? houseConfig(derived.standings[0].name).text : 'text-slate-400'}
          icon="emoji_events"
        />
      </section>

      {/* House Standings Overview */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 glass-panel rounded-2xl border border-primary/15 p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <div className="royal-kicker mb-1">Live Leaderboard</div>
              <h2 className="text-2xl font-black text-white">House Standings</h2>
              <p className="text-xs text-slate-400 mt-0.5">Points calculated from top-5 finishes across all prep events (1st: 5pts, 2nd: 4pts, 3rd: 3pts, 4th: 2pts, 5th: 1pt)</p>
            </div>
            <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Icon name="leaderboard" className="text-[28px]" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.standings} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 13, fontWeight: 900 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(201,163,74,0.3)', borderRadius: 12, color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                  formatter={(value: any) => [`${value} Points`, 'Total Score']}
                />
                <Bar dataKey="points" radius={[0, 8, 8, 0]}>
                  {derived.standings.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HOUSES.map(house => {
            const config = houseConfig(house);
            const standingsEntry = derived.standings.find(entry => entry.name === house);
            const points = standingsEntry?.points || 0;
            const rank = derived.standings.findIndex(entry => entry.name === house) + 1;

            return (
              <div key={house} className="glass-panel rounded-2xl border border-primary/15 p-5 shadow-xl hover:border-primary/30 transition-all flex flex-col justify-between relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 ${config.bg}/10 rounded-full blur-xl pointer-events-none`} />
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-xl ${config.bg}/20 ${config.text} border ${config.border}/40 flex items-center justify-center font-black text-lg shadow-md`}>
                      {house[0]}
                    </div>
                    <div>
                      <span className={`font-black text-lg ${config.text}`}>{house}</span>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">House</div>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-amber-300 font-mono">
                    #{rank}
                  </span>
                </div>
                <div>
                  <div className="text-4xl font-black text-white tracking-tight">{points}</div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-500 mt-1">Total Athletics Points</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Events Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Athletics Events Desk</h2>
            <p className="text-xs text-slate-400">Select an event card to manage roster enrollments, record finished timings, or auto-calculate positions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {eventDashboard}
          {derived.eventStats.map((stats, index) => (
            <EventCard
              key={stats.event.id}
              stats={stats}
              animDelay={index * 70}
              onOpen={() => {
                setSelectedEventId(stats.event.id);
                setActiveTab('overview');
                setTabKey(k => k + 1);
              }}
            />
          ))}
        </div>
      </section>

      {/* PORTAL MODAL FOR EVENT DETAILS */}
      {selectedStats && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-lg"
            style={{ animation: 'ath-tab-in 0.18s ease both' }}
            onClick={() => setSelectedEventId(null)}
          />

          {/* Modal Box */}
          <div className="ath-modal-in relative w-full max-w-6xl my-auto max-h-[92vh] overflow-hidden rounded-2xl border border-primary/25 bg-[#0b121e] shadow-2xl flex flex-col z-[10000]">
            <ModalHeader
              kicker="Athletics 2026 Event Desk"
              icon="sprint"
              title={selectedEvent.name}
              subtitle={`${selectedStats.enrolled} enrolled • ${selectedStats.finished} finished • ${HOUSES.reduce((sum, house) => sum + selectedStats.houseStats[house].points, 0)} house points awarded`}
              onClose={() => setSelectedEventId(null)}
            />

            {/* Modal Subnav Toolbar */}
            <div className="border-b border-primary/15 bg-white/[0.02] px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {(['overview', 'enrollments', 'results'] as const).map(tab => {
                  const icons = { overview: 'analytics', enrollments: 'groups', results: 'fact_check' };
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setTabKey(k => k + 1); }}
                      className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                      style={active ? { animation: 'ath-badge-pulse 2s ease-in-out infinite' } : undefined}
                    >
                      <Icon name={icons[tab]} size="16" />
                      {tab}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportEventRoster}
                  className="royal-secondary-btn rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2"
                >
                  <Icon name="download" size="16" />
                  Export Roster
                </button>
              </div>
            </div>

            {/* Modal Body Scroll Area */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div key={`overview-${tabKey}`} className="ath-tab-in grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div className="xl:col-span-5 glass-panel rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-black text-white">Event Podium</h3>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Top Finishers</span>
                      </div>
                      <AthleticsPodium stats={selectedStats} />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                      <StatTile label="Best Timing" value={selectedStats.bestTiming || '--'} accent="text-amber-300 font-mono" icon="timer" />
                      <StatTile label="Finished" value={selectedStats.finished} accent="text-emerald-400" icon="check_circle" />
                    </div>
                  </div>

                  <div className="xl:col-span-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel rounded-2xl border border-white/10 p-6">
                      <h3 className="text-lg font-black text-white mb-1">House Points Breakdown</h3>
                      <p className="text-xs text-slate-400 mb-4">Points earned in {selectedEvent.name}</p>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={houseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(201,163,74,0.3)', borderRadius: 10, color: '#fff' }} />
                            <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                              {houseChartData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white mb-1">Status Breakdown</h3>
                        <p className="text-xs text-slate-400 mb-2">Participant outcome distribution</p>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                                {statusPieData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(201,163,74,0.3)', borderRadius: 10, color: '#fff' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                        {statusPieData.map(entry => (
                          <div key={entry.name} className="flex items-center gap-2 text-xs text-slate-300">
                            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                            <span className="truncate">{entry.name}: <b className="text-white font-black">{entry.value}</b></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ENROLLMENTS TAB */}
              {activeTab === 'enrollments' && (
                <div key={`enrollments-${tabKey}`} className="ath-tab-in space-y-5">
                  {/* Filters & Search Toolbar */}
                  <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/5">
                    <div className="flex flex-1 flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
                        <input
                          value={studentSearch}
                          onChange={event => setStudentSearch(event.target.value)}
                          placeholder="Search by Computer No, student name, or class..."
                          className="royal-input rounded-xl pl-10 pr-4 py-2.5 w-full text-sm"
                        />
                        {studentSearch && (
                          <button onClick={() => setStudentSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                            <Icon name="close" size="16" />
                          </button>
                        )}
                      </div>
                      <select
                        value={departmentFilter}
                        onChange={event => setDepartmentFilter(event.target.value as 'All' | 'PDB' | 'PDG')}
                        className="royal-input rounded-xl px-4 py-2.5 text-sm shrink-0"
                      >
                        <option value="All">All Departments</option>
                        <option value="PDB">Prep Boys (PDB)</option>
                        <option value="PDG">Prep Girls (PDG)</option>
                      </select>
                      <select
                        value={houseFilter}
                        onChange={event => setHouseFilter(event.target.value as 'All' | typeof HOUSES[number])}
                        className="royal-input rounded-xl px-4 py-2.5 text-sm shrink-0"
                      >
                        <option value="All">All Houses</option>
                        {HOUSES.map(h => <option key={h} value={h}>{h} House</option>)}
                      </select>
                    </div>

                    {isLoggedIn && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
                        <button
                          onClick={enrollAllFiltered}
                          className="royal-secondary-btn rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Icon name="playlist_add_check" size="16" />
                          Enroll Filtered ({filteredStudents.length})
                        </button>
                        <button
                          onClick={clearAllEnrollments}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                        >
                          <Icon name="delete_sweep" size="16" />
                          Clear Roster
                        </button>
                      </div>
                    )}
                  </div>

                  {!isLoggedIn && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center gap-3">
                      <Icon name="info" className="text-[20px]" />
                      <span>Staff authentication is required to toggle or edit event enrollments.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-bold">
                    <span>Showing {filteredStudents.length} of {students.length} prep students</span>
                    <span>{enrolledIds.length} currently enrolled in {selectedEvent.name}</span>
                  </div>

                  {/* Student Enrollment Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredStudents.map(student => {
                      const enrolled = enrolledIds.includes(student.id);
                      const config = houseConfig(student.house);
                      return (
                        <button
                          key={student.id}
                          disabled={!isLoggedIn}
                          onClick={() => toggleEnrollment(selectedEvent, student.id)}
                          className={`rounded-xl border p-4 text-left transition-all duration-200 relative overflow-hidden group ${enrolled
                              ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-yellow-600/5 shadow-lg shadow-amber-500/5'
                              : 'border-white/5 bg-white/[0.02] hover:border-amber-500/20 hover:bg-white/[0.04]'
                            } disabled:cursor-not-allowed disabled:opacity-75`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-black truncate text-sm" title={student.name}>{student.name}</div>
                              <div className="text-xs text-slate-400 mt-1 font-medium">#{student.id} • Class {student.className} • {student.department}</div>
                            </div>
                            <div className={`shrink-0 rounded-full border ${config.border}/40 ${config.bg}/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${config.text}`}>
                              {student.house}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${enrolled ? 'text-emerald-400' : 'text-slate-500'}`}>
                              <Icon name={enrolled ? 'check_circle' : 'radio_button_unchecked'} size="15" />
                              {enrolled ? 'Enrolled' : 'Not Enrolled'}
                            </span>
                            {isLoggedIn && (
                              <span className="text-[10px] text-amber-400/80 uppercase font-black opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to {enrolled ? 'Remove' : 'Add'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RESULTS TAB */}
              {activeTab === 'results' && (
                <div key={`results-${tabKey}`} className="ath-tab-in space-y-4">
                  <div className="flex flex-wrap gap-3 justify-between items-center bg-white/[0.02] p-4 rounded-xl border border-white/5">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Icon name="fact_check" className="text-amber-400 text-[20px]" />
                        Result Entry & Timing Desk
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Enter timing formats like `12:45` (seconds:ms) or `01:23:45` (mins:secs:ms).</p>
                    </div>
                    {isLoggedIn && (
                      <button
                        onClick={autoRankEvent}
                        className="royal-primary-btn rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg"
                      >
                        <Icon name="sort" className="text-[18px]" />
                        Auto-Rank Finish Positions
                      </button>
                    )}
                  </div>

                  {!isLoggedIn && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center gap-3">
                      <Icon name="info" className="text-[20px]" />
                      <span>Staff authentication is required to modify or save student results.</span>
                    </div>
                  )}

                  {/* Results Table */}
                  <div className="overflow-x-auto rounded-xl border border-white/10 shadow-xl bg-black/20">
                    <table className="royal-data-table min-w-[900px]">
                      <thead>
                        <tr>
                          <th>Competitor</th>
                          <th>House</th>
                          <th>Status</th>
                          <th>Timing</th>
                          <th>Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-16 text-slate-500">
                              <Icon name="person_off" className="text-[36px] mb-2 opacity-50 block mx-auto" />
                              No students are currently enrolled in this event. Go to the <b className="text-amber-400">Enrollments</b> tab to add participants.
                            </td>
                          </tr>
                        ) : resultRows.map(({ student, result }) => {
                          const config = houseConfig(student.house);
                          const isPodium = result.position && result.position <= 3;
                          const rankBadge = result.position === 1 ? '🥇 1st' : result.position === 2 ? '🥈 2nd' : result.position === 3 ? '🥉 3rd' : `#${result.position}`;
                          const justSaved = savedStudentId === student.id;

                          return (
                            <tr
                              key={student.id}
                              className={`transition-colors ${justSaved ? 'ath-row-flash' : 'hover:bg-white/[0.02]'}`}
                            >
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="font-black text-white text-sm">{student.name}</div>
                                  {justSaved && <SavedTick visible={true} />}
                                </div>
                                <div className="text-xs text-slate-400 font-medium mt-0.5 ml-0">#{student.id} • Class {student.className} • {student.department}</div>
                              </td>
                              <td>
                                <span className={`rounded-full border ${config.border}/40 ${config.bg}/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider ${config.text}`}>
                                  {student.house}
                                </span>
                              </td>
                              <td>
                                <select
                                  disabled={!isLoggedIn}
                                  value={result.status}
                                  onChange={event => updateResult(student.id, { status: event.target.value as AthleticsResultStatus })}
                                  className={`royal-input rounded-xl px-3 py-2 text-xs font-black min-w-[160px] border ${statusBadgeStyle(result.status)} disabled:opacity-60 cursor-pointer`}
                                >
                                  {RESULT_STATUSES.map(status => (
                                    <option key={status} value={status} className="bg-[#0f172a] text-white">
                                      {statusLabel(status)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  disabled={!isLoggedIn}
                                  value={result.timing || ''}
                                  onChange={event => updateResult(student.id, { timing: event.target.value })}
                                  placeholder="e.g. 12:34"
                                  className="royal-input rounded-xl px-3 py-2 text-xs font-mono font-bold min-w-[140px] text-amber-300 disabled:opacity-60"
                                />
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <input
                                    disabled={!isLoggedIn}
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={result.position || ''}
                                    onChange={event => updateResult(student.id, { position: event.target.value ? Number(event.target.value) : undefined })}
                                    placeholder="Rank"
                                    className="royal-input rounded-xl px-3 py-2 text-xs font-bold w-20 text-center disabled:opacity-60"
                                  />
                                  {result.position && (
                                    <span className={`text-xs font-black px-2 py-1 rounded-md ${isPodium ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400'}`}>
                                      {rankBadge}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Athletics;
