import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS } from '../constants';
import { ATHLETICS_DATA } from '../utils/athleticsRecords';

const ArchiveRow = ({ date, name, cat, winner, mvp, points, onClick }: any) => (
    <tr className="hover:bg-primary/5 transition-colors cursor-pointer group border-b border-white/5 last:border-0" onClick={onClick}>
        <td className="px-6 py-4 font-medium whitespace-nowrap text-slate-300 group-hover:text-white">{date}</td>
        <td className="px-6 py-4 text-white font-medium">{name}</td>
        <td className="px-6 py-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-dark text-slate-300 border border-white/10">
                <Icon name={cat.icon} className="text-[14px]" /> {cat.name}
            </span>
        </td>
        <td className="px-6 py-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${winner.config.bg}/20 ${winner.config.text} border ${winner.config.border}/30`}>
                {winner.name}
            </span>
        </td>
        <td className="px-6 py-4 text-slate-300">{mvp}</td>
        <td className="px-6 py-4 text-right font-bold text-white">{points}</td>
        <td className="px-6 py-4 text-right">
            <button className="text-slate-500 group-hover:text-primary transition-colors">
                <Icon name="chevron_right" />
            </button>
        </td>
    </tr>
);

const EventModal = ({ eventType, year, onClose }: { eventType: string, year: string, onClose: () => void }) => {
    const data = ATHLETICS_DATA[eventType]?.[year];
    if (!data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative w-full max-w-5xl bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                <div className={`p-6 border-b border-white/10 flex justify-between items-start bg-gradient-to-r ${data.winner.config.bg.replace('bg-', 'from-')}/10 to-transparent`}>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Athletics</span>
                            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                            <span className="text-slate-400 text-xs">{year}</span>
                        </div>
                        <h3 className="text-white text-3xl font-black">{data.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <p className={`${data.winner.config.text} text-sm font-medium`}>Winning House: {data.winner.name} ({data.pts} pts)</p>
                            {data.tieBroken && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                                    <Icon name="balance" size="12" /> Tie-Breaker Applied
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2 hover:bg-white/10">
                        <Icon name="close" size="24" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4 border-b border-white/10">Metric</th>
                                    <th className="px-4 py-4 border-b border-white/10 text-center">U-13</th>
                                    <th className="px-4 py-4 border-b border-white/10 text-center">U-14</th>
                                    <th className="px-4 py-4 border-b border-white/10 text-center">U-16</th>
                                    <th className="px-4 py-4 border-b border-white/10 text-center text-primary">OPENS</th>
                                    <th className="px-6 py-4 border-b border-white/10 text-right font-black text-white bg-white/5">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {data.rows.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className={`px-6 py-3 font-medium ${row.label.includes('Nilgiri') ? 'text-house-nilgiri' : row.label.includes('Vindhya') ? 'text-house-vindhya' : row.label.includes('Siwalik') ? 'text-house-siwalik' : row.label.includes('Himalaya') ? 'text-house-himalaya' : 'text-slate-200'}`}>
                                            {row.label}
                                        </td>
                                        <td className="px-4 py-3 text-center">{row.u13 ?? '-'}</td>
                                        <td className="px-4 py-3 text-center">{row.u14 ?? '-'}</td>
                                        <td className="px-4 py-3 text-center">{row.u16 ?? '-'}</td>
                                        <td className="px-4 py-3 text-center font-bold text-primary">{row.opens ?? '-'}</td>
                                        <td className="px-6 py-3 text-right font-bold text-white bg-white/5">{row.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Qualified %, Housewise Participation & Qualification */}
                    {(() => {
                        // Extract data from rows
                        const getRowVal = (keyword: string) => data.rows.find((r: any) => r.label.toLowerCase().includes(keyword.toLowerCase()));
                        const participationTotal = getRowVal('Total participation');
                        const qualifiedTotal = getRowVal('Qualified') && !getRowVal('Qualified')?.label.includes('%') ? getRowVal('Qualified') : null;

                        const partV = getRowVal('Participation - Vindhya') || getRowVal('Participation V');
                        const partS = getRowVal('Participation - Siwalik') || getRowVal('Participation S');
                        const partN = getRowVal('Participation - Nilgiri') || getRowVal('Participation N');
                        const partH = getRowVal('Participation - Himalaya') || getRowVal('Participation H');

                        const qualV = data.rows.find((r: any) => (r.label.includes('Qualified - Vindhya') || r.label === 'Qualified V'));
                        const qualS = data.rows.find((r: any) => (r.label.includes('Qualified - Siwalik') || r.label === 'Qualified S'));
                        const qualN = data.rows.find((r: any) => (r.label.includes('Qualified - Nilgiri') || r.label === 'Qualified N'));
                        const qualH = data.rows.find((r: any) => (r.label.includes('Qualified - Himalaya') || r.label === 'Qualified H'));

                        const hasParticipation = partV || partS || partN || partH;
                        const hasQualification = qualV || qualS || qualN || qualH;

                        const houseData = [
                            { name: 'Vindhya', code: 'V', config: HOUSE_COLORS.vindhya, part: partV, qual: qualV },
                            { name: 'Siwalik', code: 'S', config: HOUSE_COLORS.siwalik, part: partS, qual: qualS },
                            { name: 'Nilgiri', code: 'N', config: HOUSE_COLORS.nilgiri, part: partN, qual: qualN },
                            { name: 'Himalaya', code: 'H', config: HOUSE_COLORS.himalaya, part: partH, qual: qualH },
                        ];

                        return (
                            <>
                                {/* Qualified % Banner */}
                                <div className="mt-8 glass-panel rounded-xl p-6 border border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <Icon name="percent" size="20" />
                                        </div>
                                        <h4 className="text-white font-bold text-lg">Qualification Rate</h4>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-5xl font-black text-primary">{data.qualRate}</div>
                                        <div className="flex flex-col gap-1 text-sm text-slate-400">
                                            <span>Total Participants: <span className="text-white font-bold">{participationTotal?.total ?? '—'}</span></span>
                                            <span>Total Qualified: <span className="text-white font-bold">{qualifiedTotal?.total ?? '—'}</span></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Housewise Participation */}
                                {hasParticipation && (
                                    <div className="mt-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="size-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">
                                                <Icon name="groups" size="20" />
                                            </div>
                                            <h4 className="text-white font-bold text-lg">House-wise Participation</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {houseData.map(h => (
                                                <div key={h.code} className={`glass-panel rounded-xl p-4 border border-white/5 bg-gradient-to-br ${h.config.bg.replace('bg-', 'from-')}/5 to-transparent`}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold ${h.config.bg}/20 ${h.config.text} border ${h.config.border}/30`}>{h.code}</div>
                                                        <span className={`text-sm font-bold ${h.config.text}`}>{h.name}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                                                        <span className="text-slate-500">U-13</span><span className="text-white font-bold text-right">{h.part?.u13 ?? '—'}</span>
                                                        <span className="text-slate-500">U-14</span><span className="text-white font-bold text-right">{h.part?.u14 ?? '—'}</span>
                                                        <span className="text-slate-500">U-16</span><span className="text-white font-bold text-right">{h.part?.u16 ?? '—'}</span>
                                                        <span className="text-slate-500">Opens</span><span className="text-white font-bold text-right">{h.part?.opens ?? '—'}</span>
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-white/5 text-center">
                                                        <span className="text-white font-black text-lg">{h.part?.total ?? '—'}</span>
                                                        <span className="text-slate-500 text-[10px] block uppercase tracking-wider">Total</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Housewise Qualification */}
                                {hasQualification && (
                                    <div className="mt-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                                                <Icon name="check_circle" size="20" />
                                            </div>
                                            <h4 className="text-white font-bold text-lg">House-wise Qualification</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {houseData.map(h => {
                                                const qualTotal = h.qual?.total ?? 0;
                                                const partTotal = h.part?.total ?? 0;
                                                const qualPct = partTotal > 0 ? Math.round((qualTotal / partTotal) * 100) : 0;
                                                return (
                                                    <div key={h.code} className="glass-panel rounded-xl p-4 border border-white/5">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold ${h.config.bg}/20 ${h.config.text} border ${h.config.border}/30`}>{h.code}</div>
                                                            <span className={`text-sm font-bold ${h.config.text}`}>{h.name}</span>
                                                        </div>
                                                        <div className="flex items-baseline gap-2 mb-2">
                                                            <span className="text-2xl font-black text-white">{qualTotal}</span>
                                                            <span className="text-slate-500 text-xs">/ {partTotal}</span>
                                                        </div>
                                                        {/* Qualification bar */}
                                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${h.config.bg} transition-all duration-500`} style={{ width: `${qualPct}%` }}></div>
                                                        </div>
                                                        <span className={`text-xs font-bold ${h.config.text} mt-1 block`}>{qualPct}% qualified</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">{eventType.includes('Jump') ? 'Max Height/Dist' : 'Max Distance'}</p>
                            <h4 className="text-4xl font-black text-white">{data.maxDist}<span className="text-lg ml-1 font-medium text-slate-500">m</span></h4>
                        </div>
                        <div className={`glass-panel p-6 rounded-xl border border-white/5 bg-gradient-to-br ${data.winner.config.bg.replace('bg-', 'from-')}/5 to-transparent`}>
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">Top Performing House</p>
                            <h4 className={`text-3xl font-black ${data.winner.config.text}`}>{data.winner.name.split('/')[0].toUpperCase()}</h4>
                            <div className="mt-3 flex gap-1">
                                {[1, 2, 3, 4, 5].map(s => <Icon key={s} name="military_tech" className={data.winner.config.text} />)}
                            </div>
                        </div>
                        <div className="glass-panel p-6 rounded-xl border border-white/5">
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">Qualification Rate</p>
                            <h4 className="text-4xl font-black text-white">{data.qualRate}</h4>
                            <p className="text-xs text-slate-400 mt-2">Overall success rate</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-surface-dark flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                        <p className="text-slate-500 text-xs italic">Historical Archive Data</p>
                        {data.tieBroken && (
                            <p className="text-amber-500/80 text-[10px] font-medium flex items-center gap-1">
                                <Icon name="info" size="12" /> Tie-break logic: Points &rsaquo; Qualified &rsaquo; Best Performance
                            </p>
                        )}
                    </div>
                    <button className="px-6 py-2 royal-primary-btn font-bold rounded-lg flex items-center gap-2">
                        <Icon name="description" />
                        Export Full Report
                    </button>
                </div>
            </div>
        </div>
    );
};

const Archive: React.FC = () => {
    const [selectedYear, setSelectedYear] = useState<string>("All Years");
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const [modalData, setModalData] = useState<{ type: string, year: string } | null>(null);

    React.useEffect(() => {
        if (modalData) {
            document.body.classList.add('hide-navigation');
        } else {
            document.body.classList.remove('hide-navigation');
        }
        return () => document.body.classList.remove('hide-navigation');
    }, [modalData]);

    const years = ["All Years", "2025", "2024", "2023", "2022"];
    const events = Object.keys(ATHLETICS_DATA);

    const filteredRecords: any[] = [];
    events.forEach(eventType => {
        Object.keys(ATHLETICS_DATA[eventType]).forEach(year => {
            if (selectedYear === "All Years" || year === selectedYear) {
                filteredRecords.push({
                    type: eventType,
                    year: year,
                    ...ATHLETICS_DATA[eventType][year]
                });
            }
        });
    });

    filteredRecords.sort((a, b) => b.year.localeCompare(a.year) || a.type.localeCompare(b.type));

    return (
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
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

            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <div className="royal-kicker mb-2">Championship Record Book</div>
                    <h1 className="text-white text-3xl font-black leading-tight">Event Archive Directory</h1>
                    <p className="text-slate-400 text-sm mt-2">Browse the complete history of inter-house sporting events.</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {years.map(year => (
                    <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${selectedYear === year
                            ? 'royal-primary-btn scale-105'
                            : 'royal-secondary-btn text-slate-300'
                            }`}
                    >
                        {year}
                    </button>
                ))}
            </div>

            <div className="glass-panel section-plaque rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="w-full royal-input rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 transition-all" placeholder="Search for matches, events, or players..." type="text" />
                </div>
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="royal-input text-sm rounded-lg block p-2.5 min-w-[140px]"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className="royal-input text-sm rounded-lg block p-2.5 min-w-[160px]">
                        <option>All Categories</option>
                        <option>Athletics</option>
                    </select>
                    <button onClick={() => setSelectedYear("All Years")} className="flex items-center gap-1 royal-ghost-btn px-3 py-2 text-sm font-medium whitespace-nowrap rounded-lg">
                        <Icon name="filter_list_off" className="text-[18px]" /> Clear
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-surface-dark text-xs uppercase font-bold text-white border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4">Year</th>
                                <th className="px-6 py-4">Event Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Winner</th>
                                <th className="px-6 py-4">MVP</th>
                                <th className="px-4 py-4 text-right">Points</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((record, i) => (
                                    <ArchiveRow
                                        key={`${record.type}-${record.year}`}
                                        date={record.year}
                                        name={record.title}
                                        cat={{ name: 'Athletics', icon: record.type.includes('Throw') ? 'fitness_center' : record.type.includes('Jump') ? 'vertical_align_top' : 'sprint' }}
                                        winner={record.winner}
                                        mvp="-"
                                        points={record.pts}
                                        onClick={() => setModalData({ type: record.type, year: record.year })}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-600 italic">
                                        No archived events found for this selection.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-surface-dark px-6 py-4 flex items-center justify-between border-t border-white/10">
                    <span className="text-sm text-slate-400">Showing <span className="text-white font-medium">{filteredRecords.length}</span> results</span>
                </div>
            </div>

            {modalData && <EventModal eventType={modalData.type} year={modalData.year} onClose={() => setModalData(null)} />}
        </div>
    );
};

export default Archive;
