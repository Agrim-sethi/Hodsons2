import React, { useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { ATHLETICS_EVENTS, AthleticsSnapshot, AthleticsStudent, AthleticsEvent, relayHousePoints } from '../../utils/athleticsStorage';
import { ATHLETICS_CATEGORIES, AthleticsCategory } from '../../utils/athleticsCategories';
import { studentPointsAcrossEvents } from '../../utils/athleticsScoring';

const houseConfig = (house: string) => HOUSE_COLORS[(house.toLowerCase() as keyof typeof HOUSE_COLORS)] ?? HOUSE_COLORS.nilgiri;
const HOUSES_LIST = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'] as const;

export const AthleticsAnalytics: React.FC<{ students: AthleticsStudent[]; snapshot: AthleticsSnapshot }> = ({ students, snapshot }) => {
  const [houseFilter, setHouseFilter] = useState<'All' | typeof HOUSES_LIST[number]>('All');
  const [deptFilter, setDeptFilter] = useState<'All' | 'BD' | 'GD' | 'PD'>('All');

  const filteredStudents = useMemo(() => students.filter(stu => {
    const houseOk = houseFilter === 'All' || stu.house === houseFilter;
    const dept = stu.category.startsWith('PD') ? 'PD' : stu.category.startsWith('GD') ? 'GD' : 'BD';
    const deptOk = deptFilter === 'All' || dept === deptFilter;
    return houseOk && deptOk;
  }), [students, houseFilter, deptFilter]);

  const filteredIds = useMemo(() => new Set(filteredStudents.map(s => s.id)), [filteredStudents]);

  const departmentOfStudent = (student: AthleticsStudent) =>
    student.category.startsWith('PD') ? 'PD' : student.category.startsWith('GD') ? 'GD' : 'BD';

  const analytics = useMemo(() => {
    type ScopeStats = { enrolled: number; qualified: number; finished: number; dnf: number; absent: number; med: number; points: number };
    let totalEnrolled = 0, totalQualified = 0, totalFinished = 0, totalDnf = 0, totalAbsent = 0, totalMed = 0, totalPending = 0;
    const byHouse: Record<string, ScopeStats> = {};
    const byDept: Record<string, ScopeStats> = {};
    HOUSES_LIST.forEach(h => { byHouse[h] = { enrolled: 0, qualified: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 }; });
    ['BD', 'GD', 'PD'].forEach(d => { byDept[d] = { enrolled: 0, qualified: 0, finished: 0, dnf: 0, absent: 0, med: 0, points: 0 }; });

    const addParticipation = (student: AthleticsStudent) => {
      const dept = departmentOfStudent(student);
      totalEnrolled += 1; byHouse[student.house].enrolled += 1; byDept[dept].enrolled += 1;
    };
    const addQualified = (student: AthleticsStudent) => {
      const dept = departmentOfStudent(student);
      totalQualified += 1; byHouse[student.house].qualified += 1; byDept[dept].qualified += 1;
    };
    const addFinished = (student: AthleticsStudent) => {
      const dept = departmentOfStudent(student);
      totalFinished += 1; byHouse[student.house].finished += 1; byDept[dept].finished += 1;
    };
    const addDnf = (student: AthleticsStudent) => {
      const dept = departmentOfStudent(student);
      totalDnf += 1; byHouse[student.house].dnf += 1; byDept[dept].dnf += 1;
    };

    snapshot.enrollments.forEach(entry => {
      entry.studentIds.forEach(sid => {
        if (!filteredIds.has(sid)) return;
        const stu = students.find(s => s.id === sid);
        if (!stu) return;
        addParticipation(stu);
        const finalsConfig = snapshot.finals.find(f => f.eventId === entry.eventId && f.category === entry.category);
        const stage = finalsConfig?.enabled ? 'finals' : 'qualifying';
        const result = snapshot.results.find(r => r.eventId === entry.eventId && r.category === entry.category && r.studentId === sid && (r.stage || 'qualifying') === stage);
        const status = result?.status || 'pending';
        if (status === 'finished') { addFinished(stu); addQualified(stu); }
        else if (status === 'dnf') addDnf(stu);
        else if (status === 'absent') { totalAbsent += 1; byHouse[stu.house].absent += 1; byDept[departmentOfStudent(stu)].absent += 1; }
        else if (status === 'medically_excused') { totalMed += 1; byHouse[stu.house].med += 1; byDept[departmentOfStudent(stu)].med += 1; }
        else totalPending += 1;
      });
    });

    snapshot.relayTeams.forEach(team => {
      team.studentIds.forEach(sid => {
        if (!filteredIds.has(sid)) return;
        const stu = students.find(s => s.id === sid);
        if (!stu) return;
        const dept = departmentOfStudent(stu);
        if (houseFilter !== 'All' && stu.house !== houseFilter) return;
        if (deptFilter !== 'All' && dept !== deptFilter) return;
        addParticipation(stu);
        if (team.status === 'dnf') addDnf(stu);
        else { addQualified(stu); if (team.status === 'finished') addFinished(stu); }
      });
    });

    HOUSES_LIST.forEach(house => {
      if (houseFilter !== 'All' && house !== houseFilter) return;
      const inScope = students.filter(student => student.house === house && (deptFilter === 'All' || departmentOfStudent(student) === deptFilter));
      const individualPoints = inScope.reduce((sum, student) => sum + studentPointsAcrossEvents(snapshot, student, ATHLETICS_EVENTS), 0);
      const relayPoints = deptFilter === 'PD'
        ? relayHousePoints(snapshot, house, 'PDB') + relayHousePoints(snapshot, house, 'PDG')
        : deptFilter === 'All' ? relayHousePoints(snapshot, house) : relayHousePoints(snapshot, house, deptFilter);
      byHouse[house].points = individualPoints + relayPoints;
    });

    (['BD', 'GD', 'PD'] as const).forEach(dept => {
      if (deptFilter !== 'All' && dept !== deptFilter) return;
      byDept[dept].points = HOUSES_LIST.reduce((sum, house) => {
        if (houseFilter !== 'All' && house !== houseFilter) return sum;
        const individual = students.filter(student => student.house === house && departmentOfStudent(student) === dept)
          .reduce((inner, student) => inner + studentPointsAcrossEvents(snapshot, student, ATHLETICS_EVENTS), 0);
        const relay = dept === 'PD'
          ? relayHousePoints(snapshot, house, 'PDB') + relayHousePoints(snapshot, house, 'PDG')
          : relayHousePoints(snapshot, house, dept);
        return sum + individual + relay;
      }, 0);
    });

    const totalPoints = HOUSES_LIST.reduce((sum, house) => sum + byHouse[house].points, 0);
    return { totalEnrolled, totalQualified, totalFinished, totalDnf, totalAbsent, totalMed, totalPending, totalPoints, byHouse, byDept };
  }, [snapshot, filteredIds, students, houseFilter, deptFilter]);
  const pct = (n: number, d: number) => d > 0 ? `${Math.round((n / d) * 100)}%` : '—';

  const housePpp = HOUSES_LIST.map(h => ({
    name: h,
    ppp: analytics.byHouse[h].enrolled > 0 ? (analytics.byHouse[h].points / analytics.byHouse[h].enrolled).toFixed(2) : '0.00',
    ...analytics.byHouse[h],
  })).sort((a, b) => Number(b.ppp) - Number(a.ppp));

  const deptPpp = (['BD', 'GD', 'PD'] as const).map(d => ({
    name: d,
    ppp: analytics.byDept[d].enrolled > 0 ? (analytics.byDept[d].points / analytics.byDept[d].enrolled).toFixed(2) : '0.00',
    ...analytics.byDept[d],
  })).sort((a, b) => Number(b.ppp) - Number(a.ppp));

  const qualRate = pct(analytics.totalFinished, analytics.totalEnrolled);
  const absentRate = pct(analytics.totalAbsent, analytics.totalEnrolled);
  const medRate = pct(analytics.totalMed, analytics.totalEnrolled);

  return (
    <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filter bar */}
      <div className="glass-panel rounded-2xl border border-primary/15 p-4 flex flex-wrap items-center gap-3 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
        <Icon name="filter_list" size="18" className="text-primary" />
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Filter:</span>
        <select value={houseFilter} onChange={e => setHouseFilter(e.target.value as any)} className="royal-input rounded-xl px-3 py-2 text-xs font-bold">
          <option value="All">All Houses</option>
          {HOUSES_LIST.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value as any)} className="royal-input rounded-xl px-3 py-2 text-xs font-bold">
          <option value="All">All Departments</option>
          <option value="BD">BD (Boys Dept)</option>
          <option value="GD">GD (Girls Dept)</option>
          <option value="PD">PD (Prep Dept)</option>
        </select>
        <span className="ml-auto text-xs text-slate-500 font-bold">{filteredStudents.length} students in scope</span>
      </div>

      {/* Top KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        {[
          { label: 'Participations', value: analytics.totalEnrolled, accent: 'text-white', icon: 'groups' },
          { label: 'Qualified', value: `${analytics.totalQualified} (${qualRate})`, accent: 'text-emerald-400', icon: 'check_circle' },
          { label: 'Championship Points', value: analytics.totalPoints, accent: 'text-primary', icon: 'emoji_events' },
          { label: 'Pending', value: analytics.totalPending, accent: 'text-slate-400', icon: 'hourglass_top' },
          { label: 'DNF', value: analytics.totalDnf, accent: 'text-amber-400', icon: 'cancel' },
          { label: 'Absent', value: `${analytics.totalAbsent} (${absentRate})`, accent: 'text-rose-400', icon: 'person_off' },
          { label: 'Med. Excused', value: `${analytics.totalMed} (${medRate})`, accent: 'text-purple-400', icon: 'medical_services' },
                ].map(tile => (
          <div key={tile.label} className="rounded-xl border border-primary/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-3 flex flex-col justify-between shadow-lg shadow-black/20">
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-tight">{tile.label}</span>
              <Icon name={tile.icon} className="text-primary/40 text-[14px]" />
            </div>
            <span className={`text-lg font-black leading-none tracking-tight ${tile.accent}`}>{tile.value}</span>
          </div>
        ))}
      </div>

      {/* PPP by House */}
      <div className="glass-panel rounded-2xl border border-primary/15 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="show_chart" size="18" className="text-primary" />
          <h3 className="text-sm font-black text-white">Points Per Participation (PPP) — By House</h3>
          <span className="text-[10px] text-slate-500 font-bold ml-auto">pts earned ÷ total event participations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="royal-data-table min-w-[560px]">
            <thead>
              <tr>
                <th>Rank</th>
                <th>House</th>
                <th>Participations</th>
                <th>Qualified</th>
                <th>Points</th>
                <th>PPP</th>
                <th>Absent</th>
                <th>Med. Leave</th>
              </tr>
            </thead>
            <tbody>
              {housePpp.map((h, i) => {
                const cfg = houseConfig(h.name);
                return (
                  <tr key={h.name} className="hover:bg-white/[0.02]">
                    <td><span className="text-slate-500 font-black text-xs">#{i + 1}</span></td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 font-black text-sm ${cfg.text}`}>
                        <span className={`size-2 rounded-full ${cfg.bg} shrink-0`}></span>
                        {h.name}
                      </span>
                    </td>
                    <td className="text-center font-bold">{h.enrolled}</td>
                    <td className="text-center">
                      <span className="text-emerald-400 font-bold">{h.qualified}</span>
                      <span className="text-slate-500 text-xs ml-1">({pct(h.qualified, h.enrolled)})</span>
                    </td>
                    <td className="text-center font-black text-white">{h.points}</td>
                    <td className="text-center">
                      <span className="font-black text-amber-300">{h.ppp}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-rose-400 font-bold">{h.absent}</span>
                      <span className="text-slate-500 text-xs ml-1">({pct(h.absent, h.enrolled)})</span>
                    </td>
                    <td className="text-center">
                      <span className="text-purple-400 font-bold">{h.med}</span>
                      <span className="text-slate-500 text-xs ml-1">({pct(h.med, h.enrolled)})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* PPP by Department */}
      <div className="glass-panel rounded-2xl border border-primary/15 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="category" size="18" className="text-primary" />
          <h3 className="text-sm font-black text-white">Points Per Participation (PPP) — By Department</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="royal-data-table min-w-[560px]">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Department</th>
                <th>Participations</th>
                <th>Finished</th>
                <th>Points</th>
                <th>PPP</th>
                <th>Absent</th>
                <th>Med. Leave</th>
              </tr>
            </thead>
            <tbody>
              {deptPpp.map((d, i) => {
                const deptColors: Record<string, string> = { BD: 'text-[#d7bf86]', GD: 'text-[#f0d8a1]', PD: 'text-blue-300' };
                return (
                  <tr key={d.name} className="hover:bg-white/[0.02]">
                    <td><span className="text-slate-500 font-black text-xs">#{i + 1}</span></td>
                    <td><span className={`font-black text-sm ${deptColors[d.name] || 'text-white'}`}>{d.name}</span></td>
                    <td className="text-center font-bold">{d.enrolled}</td>
                    <td className="text-center">
                      <span className="text-emerald-400 font-bold">{d.qualified}</span>
                      <span className="text-slate-500 text-xs ml-1">({pct(d.qualified, d.enrolled)})</span>
                    </td>
                    <td className="text-center font-black text-white">{d.points}</td>
                    <td className="text-center">
                      <span className="font-black text-amber-300">{d.ppp}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-rose-400 font-bold">{d.absent}</span>
                      <span className="text-slate-500 text-xs ml-1">({pct(d.absent, d.enrolled)})</span>
                    </td>
                    <td className="text-center">
                      <span className="text-purple-400 font-bold">{d.med}</span>
                      <span className="text-slate-500 text-xs ml-1">({pct(d.med, d.enrolled)})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
