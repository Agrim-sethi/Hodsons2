import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS } from '../constants';
import { SCHOOL_TEAMS_DATA, teamKey, TeamData, Player, TeamResult } from '../utils/schoolTeamsData';
import { getEvents, Event } from '../utils/storage';

const SPORTS = [
    { name: 'Football', icon: 'sports_soccer', color: '#22c55e' },
    { name: 'Cricket', icon: 'sports_cricket', color: '#eab308' },
    { name: 'Basketball', icon: 'sports_basketball', color: '#f97316' },
    { name: 'Hockey', icon: 'sports_hockey', color: '#3b82f6' },
    { name: 'Athletics', icon: 'sprint', color: '#ef4444' },
];

const AGE_GROUPS = ['Under 13', 'Under 14', 'Under 17', 'Under 19'];

// Generate teams for all sports × age groups – now enriched from data file
const TEAMS = SPORTS.flatMap(sport =>
    AGE_GROUPS.map(age => {
        const data = SCHOOL_TEAMS_DATA[teamKey(sport.name, age)];
        return {
            id: `${sport.name}-${age}`,
            sport: sport.name,
            sportIcon: sport.icon,
            sportColor: sport.color,
            ageGroup: age,
            captain: data?.captain ?? '—',
            coach: data?.coach ?? '—',
            squad: data?.players?.length ?? 0,
        };
    })
);

const houseConfig = (house: string) => {
    const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
    return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

// ─── Team Detail Modal ───────────────────────────────────────────────
const TeamModal = ({ teamId, onClose }: { teamId: string; onClose: () => void }) => {
    const data = SCHOOL_TEAMS_DATA[teamId];
    if (!data) return null;

    const [sport, ...ageArr] = teamId.split('-');
    const ageGroup = ageArr.join('-');
    const sportMeta = SPORTS.find(s => s.name === sport);

    // Group players by house
    const playersByHouse = data.players.reduce<Record<string, Player[]>>((acc, p) => {
        (acc[p.house] = acc[p.house] || []).push(p);
        return acc;
    }, {});
    const houseOrder = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'];

    // Pull relevant completed events from storage as supplemental results
    const storageResults: TeamResult[] = (() => {
        try {
            const events = getEvents()
                .filter(e => e.completed && e.sport?.toLowerCase() === sport.toLowerCase())
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);

            return events.map(e => ({
                date: e.date,
                opponent: e.participation === 'inter_school'
                    ? (e.opponentSchool || 'Opponent')
                    : (e.houses?.join(' vs ') || e.title),
                score: e.result || e.resultDetails?.score || '—',
                result: (() => {
                    const w = (e.resultDetails?.winner || '').toLowerCase();
                    if (w.includes('sanawar') || w.includes('won') || w.includes('win')) return 'W' as const;
                    if (w.includes('draw') || w.includes('tie')) return 'D' as const;
                    return 'L' as const;
                })(),
                competition: e.participation === 'inter_school' ? 'Inter-School' : 'Inter-House',
            }));
        } catch {
            return [];
        }
    })();

    // Merge data-file results with storage results, dedup by date+opponent
    const allResults = [...data.recentResults];
    storageResults.forEach(sr => {
        if (!allResults.find(r => r.date === sr.date && r.opponent === sr.opponent)) {
            allResults.push(sr);
        }
    });
    allResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const displayResults = allResults.slice(0, 6);

    // Stats
    const wins = data.recentResults.filter(r => r.result === 'W').length;
    const losses = data.recentResults.filter(r => r.result === 'L').length;
    const draws = data.recentResults.filter(r => r.result === 'D').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative w-full max-w-5xl bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ──────────────────────────────────────── */}
                <div
                    className="p-6 border-b border-white/10 flex justify-between items-start"
                    style={{ background: `linear-gradient(135deg, ${sportMeta?.color ?? '#3b82f6'}12, transparent)` }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="size-14 rounded-xl flex items-center justify-center text-3xl"
                            style={{ backgroundColor: `${sportMeta?.color ?? '#3b82f6'}20`, color: sportMeta?.color }}
                        >
                            <Icon name={sportMeta?.icon ?? 'sports'} className="text-3xl" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{sport}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                <span
                                    className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${sportMeta?.color ?? '#3b82f6'}20`, color: sportMeta?.color }}
                                >
                                    {ageGroup}
                                </span>
                            </div>
                            <h3 className="text-white text-3xl font-black">{sport} — {ageGroup}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                <span className="flex items-center gap-1"><Icon name="person" size="16" /> Coach: <span className="text-white font-medium">{data.coach}</span></span>
                                <span className="flex items-center gap-1"><Icon name="military_tech" size="16" /> Captain: <span className="text-white font-medium">{data.captain}</span></span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2 hover:bg-white/10">
                        <Icon name="close" size="24" />
                    </button>
                </div>

                {/* ── Body (scrollable) ───────────────────────────── */}
                <div className="p-8 overflow-y-auto custom-scrollbar">

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass-panel rounded-xl p-4 text-center border border-white/5">
                            <p className="text-3xl font-black text-white">{data.players.length}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Squad Size</p>
                        </div>
                        <div className="glass-panel rounded-xl p-4 text-center border border-white/5">
                            <p className="text-3xl font-black text-green-400">{wins}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Wins</p>
                        </div>
                        <div className="glass-panel rounded-xl p-4 text-center border border-white/5">
                            <p className="text-3xl font-black text-red-400">{losses}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Losses</p>
                        </div>
                        <div className="glass-panel rounded-xl p-4 text-center border border-white/5">
                            <p className="text-3xl font-black text-amber-400">{draws}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Draws</p>
                        </div>
                    </div>

                    {/* ── Full Squad ────────────────────────────────── */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="size-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">
                                <Icon name="groups" size="20" />
                            </div>
                            <h4 className="text-white font-bold text-lg">Full Squad</h4>
                            <span className="text-slate-500 text-xs ml-auto">{data.players.length} players</span>
                        </div>
                        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                            <div className="divide-y divide-white/5">
                                {data.players.map((p, i) => {
                                    const cfg = houseConfig(p.house);
                                    return (
                                        <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-3">
                                                {/* Serial number */}
                                                <span className="text-slate-600 text-xs font-bold w-5 text-right">{i + 1}.</span>
                                                {/* Player name */}
                                                <span className="text-white text-sm font-medium">{p.name}</span>
                                                {/* House badge */}
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold ${cfg.bg}/20 ${cfg.text} border ${cfg.border}/30`}>
                                                        {p.house[0]}
                                                    </div>
                                                    <span className={`text-[11px] font-medium ${cfg.text}`}>{p.house}</span>
                                                </div>
                                            </div>
                                            {p.role && (
                                                <span
                                                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: `${sportMeta?.color ?? '#3b82f6'}20`, color: sportMeta?.color }}
                                                >
                                                    {p.role}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Recent Results ────────────────────────────── */}
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Icon name="emoji_events" size="20" />
                            </div>
                            <h4 className="text-white font-bold text-lg">Recent Results</h4>
                        </div>
                        {displayResults.length > 0 ? (
                            <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                                        <tr>
                                            <th className="px-5 py-3 border-b border-white/10">Date</th>
                                            <th className="px-5 py-3 border-b border-white/10">Opponent</th>
                                            <th className="px-5 py-3 border-b border-white/10">Competition</th>
                                            <th className="px-5 py-3 border-b border-white/10">Score</th>
                                            <th className="px-5 py-3 border-b border-white/10 text-center">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-300">
                                        {displayResults.map((r, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                                <td className="px-5 py-3 text-white font-medium">{r.opponent}</td>
                                                <td className="px-5 py-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300 uppercase tracking-wider">
                                                        {r.competition || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 font-bold text-white">{r.score}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`inline-flex items-center justify-center size-7 rounded-full text-[11px] font-black ${r.result === 'W'
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : r.result === 'L'
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                        }`}>
                                                        {r.result}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="glass-panel rounded-xl p-8 text-center border border-white/5">
                                <Icon name="sports_score" className="text-4xl text-slate-600 mb-2" />
                                <p className="text-slate-500 text-sm">No recent results available for this team.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ──────────────────────────────────────── */}
                <div className="p-4 border-t border-white/10 bg-surface-dark flex justify-between items-center">
                    <p className="text-slate-500 text-xs italic">2026 Season • Lawrence School Sanawar</p>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">
                            Win Rate: <span className="text-white font-bold">{data.recentResults.length > 0 ? Math.round((wins / data.recentResults.length) * 100) : 0}%</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page Component ──────────────────────────────────────────────
const SchoolTeams: React.FC = () => {
    const [activeSport, setActiveSport] = useState<string>('All');
    const [activeAge, setActiveAge] = useState<string>('All');
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

    // Hide navigation when modal is open (matching Archive.tsx pattern)
    useEffect(() => {
        if (selectedTeam) {
            document.body.classList.add('hide-navigation');
        } else {
            document.body.classList.remove('hide-navigation');
        }
        return () => document.body.classList.remove('hide-navigation');
    }, [selectedTeam]);

    const filteredTeams = TEAMS.filter(team => {
        if (activeSport !== 'All' && team.sport !== activeSport) return false;
        if (activeAge !== 'All' && team.ageGroup !== activeAge) return false;
        return true;
    });

    return (
        <div className="max-w-[1440px] mx-auto w-full pb-20 px-4">
            <style>
                {`
                    body.hide-navigation aside, 
                    body.hide-navigation header {
                        display: none !important;
                    }
                    body.hide-navigation main {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                `}
            </style>

            {/* Hero */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pt-10">
                <div className="flex flex-col gap-2">
                    <div className="royal-kicker flex items-center gap-2">
                        <Icon name="groups" className="text-lg" />
                        <span>Squads &amp; Rosters</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
                        School Teams
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl">
                        A comprehensive directory of all competitive teams representing the school across every sport and age category. Click on any team card to view the full squad and recent results.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel section-plaque rounded-2xl p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sport Filter */}
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Filter by Sport</h4>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setActiveSport('All')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${activeSport === 'All'
                                    ? 'bg-primary/20 border-primary/30 text-primary shadow-lg shadow-primary/10'
                                    : 'royal-secondary-btn text-slate-300'
                                    }`}
                            >
                                All Sports
                            </button>
                            {SPORTS.map(sport => (
                                <button
                                    key={sport.name}
                                    onClick={() => setActiveSport(sport.name)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-2 ${activeSport === sport.name
                                        ? 'bg-primary/20 border-primary/30 text-primary shadow-lg shadow-primary/10'
                                        : 'royal-secondary-btn text-slate-300'
                                        }`}
                                >
                                    <Icon name={sport.icon} className="text-base" />
                                    {sport.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Age Filter */}
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Filter by Age Group</h4>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setActiveAge('All')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${activeAge === 'All'
                                    ? 'bg-primary/20 border-primary/30 text-primary shadow-lg shadow-primary/10'
                                    : 'royal-secondary-btn text-slate-300'
                                    }`}
                            >
                                All Ages
                            </button>
                            {AGE_GROUPS.map(age => (
                                <button
                                    key={age}
                                    onClick={() => setActiveAge(age)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${activeAge === age
                                        ? 'bg-primary/20 border-primary/30 text-primary shadow-lg shadow-primary/10'
                                        : 'royal-secondary-btn text-slate-300'
                                        }`}
                                >
                                    {age}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTeams.map(team => (
                    <div
                        key={team.id}
                        onClick={() => setSelectedTeam(team.id)}
                        className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-primary/20 border border-primary/10 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                    >
                        {/* Background icon watermark */}
                        <div className="absolute -bottom-4 -right-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                            <Icon name={team.sportIcon} className="text-[140px]" />
                        </div>

                        {/* Hover overlay hint */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-[2px] z-10 pointer-events-none">
                            <div className="bg-white/10 p-2.5 rounded-full border border-white/20 flex items-center gap-2 px-4">
                                <Icon name="visibility" className="text-white" />
                                <span className="text-white font-medium text-sm">View Squad</span>
                            </div>
                        </div>

                        <div className="relative z-[5] flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="size-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${team.sportColor}15`, color: team.sportColor }}
                                    >
                                        <Icon name={team.sportIcon} className="text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{team.sport}</h3>
                                        <span
                                            className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                            style={{ backgroundColor: `${team.sportColor}20`, color: team.sportColor }}
                                        >
                                            {team.ageGroup}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    2026 Season
                                </div>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                    <p className="text-xl font-black text-white">{team.squad || '—'}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Squad Size</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                    <p className="text-sm font-bold text-white truncate" title={team.captain}>{team.captain}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Captain</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                    <p className="text-sm font-bold text-white truncate" title={team.coach}>{team.coach}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Coach</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Icon name="calendar_today" className="text-sm" />
                                    <span>Mar - Nov 2026</span>
                                </div>
                                <span
                                    className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                                    style={{ backgroundColor: `${team.sportColor}15`, color: team.sportColor }}
                                >
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTeams.length === 0 && (
                <div className="glass-panel rounded-2xl p-16 text-center">
                    <Icon name="search_off" className="text-5xl text-slate-600 mb-3" />
                    <p className="text-slate-400 text-lg">No teams match the selected filters.</p>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting your sport or age group selection.</p>
                </div>
            )}

            {/* Team Detail Modal */}
            {selectedTeam && <TeamModal teamId={selectedTeam} onClose={() => setSelectedTeam(null)} />}
        </div>
    );
};

export default SchoolTeams;
