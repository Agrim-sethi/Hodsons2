import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
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
  subscribeToAthleticsData
} from '../utils/athleticsStorage';
import { AthleticsEventStats, buildAthleticsDerivedData } from '../utils/athleticsDerived';

const HOUSES = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'] as const;
const RESULT_STATUSES: AthleticsResultStatus[] = ['pending', 'finished', 'dnf', 'absent', 'medically_excused'];

const houseConfig = (house: string) => {
  const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
  return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const statusLabel = (status: AthleticsResultStatus) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const downloadWorkbook = (filename: string, rows: Record<string, any>[]) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Athletics 2026');
  XLSX.writeFile(workbook, filename);
};

const StatTile = ({ label, value, accent = 'text-white' }: { label: string; value: React.ReactNode; accent?: string }) => (
  <div className="rounded-lg border border-primary/10 bg-white/[0.03] px-4 py-3 min-h-[78px] flex flex-col justify-between">
    <span className="text-[10px] font-black uppercase text-slate-500 leading-tight">{label}</span>
    <span className={`text-2xl font-black leading-none ${accent}`}>{value}</span>
  </div>
);

const AthleticsPodium = ({ stats }: { stats: AthleticsEventStats }) => {
  const steps = [
    { athlete: stats.podium[1], rank: 2, height: 'h-24' },
    { athlete: stats.podium[0], rank: 1, height: 'h-32' },
    { athlete: stats.podium[2], rank: 3, height: 'h-20' }
  ];

  return (
    <div className="grid grid-cols-3 gap-4 items-end min-h-[230px]">
      {steps.map(({ athlete, rank, height }) => {
        const config = athlete ? houseConfig(athlete.house) : HOUSE_COLORS.nilgiri;
        return (
          <div key={rank} className="flex flex-col items-center justify-end min-w-0">
            <div className="h-[82px] mb-2 flex flex-col items-center justify-end text-center min-w-0">
              {athlete ? (
                <>
                  <span className="text-xs font-black text-white max-w-full truncate" title={athlete.name}>{athlete.name.split(' ')[0]}</span>
                  <span className={`mt-1 rounded-full border ${config.border}/30 ${config.bg}/20 px-2 py-0.5 text-[9px] font-black uppercase ${config.text}`}>{athlete.house}</span>
                  <span className="mt-1 text-[10px] font-bold text-slate-400">{athlete.timing || 'No time'}</span>
                </>
              ) : (
                <span className="text-xs text-slate-600 italic">TBD</span>
              )}
            </div>
            <div className={`w-full ${height} rounded-t-lg border-t-4 ${athlete ? config.border : 'border-white/10'} bg-gradient-to-t ${athlete ? config.gradient : 'from-white/5 to-white/10'} flex items-start justify-center pt-3 shadow-lg shadow-black/30`}>
              <span className="text-2xl font-black text-white">{rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const EventCard = ({ stats, onOpen }: { stats: AthleticsEventStats; onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="glass-panel rounded-xl border border-primary/10 p-6 text-left hover:border-primary/40 hover:bg-white/[0.04] transition-all group"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="royal-kicker mb-2">Athletics 2026</div>
        <h3 className="text-2xl font-black text-white leading-tight">{stats.event.name}</h3>
        <p className="text-sm text-slate-400 mt-1 capitalize">{stats.event.type.replace('_', ' ')}</p>
      </div>
      <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
        <Icon name="sprint" className="text-[24px]" />
      </div>
    </div>

    <div className="mt-5">
      <AthleticsPodium stats={stats} />
    </div>

    <div className="mt-5 grid grid-cols-2 xl:grid-cols-4 gap-3">
      <StatTile label="Enrolled" value={stats.enrolled} />
      <StatTile label="Finished" value={stats.finished} accent="text-green-400" />
      <StatTile label="Best Time" value={stats.bestTiming || '--'} accent="text-primary" />
      <StatTile label="Points" value={HOUSES.reduce((sum, house) => sum + stats.houseStats[house].points, 0)} accent="text-white" />
    </div>
  </button>
);

const Athletics: React.FC = () => {
  const { showToast } = useToast();
  const { isLoggedIn } = useStaffAuth();
  const [snapshot, setSnapshot] = React.useState<AthleticsSnapshot>(getAthleticsSnapshot());
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'enrollments' | 'results'>('overview');
  const [studentSearch, setStudentSearch] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState<'All' | 'PDB' | 'PDG'>('All');

  const students = React.useMemo(
    () => getPrepAthleticsStudents(studentClasses as Record<string, string>),
    []
  );

  React.useEffect(() => {
    setSnapshot(getAthleticsSnapshot());
    return subscribeToAthleticsData(setSnapshot);
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
      'The Athletics event roster has been saved.'
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

    saveNextSnapshot({ ...snapshot, results: nextResults }, 'Positions Calculated', 'Finish positions were ranked by timing.');
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

  const filteredStudents = students.filter(student => {
    const matchesDepartment = departmentFilter === 'All' || student.department === departmentFilter;
    const query = studentSearch.trim().toLowerCase();
    const matchesSearch = !query || [student.id, student.name, student.house, student.className].some(value => value.toLowerCase().includes(query));
    return matchesDepartment && matchesSearch;
  });

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
    { name: 'Finished', value: selectedStats?.finished || 0, color: '#22c55e' },
    { name: 'DNF', value: selectedStats?.dnf || 0, color: '#f97316' },
    { name: 'Absent', value: selectedStats?.absent || 0, color: '#ef4444' },
    { name: 'Medical', value: selectedStats?.med || 0, color: '#94a3b8' },
    { name: 'Pending', value: selectedStats ? Math.max(selectedStats.enrolled - selectedStats.resulted, 0) : 0, color: '#475569' }
  ].filter(entry => entry.value > 0);

  return (
    <div className="max-w-[1500px] mx-auto space-y-8 pb-12">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="royal-kicker mb-2">Track Desk</div>
          <h1 className="text-4xl font-black text-white tracking-tight">Athletics 2026</h1>
          <p className="text-slate-400 mt-2 max-w-3xl">Prep boys and girls track events, enrollment, results, house points, and live event analytics.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportAllResults} className="royal-secondary-btn rounded-lg px-4 py-3 text-xs font-black uppercase flex items-center gap-2">
            <Icon name="download" className="text-[18px]" />
            Export All
          </button>
          <div className={`rounded-lg border px-4 py-3 text-xs font-black uppercase flex items-center gap-2 ${isLoggedIn ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-primary/10 bg-white/[0.03] text-slate-400'}`}>
            <Icon name={isLoggedIn ? 'verified_user' : 'lock'} className="text-[18px]" />
            {isLoggedIn ? 'Staff Editing Active' : 'Read Only'}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Events" value={ATHLETICS_EVENTS.length} accent="text-primary" />
        <StatTile label="Total Enrollments" value={derived.eventStats.reduce((sum, event) => sum + event.enrolled, 0)} />
        <StatTile label="Total Finished" value={derived.eventStats.reduce((sum, event) => sum + event.finished, 0)} accent="text-green-400" />
        <StatTile label="Leading House" value={derived.standings[0]?.name || '--'} accent={derived.standings[0] ? houseConfig(derived.standings[0].name).text : 'text-slate-400'} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 glass-panel rounded-xl border border-primary/10 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-white">House Standings</h2>
              <p className="text-xs text-slate-400">Points from top-five event positions</p>
            </div>
            <Icon name="leaderboard" className="text-primary text-[28px]" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.standings} layout="vertical" margin={{ left: 10, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(201,163,74,0.2)', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="points" radius={[0, 6, 6, 0]}>
                  {derived.standings.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HOUSES.map(house => {
            const config = houseConfig(house);
            const points = derived.standings.find(entry => entry.name === house)?.points || 0;
            return (
              <div key={house} className="glass-panel rounded-xl border border-primary/10 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`size-9 rounded-lg ${config.bg}/20 ${config.text} border ${config.border}/30 flex items-center justify-center font-black`}>{house[0]}</div>
                  <span className={`font-black ${config.text}`}>{house}</span>
                </div>
                <div className="text-4xl font-black text-white">{points}</div>
                <div className="text-[10px] uppercase font-black text-slate-500 mt-1">Athletics Points</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {derived.eventStats.map(stats => (
          <EventCard
            key={stats.event.id}
            stats={stats}
            onOpen={() => {
              setSelectedEventId(stats.event.id);
              setActiveTab('overview');
            }}
          />
        ))}
      </section>

      {selectedStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedEventId(null)}></div>
          <div className="relative w-full max-w-7xl max-h-[92vh] overflow-hidden rounded-xl border border-primary/15 bg-[#0f172a] shadow-2xl flex flex-col">
            <ModalHeader
              kicker="Athletics 2026"
              icon="sprint"
              title={selectedEvent.name}
              subtitle={`${selectedStats.enrolled} enrolled • ${selectedStats.finished} finished • ${HOUSES.reduce((sum, house) => sum + selectedStats.houseStats[house].points, 0)} points awarded`}
              onClose={() => setSelectedEventId(null)}
            />

            <div className="border-b border-primary/10 px-6 py-3 flex flex-wrap gap-2">
              {(['overview', 'enrollments', 'results'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-xs font-black uppercase transition-all ${activeTab === tab ? 'royal-primary-btn' : 'royal-secondary-btn'}`}
                >
                  {tab}
                </button>
              ))}
              <button onClick={exportEventRoster} className="ml-auto rounded-lg royal-secondary-btn px-4 py-2 text-xs font-black uppercase flex items-center gap-2">
                <Icon name="download" className="text-[16px]" />
                Export Event
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div className="xl:col-span-5 glass-panel rounded-xl border border-white/5 p-6">
                    <h3 className="text-lg font-black text-white mb-4">Podium</h3>
                    <AthleticsPodium stats={selectedStats} />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <StatTile label="Best Timing" value={selectedStats.bestTiming || '--'} accent="text-primary" />
                      <StatTile label="Finished" value={selectedStats.finished} accent="text-green-400" />
                    </div>
                  </div>

                  <div className="xl:col-span-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel rounded-xl border border-white/5 p-6">
                      <h3 className="text-lg font-black text-white mb-4">House Output</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={houseChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(201,163,74,0.2)', borderRadius: 8, color: '#fff' }} />
                            <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                              {houseChartData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass-panel rounded-xl border border-white/5 p-6">
                      <h3 className="text-lg font-black text-white mb-4">Status Breakdown</h3>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                              {statusPieData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(201,163,74,0.2)', borderRadius: 8, color: '#fff' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {statusPieData.map(entry => (
                          <div key={entry.name} className="flex items-center gap-2 text-xs text-slate-300">
                            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span>{entry.name}: <b className="text-white">{entry.value}</b></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'enrollments' && (
                <div className="space-y-5">
                  <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                    <input
                      value={studentSearch}
                      onChange={event => setStudentSearch(event.target.value)}
                      placeholder="Search by computer number, name, house, or class"
                      className="royal-input rounded-lg px-4 py-3 flex-1"
                    />
                    <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value as 'All' | 'PDB' | 'PDG')} className="royal-input rounded-lg px-4 py-3">
                      <option value="All">All Prep</option>
                      <option value="PDB">Prep Boys</option>
                      <option value="PDG">Prep Girls</option>
                    </select>
                  </div>

                  {!isLoggedIn && (
                    <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                      Staff login is required to edit event enrollments.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredStudents.map(student => {
                      const enrolled = enrolledIds.includes(student.id);
                      const config = houseConfig(student.house);
                      return (
                        <button
                          key={student.id}
                          disabled={!isLoggedIn}
                          onClick={() => toggleEnrollment(selectedEvent, student.id)}
                          className={`rounded-lg border p-4 text-left transition-all ${enrolled ? 'border-primary/40 bg-primary/10' : 'border-white/5 bg-white/[0.03] hover:border-primary/20'} disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-white font-black truncate" title={student.name}>{student.name}</div>
                              <div className="text-xs text-slate-400 mt-1">#{student.id} • Class {student.className} • {student.department}</div>
                            </div>
                            <div className={`shrink-0 rounded-full border ${config.border}/30 ${config.bg}/20 px-2 py-1 text-[10px] font-black ${config.text}`}>
                              {student.house}
                            </div>
                          </div>
                          <div className={`mt-3 text-xs font-black uppercase ${enrolled ? 'text-green-400' : 'text-slate-500'}`}>
                            {enrolled ? 'Enrolled' : 'Not Enrolled'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'results' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-white">Result Entry</h3>
                      <p className="text-xs text-slate-400">Use `SS:MS` for sprints or `MM:SS:MS` for longer races.</p>
                    </div>
                    <button disabled={!isLoggedIn} onClick={autoRankEvent} className="royal-primary-btn rounded-lg px-4 py-3 text-xs font-black uppercase disabled:opacity-50 flex items-center gap-2">
                      <Icon name="sort" className="text-[18px]" />
                      Auto Rank By Time
                    </button>
                  </div>

                  {!isLoggedIn && (
                    <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                      Staff login is required to edit results.
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-lg border border-white/5">
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
                            <td colSpan={5} className="text-center py-12 text-slate-500">No students enrolled in this event yet.</td>
                          </tr>
                        ) : resultRows.map(({ student, result }) => {
                          const config = houseConfig(student.house);
                          return (
                            <tr key={student.id}>
                              <td>
                                <div className="font-black text-white">{student.name}</div>
                                <div className="text-xs text-slate-500">#{student.id} • Class {student.className}</div>
                              </td>
                              <td>
                                <span className={`rounded-full border ${config.border}/30 ${config.bg}/20 px-2 py-1 text-[10px] font-black ${config.text}`}>{student.house}</span>
                              </td>
                              <td>
                                <select disabled={!isLoggedIn} value={result.status} onChange={event => updateResult(student.id, { status: event.target.value as AthleticsResultStatus })} className="royal-input rounded-lg px-3 py-2 text-sm min-w-[150px] disabled:opacity-60">
                                  {RESULT_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                                </select>
                              </td>
                              <td>
                                <input disabled={!isLoggedIn} value={result.timing || ''} onChange={event => updateResult(student.id, { timing: event.target.value })} placeholder="12:34 or 04:50:12" className="royal-input rounded-lg px-3 py-2 text-sm min-w-[150px] disabled:opacity-60" />
                              </td>
                              <td>
                                <input disabled={!isLoggedIn} type="number" min="1" value={result.position || ''} onChange={event => updateResult(student.id, { position: event.target.value ? Number(event.target.value) : undefined })} className="royal-input rounded-lg px-3 py-2 text-sm w-24 disabled:opacity-60" />
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
        </div>
      )}
    </div>
  );
};

export default Athletics;
