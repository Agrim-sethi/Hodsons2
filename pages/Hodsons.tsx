import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Legend } from 'recharts';
import { mockStudents, getHodsonsResults, saveHodsonsResults, HodsonsResult, CATEGORIES_LIST, getSkipQualifyingCategories, saveSkipQualifyingCategories, HodsonsCategory } from '../utils/hodsonsStorage';
import * as XLSX from 'xlsx';
import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import studentClasses from '../utils/studentClasses.json';
const houseConfig = (house: string) => {
    const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
    return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const PodiumStep: React.FC<{ player: any; rank: number }> = ({ player, rank }) => {
    if (!player) {
        return (
            <div className="flex flex-col items-center justify-end z-10 w-full px-1 opacity-50">
                <div className="text-center mb-2 h-[60px] flex flex-col items-center justify-end">
                    <span className="text-xs text-slate-500 italic">TBD</span>
                </div>
                <div className={`w-full ${rank === 1 ? 'h-32' : rank === 2 ? 'h-24' : 'h-20'} bg-white/5 rounded-t-lg border-t-2 border-white/10 flex items-start justify-center pt-2`}>
                    <span className="text-xl font-black text-white/30">{rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}</span>
                </div>
            </div>
        );
    }

    const config = houseConfig(player.house);
    const heightMap: Record<number, string> = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
    const labelMap: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
    const medalColor: Record<number, string> = { 1: 'text-yellow-400', 2: 'text-slate-300', 3: 'text-amber-600' };

    return (
        <div className="flex flex-col items-center justify-end z-10 w-full px-1 lg:px-2">
            <div className="text-center mb-2">
                <p className="text-xs lg:text-sm font-bold text-white leading-tight mb-1 truncate w-24 mx-auto" title={player.name}>{player.name.split(' ')[0]}</p>
                <div className={`inline-flex items-center justify-center gap-1 uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg}/20 ${config.text} border ${config.border}/30 mb-1`}>
                    {player.house}
                </div>
                {player.timing && (
                    <div className="text-[10px] lg:text-xs font-mono text-slate-400 mb-1 leading-none">{player.timing}</div>
                )}
                <Icon name="emoji_events" className={`text-2xl lg:text-3xl ${medalColor[rank]} block mx-auto`} />
            </div>
            <div className={`w-full ${heightMap[rank]} bg-gradient-to-t ${config.gradient} rounded-t-lg border-t-4 ${config.border} flex items-start justify-center pt-2 shadow-lg shadow-black/50 relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                <span className="text-2xl font-black text-white/90 drop-shadow-md relative z-10">{labelMap[rank]}</span>
            </div>
        </div>
    );
};


const StandingsChart: React.FC<{ title: string; subtitle: string; data: any[]; icon: string; onClick?: () => void }> = ({ title, subtitle, data, icon, onClick }) => (
    <div
        className={`glass-panel w-full rounded-2xl p-6 lg:p-8 mb-6 border border-white/5 relative overflow-hidden h-[400px] flex flex-col ${onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all group' : ''}`}
        onClick={onClick}
    >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Icon name="bar_chart" className="text-[150px] text-white" />
        </div>

        <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Icon name={icon} size="24" />
            </div>
            <div>
                <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
            {onClick && (
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase font-bold text-slate-400">View Stats</span>
                </div>
            )}
        </div>

        <div className="flex-1 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} layout="vertical">
                    <defs>
                        {data.map((entry, idx) => (
                            <linearGradient key={`grad-${idx}`} id={`grad_${title.replace(/\s+/g, '')}_${entry.name}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={entry.color} stopOpacity={0.6} />
                                <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#fff', fontSize: 14, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value} pts`, 'Points']}
                    />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="points" radius={[0, 8, 8, 0]} barSize={28} animationDuration={1000}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#grad_${title.replace(/\s+/g, '')}_${entry.name})`} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const Hodsons: React.FC = () => {
    const [results, setResults] = useState<HodsonsResult[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editCategory, setEditCategory] = useState<HodsonsCategory | null>(null);
    const [selectedCategoryStats, setSelectedCategoryStats] = useState<any>(null);
    const [selectedStandingsStats, setSelectedStandingsStats] = useState<any>(null);
    const [filterHouse, setFilterHouse] = useState<string>('All');
    const [activePhase, setActivePhase] = useState<'pre_qualifying' | 'qualifying' | 'pre_finals' | 'finals'>('pre_qualifying');
    const [listSortField, setListSortField] = useState<'id' | 'house' | 'name' | 'status'>('id');
    const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showAllResultsModal, setShowAllResultsModal] = useState(false);

    // Derived State
    const [standings, setStandings] = useState<any[]>([]);
    const [bdStandings, setBdStandings] = useState<any[]>([]);
    const [gdStandings, setGdStandings] = useState<any[]>([]);
    const [pdStandings, setPdStandings] = useState<any[]>([]);
    const [categoriesData, setCategoriesData] = useState<any[]>([]);
    const [standingsDetailsMap, setStandingsDetailsMap] = useState<any>({});
    const [skipQualifyingCategories, setSkipQualifyingCategories] = useState<HodsonsCategory[]>([]);

    const [categoryModalTab, setCategoryModalTab] = useState<'qualifying' | 'finals' | 'list'>('qualifying');
    const [downloadFormat, setDownloadFormat] = useState<'xlsx' | 'docx'>('xlsx');
    const [isDownloading, setIsDownloading] = useState(false);

    // Passcode State
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [passcodeInput, setPasscodeInput] = useState('');
    const [passcodeError, setPasscodeError] = useState(false);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePasscodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcodeInput === '0001') {
            setShowPasscodeModal(false);
            setPasscodeInput('');
            setPasscodeError(false);
            setShowModal(true);
        } else {
            setPasscodeError(true);
        }
    };

    const loadData = () => {
        const skippedCategories = getSkipQualifyingCategories();
        const storedResults = getHodsonsResults().map(raw => {
            const r = { ...raw } as any;
            const qualifyingType = r.qualifyingType === 'late' ? 'dnf' : r.qualifyingType;
            const finalsType = r.finalsType === 'late' ? 'dnf' : r.finalsType;

            // If legacy data used "on_leave" in qualifying/finals, move that signal into the new pre-phases.
            const preQualifyingType = r.preQualifyingType ?? (qualifyingType === 'on_leave' ? 'on_leave' : 'pending');
            const preFinalsType = r.preFinalsType ?? (finalsType === 'on_leave' ? 'on_leave' : 'pending');

            const migrated: HodsonsResult = {
                studentId: r.studentId,
                preQualifyingType,
                preFinalsType,
                qualifyingType: qualifyingType === 'on_leave' ? 'pending' : qualifyingType,
                finalsType: finalsType === 'on_leave' ? 'pending' : finalsType,
                qualifyingTiming: r.qualifyingTiming ?? r.timing,
                qualifyingPosition: r.qualifyingPosition ?? r.position,
                finalsTiming: r.finalsTiming ?? r.timing,
                finalsPosition: r.finalsPosition ?? r.position
            };
            return migrated;
        });
        setResults(storedResults);
        setSkipQualifyingCategories(skippedCategories);

        const housePoints = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
        const bdPoints = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
        const gdPoints = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
        const pdPoints = { Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };

        const catsMap: any = {};
        CATEGORIES_LIST.forEach(c => {
            catsMap[c] = {
                name: c,
                top3: [null, null, null],
                stats: { qualified: 0, participants: 0, total: 0, dnfCount: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, totalPoints: 0, qualifyingPoints: 0, finalsPoints: 0 },
                houseStats: {
                    Vindhya: { total: 0, partQual: 0, qual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 },
                    Himalaya: { total: 0, partQual: 0, qual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 },
                    Nilgiri: { total: 0, partQual: 0, qual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 },
                    Siwalik: { total: 0, partQual: 0, qual: 0, finishedQual: 0, dnfQual: 0, medExcused: 0, absentQual: 0, onLeaveQual: 0, partFinals: 0, qualFinals: 0, finishedFinals: 0, dnfFinals: 0, absentFinals: 0, medExcusedFinals: 0, onLeaveFinals: 0, preQualMedExcused: 0, preQualOnLeave: 0, preFinalsMedExcused: 0, preFinalsOnLeave: 0, points: 0, qualifyingPoints: 0, finalsPoints: 0 }
                },
                bestTiming: null
            };
        });

        const deptDataMap: any = { Overall: {}, BD: {}, GD: {}, PD: {} };
        Object.keys(deptDataMap).forEach(k => {
            deptDataMap[k] = {
                title: k === 'Overall' ? "Overall House Standings" : `${k} Department Standings`,
                stats: { qualified: 0, participants: 0, total: 0, onLeave: 0, absent: 0, medExcused: 0, dnfCount: 0, finishedCount: 0 },
                houseStats: {
                    Vindhya: { total: 0, part: 0, qual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 },
                    Himalaya: { total: 0, part: 0, qual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 },
                    Nilgiri: { total: 0, part: 0, qual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 },
                    Siwalik: { total: 0, part: 0, qual: 0, absent: 0, medExcused: 0, onLeave: 0, dnf: 0, finished: 0, points: 0 }
                },
                categoryPointsMap: {}
            };
        });

        const updateDeptStats = (deptKey: string, stu: any, res: any, pts: number = 0) => {
            const d = deptDataMap[deptKey];
            d.stats.total += 1;
            d.houseStats[stu.house].total += 1;
            if (!d.categoryPointsMap[stu.category]) {
                d.categoryPointsMap[stu.category] = { name: stu.category, Vindhya: 0, Himalaya: 0, Nilgiri: 0, Siwalik: 0 };
            }

            // Participation
            if (['qualified', 'finished', 'dnf', 'late'].includes(res.qualifyingType as string)) {
                d.stats.participants += 1;
                d.houseStats[stu.house].part += 1;
            }

            // Qualification
            if (res.qualifyingType === 'qualified') {
                d.stats.qualified += 1;
                d.houseStats[stu.house].qual += 1;
            }

            if (res.qualifyingType === 'finished') {
                d.stats.finishedCount += 1;
                d.houseStats[stu.house].finished += 1;
            }
            if (res.finalsType === 'finisher') {
                d.stats.finishedCount += 1;
                d.houseStats[stu.house].finished += 1;
            }
            if (res.qualifyingType === 'dnf' || (res.qualifyingType as string) === 'late') {
                d.stats.dnfCount += 1;
                d.houseStats[stu.house].dnf += 1;
            }
            if (res.finalsType === 'dnf') {
                d.stats.dnfCount += 1;
                d.houseStats[stu.house].dnf += 1;
            }

            // Miscellaneous Statuses
            if (res.qualifyingType === 'absent' || res.finalsType === 'absent') {
                d.stats.absent += 1;
                d.houseStats[stu.house].absent += 1;
            }
            if (res.qualifyingType === 'medically_excused' || res.finalsType === 'medically_excused') {
                d.stats.medExcused += 1;
                d.houseStats[stu.house].medExcused += 1;
            }
            if (res.preQualifyingType === 'medically_excused') {
                d.stats.medExcused += 1;
                d.houseStats[stu.house].medExcused += 1;
            }
            if (res.preFinalsType === 'medically_excused') {
                d.stats.medExcused += 1;
                d.houseStats[stu.house].medExcused += 1;
            }
            if (res.preQualifyingType === 'on_leave' || res.preFinalsType === 'on_leave') {
                d.stats.onLeave += 1;
                d.houseStats[stu.house].onLeave += 1;
            }

            d.categoryPointsMap[stu.category][stu.house] += pts;
            d.houseStats[stu.house].points += pts;
        };

        // Loop through all students
        mockStudents.forEach(stu => {
            const res = storedResults.find(r => r.studentId === stu.id) || { studentId: stu.id, qualifyingType: 'pending', finalsType: 'pending' };
            if (!catsMap[stu.category]) return;

            const cat = catsMap[stu.category];
            const house = cat.houseStats[stu.house];
            const skipsQualifying = skippedCategories.includes(stu.category);

            cat.stats.total += 1;
            house.total += 1;

            let ptsRecord = 0;
            let qPts = 0;
            let fPts = 0;

            // Qualifying Phase
            if (res.qualifyingType !== 'pending') {
                if (res.qualifyingType === 'absent') {
                    house.absentQual += 1;
                    ptsRecord -= 1;
                } else if (res.qualifyingType === 'medically_excused') {
                    house.medExcused += 1;
                } else if (res.preQualifyingType === 'on_leave') {
                    house.onLeaveQual += 1;
                } else {
                    house.partQual += 1;
                    if (res.qualifyingType === 'dnf' || (res.qualifyingType as string) === 'late') {
                        house.dnfQual += 1;
                        ptsRecord -= 1;
                        cat.stats.dnfCount += 1;
                    }
                    if (res.qualifyingType === 'finished') {
                        house.finishedQual += 1;
                        ptsRecord += 1;
                    }
                    if (res.qualifyingType === 'qualified') house.qual += 1;
                }

                if (res.qualifyingTiming) {
                    if (!cat.bestTiming || res.qualifyingTiming < cat.bestTiming.timing) {
                        cat.bestTiming = { name: stu.name, timing: res.qualifyingTiming, house: stu.house };
                    }
                }

                house.qualifyingPoints += ptsRecord;
                cat.stats.qualifyingPoints += ptsRecord;
                qPts = ptsRecord;
            }

            // Finals Phase
            const progressed = skipsQualifying || res.qualifyingType === 'qualified';

            if (progressed) {
                if (res.finalsType === 'qualified_pos') {
                    cat.stats.qualified += 1;
                    cat.stats.participants += 1;
                    house.partFinals += 1;
                    house.qualFinals += 1;

                    let pts = 5;
                    const pos = res.finalsPosition || 0;
                    if (pos >= 1 && pos <= 10) pts += (11 - pos);

                    ptsRecord += pts;

                    if (pos === 1) cat.top3[0] = { ...stu, position: 1, timing: res.finalsTiming, class: (studentClasses as any)[stu.id] || '—' };
                    if (pos === 2) cat.top3[1] = { ...stu, position: 2, timing: res.finalsTiming, class: (studentClasses as any)[stu.id] || '—' };
                    if (pos === 3) cat.top3[2] = { ...stu, position: 3, timing: res.finalsTiming, class: (studentClasses as any)[stu.id] || '—' };

                    if (res.finalsTiming) {
                        if (!cat.bestTiming || res.finalsTiming < cat.bestTiming.timing) {
                            cat.bestTiming = { name: stu.name, timing: res.finalsTiming, house: stu.house };
                        }
                    }
                } else if (res.finalsType === 'finisher') {
                    cat.stats.participants += 1;
                    house.partFinals += 1;
                    house.finishedFinals += 1;

                    ptsRecord += 1;

                    if (res.finalsTiming) {
                        if (!cat.bestTiming || res.finalsTiming < cat.bestTiming.timing) {
                            cat.bestTiming = { name: stu.name, timing: res.finalsTiming, house: stu.house };
                        }
                    }
                } else if (res.finalsType === 'absent') {
                    house.absentFinals += 1;
                    ptsRecord -= 1;
                } else if (res.finalsType === 'dnf') {
                    house.dnfFinals += 1;
                    ptsRecord -= 1;
                } else if (res.finalsType === 'medically_excused') {
                    house.medExcusedFinals += 1;
                } else if (res.preFinalsType === 'on_leave') {
                    house.onLeaveFinals += 1;
                }

                const stageFPts = ptsRecord - qPts;
                house.finalsPoints += stageFPts;
                cat.stats.finalsPoints += stageFPts;
                fPts = stageFPts;
            }

            // Preliminary Status Tracking
            if (res.preQualifyingType === 'medically_excused') { cat.stats.preQualMedExcused += 1; house.preQualMedExcused += 1; }
            if (res.preQualifyingType === 'on_leave') { cat.stats.preQualOnLeave += 1; house.preQualOnLeave += 1; }
            if (res.preFinalsType === 'medically_excused') { cat.stats.preFinalsMedExcused += 1; house.preFinalsMedExcused += 1; }
            if (res.preFinalsType === 'on_leave') { cat.stats.preFinalsOnLeave += 1; house.preFinalsOnLeave += 1; }

            cat.stats.totalPoints += ptsRecord;
            house.points += ptsRecord;

            if (ptsRecord !== 0) {
                housePoints[stu.house] += ptsRecord;
                if (stu.category.startsWith('BD')) bdPoints[stu.house] += ptsRecord;
                else if (stu.category.startsWith('GD')) gdPoints[stu.house] += ptsRecord;
                else if (stu.category.startsWith('PD')) pdPoints[stu.house] += ptsRecord;
            }

            updateDeptStats('Overall', stu, res, ptsRecord);
            if (stu.category.startsWith('BD')) updateDeptStats('BD', stu, res, ptsRecord);
            else if (stu.category.startsWith('GD')) updateDeptStats('GD', stu, res, ptsRecord);
            else if (stu.category.startsWith('PD')) updateDeptStats('PD', stu, res, ptsRecord);
        });

        Object.keys(deptDataMap).forEach(k => {
            deptDataMap[k].breakdown = Object.values(deptDataMap[k].categoryPointsMap);
            deptDataMap[k].stats.qualificationRate = deptDataMap[k].stats.total > 0 ? Math.round((deptDataMap[k].stats.qualified / deptDataMap[k].stats.total) * 100) + '%' : '0%';
        });
        setStandingsDetailsMap(deptDataMap);

        const createStandingsData = (pts: any) => [
            { name: 'Vindhya', points: pts.Vindhya, color: HOUSE_COLORS.vindhya.hex },
            { name: 'Himalaya', points: pts.Himalaya, color: HOUSE_COLORS.himalaya.hex },
            { name: 'Nilgiri', points: pts.Nilgiri, color: HOUSE_COLORS.nilgiri.hex },
            { name: 'Siwalik', points: pts.Siwalik, color: HOUSE_COLORS.siwalik.hex }
        ].sort((a, b) => b.points - a.points);

        setStandings(createStandingsData(housePoints));
        setBdStandings(createStandingsData(bdPoints));
        setGdStandings(createStandingsData(gdPoints));
        setPdStandings(createStandingsData(pdPoints));

        const newCatsData = CATEGORIES_LIST.map(c => {
            const d = catsMap[c];
            const qualRate = d.stats.total > 0 ? Math.round((d.stats.qualified / d.stats.total) * 100) : 0;

            let totalPoints = 0;
            let totalAbsent = 0;
            let totalMedExcused = 0;
            let totalOnLeave = 0;
            let totalParticipation = 0;
            let totalPreQualOk = 0;
            let totalPreFinalsOk = 0;
            Object.values(d.houseStats).forEach((h: any) => {
                totalPoints += h.points;
                totalParticipation += h.partQual;
                totalAbsent += (h.absentQual + h.absentFinals);
                totalMedExcused += (h.medExcused + h.medExcusedFinals + h.preQualMedExcused + h.preFinalsMedExcused);
                totalOnLeave += (h.onLeaveQual + h.onLeaveFinals + h.preQualOnLeave + h.preFinalsOnLeave);
            });

            // Calculate Pre-Phase transition counts
            mockStudents.filter(s => s.category === c).forEach(stu => {
                const r = storedResults.find(res => res.studentId === stu.id);
                if (r?.preQualifyingType === 'participating') totalPreQualOk += 1;
                if (skippedCategories.includes(c) || r?.preFinalsType === 'participating') totalPreFinalsOk += 1;
            });

            return {
                name: c,
                top3: [
                    d.top3[0] ? { ...d.top3[0], rank: 1 } : null,
                    d.top3[1] ? { ...d.top3[1], rank: 2 } : null,
                    d.top3[2] ? { ...d.top3[2], rank: 3 } : null
                ],
                stats: {
                    qualificationRate: `${qualRate}%`,
                    totalParticipation,
                    qualifiedCount: d.stats.qualified,
                    totalCount: d.stats.total,
                    dnfCount: d.stats.dnfCount,
                    preQualOk: totalPreQualOk,
                    preFinalsOk: totalPreFinalsOk,
                    preQualMedExcused: d.stats.preQualMedExcused,
                    preQualOnLeave: d.stats.preQualOnLeave,
                    preFinalsMedExcused: d.stats.preFinalsMedExcused,
                    preFinalsOnLeave: d.stats.preFinalsOnLeave,
                    totalPoints: d.stats.totalPoints,
                    totalAbsent,
                    totalMedExcused,
                    totalOnLeave,
                    skipsQualifying: skippedCategories.includes(c),
                    houseStats: d.houseStats
                },
                houseStats: d.houseStats,
                bestTiming: d.bestTiming,
                skipsQualifying: skippedCategories.includes(c)
            };
        });

        setCategoriesData(newCatsData);
    };

    const handleSaveResult = (cat: string) => {
        // Validation rules:
        // - Qualifying: timing required for Qualified
        // - Finals: position + timing required for Qualifier + Position
        const studentsInCat = mockStudents.filter(s => s.category === cat);
        const getRes = (stuId: string) => results.find(r => r.studentId === stuId) || { studentId: stuId, preQualifyingType: 'pending' as const, preFinalsType: 'pending' as const, qualifyingType: 'pending' as const, finalsType: 'pending' as const };

        const missingQualTiming: string[] = [];
        const missingFinalsTiming: string[] = [];
        const missingFinalsPosition: string[] = [];

        studentsInCat.forEach(stu => {
            const r: any = getRes(stu.id);
            if (r.qualifyingType === 'qualified' && !r.qualifyingTiming) missingQualTiming.push(`${stu.id} ${stu.name}`);
            if (r.finalsType === 'qualified_pos') {
                // If timing is present, position will be auto-calculated on save, so don't block.
                // Only block if timing is missing.
                if (!r.finalsTiming) missingFinalsTiming.push(`${stu.id} ${stu.name}`);
            }
        });

        if (missingQualTiming.length || missingFinalsTiming.length || missingFinalsPosition.length) {
            const lines = [
                `Cannot save ${cat}. Fix these first:`,
                missingQualTiming.length ? `- Qualifying timing missing (Qualified): ${missingQualTiming.length}` : null,
                missingFinalsTiming.length ? `- Finals timing missing (Qualified/Participating): ${missingFinalsTiming.length}` : null
            ].filter(Boolean) as string[];
            window.alert(lines.join('\n'));
            return;
        }

        // Automatically rank Qualifiers by Timing in the Qualifying stage
        const qualResults = results.filter(r => {
            const stu = studentsInCat.find(s => s.id === r.studentId);
            return stu && r.qualifyingType === 'qualified' && r.qualifyingTiming;
        });

        if (qualResults.length > 0) {
            const sortedByTime = [...qualResults].sort((a, b) => {
                const parseToSec = (t: string) => {
                    const [m, s] = t.split(':').map(val => parseInt(val) || 0);
                    return m * 60 + s;
                };
                return parseToSec(a.qualifyingTiming!) - parseToSec(b.qualifyingTiming!);
            });

            sortedByTime.forEach((r, idx) => {
                const resIdx = results.findIndex(res => res.studentId === r.studentId);
                if (resIdx > -1) {
                    results[resIdx].qualifyingPosition = idx + 1;
                }
            });
        }

        // Automatically rank Finalists by Timing in the Final phase if they are markes as Qualified + Position but position is not yet manually overridden effectively (or just auto-rank them anyway)
        // Note: Finals rank IS points-related, so auto-ranking here is an ASSESS FILTER as requested
        const finalResults = results.filter(r => {
            const stu = studentsInCat.find(s => s.id === r.studentId);
            return stu && (r.finalsType === 'qualified_pos') && r.finalsTiming;
        });

        if (finalResults.length > 0) {
            const sortedByTime = [...finalResults].sort((a, b) => {
                const parseToSec = (t: string) => {
                    const [m, s] = t.split(':').map(val => parseInt(val) || 0);
                    return m * 60 + s;
                };
                return parseToSec(a.finalsTiming!) - parseToSec(b.finalsTiming!);
            });

            sortedByTime.forEach((r, idx) => {
                const resIdx = results.findIndex(res => res.studentId === r.studentId);
                if (resIdx > -1) {
                    results[resIdx].finalsPosition = idx + 1;
                }
            });
        }

        saveHodsonsResults(results);
        loadData();
        setEditCategory(null);
    };

    const handleClearCategoryResults = (cat: string) => {
        if (window.confirm(`Are you sure you want to completely erase ALL results for ${cat}? This cannot be undone.`)) {
            // Overwrite results for this specific category to 'pending'
            const newResults = results.map(r => {
                const stu = mockStudents.find(s => s.id === r.studentId);
                if (stu && stu.category === cat) {
                    return { ...r, qualifyingType: 'pending' as const, finalsType: 'pending' as const, qualifyingPosition: undefined, qualifyingTiming: undefined, finalsPosition: undefined, finalsTiming: undefined };
                }
                return r;
            });

            // For pending items not yet in the results array, simply let them rely on fallback
            // To ensure complete wiping, also filter out any pending items 
            const cleanedResults = newResults.filter(r => r.qualifyingType !== 'pending' || r.finalsType !== 'pending');
            setResults(cleanedResults);
            saveHodsonsResults(cleanedResults);

            // Immediately reload data so podium and standings update in backend state
            // even if the user hasn't clicked "Save Results".
            loadData();
        }
    };

    const handleSkipQualifyingPhase = (cat: HodsonsCategory) => {
        const confirmed = window.confirm(
            `Skip the qualifying phase for ${cat}?\n\nThis will delete all qualifying-stage data for this category, allow the full enrolled list to move directly to finals, and reset the pre-finals list to participating for all students in this category.`
        );

        if (!confirmed) return;

        const categoryStudentIds = new Set(
            mockStudents.filter(student => student.category === cat).map(student => student.id)
        );

        const existingByStudent = new Map(results.map(result => [result.studentId, result]));
        const updatedResults = mockStudents
            .filter(student => student.category === cat)
            .map(student => {
                const current = existingByStudent.get(student.id);
                return {
                    studentId: student.id,
                    preQualifyingType: current?.preQualifyingType ?? 'pending',
                    preFinalsType: 'participating' as const,
                    qualifyingType: 'pending' as const,
                    qualifyingPosition: undefined,
                    qualifyingTiming: undefined,
                    finalsType: current?.finalsType ?? 'pending',
                    finalsPosition: current?.finalsPosition,
                    finalsTiming: current?.finalsTiming
                };
            });

        const untouchedResults = results.filter(result => !categoryStudentIds.has(result.studentId));
        const nextResults = [...untouchedResults, ...updatedResults];
        const nextSkippedCategories = Array.from(new Set([...skipQualifyingCategories, cat]));

        setResults(nextResults);
        setSkipQualifyingCategories(nextSkippedCategories);
        saveHodsonsResults(nextResults);
        saveSkipQualifyingCategories(nextSkippedCategories);
        setActivePhase('finals');
        loadData();
    };

    const handleRestoreQualifyingPhase = (cat: HodsonsCategory) => {
        const confirmed = window.confirm(
            `Restore the qualifying phase for ${cat}?\n\nThis will remove skip-qualifying mode for this category and reset auto-filled pre-finals entries back to pending where no qualifying result exists. Finals data will be kept.`
        );

        if (!confirmed) return;

        const nextResults = results.map(result => {
            const student = mockStudents.find(s => s.id === result.studentId);
            if (!student || student.category !== cat) return result;

            if (result.qualifyingType === 'pending' && result.preFinalsType === 'participating') {
                return {
                    ...result,
                    preFinalsType: 'pending' as const
                };
            }

            return result;
        });

        const nextSkippedCategories = skipQualifyingCategories.filter(category => category !== cat);

        setResults(nextResults);
        setSkipQualifyingCategories(nextSkippedCategories);
        saveHodsonsResults(nextResults);
        saveSkipQualifyingCategories(nextSkippedCategories);
        setActivePhase('qualifying');
        loadData();
    };

    const handleResultChange = (
        stuId: string,
        phase: 'qualifying' | 'finals',
        type: any,
        posStr: string,
        timingStr: string,
        preQualifyingType: any,
        preFinalsType: any
    ) => {
        setResults(prev => {
            const newRes = [...prev];
            const idx = newRes.findIndex(r => r.studentId === stuId);
            const pos = posStr ? parseInt(posStr) : undefined;
            const timing = timingStr || undefined;

            if (idx >= 0) {
                const current = newRes[idx];
                newRes[idx] = {
                    ...current,
                    preQualifyingType,
                    preFinalsType,
                    qualifyingType: phase === 'qualifying' ? type : current.qualifyingType,
                    finalsType: phase === 'finals' ? type : current.finalsType,
                    qualifyingPosition: phase === 'qualifying' ? pos : current.qualifyingPosition,
                    qualifyingTiming: phase === 'qualifying' ? timing : current.qualifyingTiming,
                    finalsPosition: phase === 'finals' ? pos : current.finalsPosition,
                    finalsTiming: phase === 'finals' ? timing : current.finalsTiming
                };
            } else {
                newRes.push({
                    studentId: stuId,
                    preQualifyingType,
                    preFinalsType,
                    qualifyingType: phase === 'qualifying' ? type : 'pending',
                    finalsType: phase === 'finals' ? type : 'pending',
                    qualifyingPosition: phase === 'qualifying' ? pos : undefined,
                    qualifyingTiming: phase === 'qualifying' ? timing : undefined,
                    finalsPosition: phase === 'finals' ? pos : undefined,
                    finalsTiming: phase === 'finals' ? timing : undefined
                });
            }
            return newRes;
        });
    };

    const parseTiming = (timing?: string): { mm: string; ss: string } => {
        if (!timing) return { mm: '', ss: '' };
        const m = timing.split(':');
        return { mm: m[0] || '', ss: m[1] || '' };
    };

    const parseTimingToSeconds = (timing?: string): number => {
        if (!timing) return Number.POSITIVE_INFINITY;
        const [mm, ss] = timing.split(':').map(val => parseInt(val, 10) || 0);
        return mm * 60 + ss;
    };

    const getCategoryStagePositions = (category: string, stage: 'qualifying' | 'finals') => {
        const rankedResults = results
            .filter(result => {
                const student = mockStudents.find(stu => stu.id === result.studentId);
                if (!student || student.category !== category) return false;

                if (stage === 'qualifying') {
                    return result.qualifyingType === 'qualified' && Boolean(result.qualifyingTiming);
                }

                return result.finalsType === 'qualified_pos' && Boolean(result.finalsTiming);
            })
            .sort((a, b) => {
                const timingA = stage === 'qualifying' ? a.qualifyingTiming : a.finalsTiming;
                const timingB = stage === 'qualifying' ? b.qualifyingTiming : b.finalsTiming;
                return parseTimingToSeconds(timingA) - parseTimingToSeconds(timingB);
            });

        return new Map(rankedResults.map((result, index) => [result.studentId, index + 1]));
    };

    const buildTiming = (mm: string, ss: string): string | undefined => {
        const m = mm.trim();
        const s = ss.trim();
        if (m === '' && s === '') return undefined;
        return `${m}:${s}`;
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const downloadAllResultsDocx = async () => {
        try {
            setIsDownloading(true);
            const timestamp = new Date().toISOString().slice(0, 10);

            const sections = categoriesData.map(cat => {
                const rows = cat.top3.filter(Boolean).map((stu: any) => ({
                    Rank: stu.position === 1 ? '1st' : stu.position === 2 ? '2nd' : '3rd',
                    Name: stu.name,
                    Class: stu.class || '—',
                    House: stu.house,
                    Timing: stu.timing || '—'
                }));

                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: ['Rank', 'Name', 'Class', 'House', 'Timing'].map(h => new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                                shading: { fill: 'EEEEEE', type: ShadingType.CLEAR }
                            }))
                        }),
                        ...rows.map(r => new TableRow({
                            children: [r.Rank, r.Name, r.Class, r.House, r.Timing].map(v => new TableCell({
                                children: [new Paragraph(String(v))]
                            }))
                        }))
                    ]
                });

                return [
                    new Paragraph({ children: [new TextRun({ text: cat.name, bold: true, size: 28 })], spacing: { before: 400, after: 200 } }),
                    table
                ];
            }).flat();

            const standingsSection = Object.values(standingsDetailsMap).map((dept: any) => {
                const houseStats = dept.houseStats;
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: ['House', 'Points'].map(h => new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                                shading: { fill: 'EEEEEE', type: ShadingType.CLEAR }
                            }))
                        }),
                        ...['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].sort((a, b) => (houseStats[b]?.points || 0) - (houseStats[a]?.points || 0)).map(h => new TableRow({
                            children: [h, String(houseStats[h]?.points || 0)].map(v => new TableCell({
                                children: [new Paragraph(String(v))]
                            }))
                        }))
                    ]
                });

                return [
                    new Paragraph({ children: [new TextRun({ text: dept.title, bold: true, size: 24 })], spacing: { before: 600, after: 200 } }),
                    table
                ];
            }).flat();

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ children: [new TextRun({ text: "HODSON'S RUN 2026 - FINAL RESULTS", bold: true, size: 36 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        ...sections,
                        new Paragraph({ children: [new TextRun({ text: "HOUSE STANDINGS", bold: true, size: 32 })], spacing: { before: 800, after: 400 }, alignment: AlignmentType.CENTER }),
                        ...standingsSection
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            downloadBlob(blob, `Hodsons 2026 Full Results ${timestamp}.docx`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadCategoryStageList = async (category: string, stage: 'pre_qualifying' | 'qualifying' | 'pre_finals' | 'finals', format: 'xlsx' | 'docx') => {
        try {
            setIsDownloading(true);
            const skipsQualifying = skipQualifyingCategories.includes(category);

            const stageMap: any = {
                pre_qualifying: '0. Pre-Qualifying',
                qualifying: '1. Qualifying',
                pre_finals: '1.5 Pre-Finals',
                finals: '2. Finals'
            };
            const stageLabel = stageMap[stage];
            const safeCat = category.replace(/\s+/g, ' ').trim();
            const timestamp = new Date().toISOString().slice(0, 10);
            const fileBase = `Hodsons ${safeCat} ${stageLabel} List ${timestamp}`;

            const rows = mockStudents
                .filter(s => s.category === category)
                .filter(s => filterHouse === 'All' || s.house === filterHouse)
                .map((stu, idx) => {
                    const res = results.find(r => r.studentId === stu.id) || { studentId: stu.id, preQualifyingType: 'pending', preFinalsType: 'pending', qualifyingType: 'pending', finalsType: 'pending', position: undefined, timing: undefined };

                    const preQualOk = res.preQualifyingType === 'participating';
                    const qualifiedForPreFinals = skipsQualifying || res.qualifyingType === 'qualified';
                    const preFinalsOk = skipsQualifying || res.preFinalsType === 'participating';

                    if (stage === 'qualifying' && !preQualOk) return null;
                    if (stage === 'pre_finals' && !qualifiedForPreFinals) return null;
                    if (stage === 'finals' && (!qualifiedForPreFinals || !preFinalsOk)) return null;

                    if (stage === 'pre_qualifying') {
                        return {
                            SN: idx + 1,
                            'Comp No': stu.id,
                            'Player Name': stu.name,
                            House: stu.house,
                            Status: res.preQualifyingType || 'pending'
                        };
                    }

                    if (stage === 'pre_finals') {
                        return {
                            SN: idx + 1,
                            'Comp No': stu.id,
                            'Player Name': stu.name,
                            House: stu.house,
                            Status: skipsQualifying ? 'participating' : (res.preFinalsType || 'pending')
                        };
                    }

                    if (stage === 'qualifying') {
                        return {
                            SN: idx + 1,
                            'Comp No': stu.id,
                            'Player Name': stu.name,
                            House: stu.house,
                            Status: res.qualifyingType.replace('_', ' '),
                            Timing: res.qualifyingTiming || '—'
                        };
                    }

                    return {
                        SN: idx + 1,
                        'Comp No': stu.id,
                        'Player Name': stu.name,
                        House: stu.house,
                        Status: res.finalsType.replace('_', ' '),
                        Position: res.finalsPosition || '—',
                        Timing: res.finalsTiming || '—'
                    };
                })
                .filter(Boolean) as Record<string, string | number>[];

            if (format === 'xlsx') {
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, stage.slice(0, 31));
                const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                downloadBlob(blob, `${fileBase}.xlsx`);
                return;
            }

            const headers = rows.length > 0 ? Object.keys(rows[0]) : (
                stage === 'pre_qualifying' || stage === 'pre_finals' ? ['SN', 'Comp No', 'Player Name', 'House', 'Status']
                    : stage === 'qualifying' ? ['SN', 'Comp No', 'Player Name', 'House', 'Status', 'Timing']
                        : ['SN', 'Comp No', 'Player Name', 'House', 'Status', 'Position', 'Timing']
            );

            const table = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: headers.map(h => new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                            width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
                        }))
                    }),
                    ...rows.map(r => new TableRow({
                        children: headers.map(h => new TableCell({
                            children: [new Paragraph(String(r[h] ?? ''))],
                            width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
                        }))
                    }))
                ]
            });

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: fileBase, bold: true })]
                        }),
                        new Paragraph({ text: '' }),
                        table
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            downloadBlob(blob, `${fileBase}.docx`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="max-w-[1440px] mx-auto w-full pb-20 px-4">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pt-10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm uppercase tracking-wider">
                        <Icon name="directions_run" className="text-lg" />
                        <span>Annual Event</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white mb-2">
                        HODSON'S RUN 2026
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl">
                        The ultimate test of endurance. Explore the house standings, top performers across categories, and qualification statistics for our annual HODSON run.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => setShowAllResultsModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10"
                    >
                        <Icon name="history_edu" />
                        <span>View All Results</span>
                    </button>
                    <button
                        onClick={() => setShowPasscodeModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                    >
                        <Icon name="edit_document" />
                        <span>Add Results</span>
                    </button>
                </div>
            </div>

            {/* Standings Section */}
            <div className="relative mb-24">
                <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Icon name="military_tech" size="24" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Championship Leaderboards</h2>
                        <p className="text-sm text-slate-400">Departmental breakdown and overall house point distribution</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                    <StandingsChart
                        title="Overall House Standings"
                        subtitle="Cumulative points combined across all 12 categories"
                        data={standings}
                        icon="leaderboard"
                        onClick={() => setSelectedStandingsStats(standingsDetailsMap['Overall'])}
                    />
                    <StandingsChart
                        title="BD Department Standings"
                        subtitle="Points from Boys Department Opens & Under Divisions"
                        data={bdStandings}
                        icon="boy"
                        onClick={() => setSelectedStandingsStats(standingsDetailsMap['BD'])}
                    />
                    <StandingsChart
                        title="GD Department Standings"
                        subtitle="Points from Girls Department Opens & Under Divisions"
                        data={gdStandings}
                        icon="girl"
                        onClick={() => setSelectedStandingsStats(standingsDetailsMap['GD'])}
                    />
                    <StandingsChart
                        title="PD Department Standings"
                        subtitle="Points from Prep Department (PDG + PDB) Divisions"
                        data={pdStandings}
                        icon="child_care"
                        onClick={() => setSelectedStandingsStats(standingsDetailsMap['PD'])}
                    />
                </div>

                {/* Decorative Background for Standings */}
                <div className="absolute -inset-x-8 -top-8 -bottom-12 bg-white/[0.01] rounded-[40px] border border-white/[0.02] pointer-events-none -z-10"></div>
            </div>

            {/* Intricate Visual Divider */}
            <div className="relative h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20 flex justify-center items-center">
                <div className="absolute size-12 rounded-full border border-white/10 bg-[#0f172a] flex items-center justify-center shadow-2xl">
                    <div className="size-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center animate-pulse">
                        <Icon name="expand_more" className="text-white text-xl" />
                    </div>
                </div>
                <div className="absolute -top-10 text-[80px] font-black text-white/[0.02] uppercase tracking-[20px] pointer-events-none select-none">
                    RESULTS
                </div>
            </div>

            <div className="flex items-center gap-3 mb-8">
                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/10">
                    <Icon name="category" size="22" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Category Results</h3>
                    <p className="text-sm text-slate-400">Podium standings and detailed metrics for each age group</p>
                </div>
                <span className="ml-auto px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest hidden md:inline">
                    Click cards for detailed stats
                </span>
            </div>

            {/* Cards for Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {categoriesData.map((cat, idx) => (
                    <div
                        key={idx}
                        onClick={() => setSelectedCategoryStats(cat)}
                        className="glass-panel rounded-2xl p-6 relative overflow-hidden cursor-pointer border border-white/5 hover:border-primary/40 focus:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 flex flex-col h-full group outline-none"
                    >
                        <div className="absolute top-4 right-4 text-slate-500/20 pointer-events-none group-hover:text-primary/20 transition-colors">
                            <Icon name="directions_run" className="text-6xl" />
                        </div>

                        <div className="mb-6 relative z-10 border-b border-white/5 pb-4">
                            <h3 className="text-2xl font-black text-white uppercase tracking-wide group-hover:text-primary transition-colors">{cat.name}</h3>
                            <p className="text-slate-400 text-sm mt-1">HODSON Podium</p>
                        </div>

                        {/* Podium Display */}
                        <div className="flex items-end justify-center gap-0 lg:gap-2 h-[260px] mb-8 relative z-10 w-full max-w-[400px] mx-auto opacity-90 group-hover:opacity-100 transition-opacity">
                            {[cat.top3[1], cat.top3[0], cat.top3[2]].map((player: any, i: number) => (
                                <PodiumStep key={i} player={player} rank={player ? player.rank : (i === 0 ? 2 : i === 1 ? 1 : 3)} />
                            ))}
                        </div>

                        <div className="flex flex-col gap-6 mb-8 mt-auto px-2 border-t border-white/5 pt-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(houseName => {
                                    const house = cat.houseStats[houseName];
                                    const cfg = houseConfig(houseName);
                                    return (
                                        <div key={houseName} className="text-center bg-white/[0.03] p-3 rounded-xl border border-white/5 group-hover:border-primary/20 transition-colors">
                                            <p className={`text-[8px] font-bold uppercase tracking-[0.2em] mb-1 ${cfg.text}`}>{houseName}</p>
                                            <p className="text-xl font-black text-white">
                                                {house.points > 0 ? `+${house.points}` : house.points}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between gap-4 py-3 px-5 bg-white/[0.03] rounded-2xl border border-white/5">
                                <div className="flex flex-col flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Pre-Qualifying Off-Rolls</span>
                                        <Icon name="history" size="10" className="text-slate-600" />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-1.5 rounded-full bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                                            <span className="text-[10px] font-black text-slate-300">MED: <span className="text-amber-500">{cat.stats.preQualMedExcused}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-1.5 rounded-full bg-blue-400/60 shadow-[0_0_8px_rgba(96,165,250,0.4)]"></div>
                                            <span className="text-[10px] font-black text-slate-300">LEAVE: <span className="text-blue-400">{cat.stats.preQualOnLeave}</span></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-px h-8 bg-white/5"></div>
                                <div className="flex flex-col flex-1 items-end">
                                    <div className="flex justify-between items-center mb-2 w-full">
                                        <Icon name="emoji_events" size="10" className="text-slate-600" />
                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Pre-Finals Off-Rolls</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-1.5 rounded-full bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                                            <span className="text-[10px] font-black text-slate-300">MED: <span className="text-amber-500">{cat.stats.preFinalsMedExcused}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-1.5 rounded-full bg-blue-400/60 shadow-[0_0_8px_rgba(96,165,250,0.4)]"></div>
                                            <span className="text-[10px] font-black text-slate-300">LEAVE: <span className="text-blue-400">{cat.stats.preFinalsOnLeave}</span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {selectedCategoryStats && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedCategoryStats(null)}></div>
                    <div className="relative w-full max-w-6xl bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10 flex flex-col bg-gradient-to-r from-primary/10 to-transparent">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">HODSON RUN 2026</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                        <span className="text-slate-400 text-xs">{selectedCategoryStats.name}</span>
                                    </div>
                                    <h3 className="text-white text-3xl font-black">{selectedCategoryStats.name} Insights</h3>
                                </div>
                                <button onClick={() => setSelectedCategoryStats(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2 hover:bg-white/10">
                                    <Icon name="close" size="24" />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setCategoryModalTab('qualifying')} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${categoryModalTab === 'qualifying' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    <Icon name="history" size="16" /> 1. Qualifying Stats
                                </button>
                                <button onClick={() => setCategoryModalTab('finals')} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${categoryModalTab === 'finals' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    <Icon name="emoji_events" size="16" /> 2. Finals Results
                                </button>
                                <button onClick={() => setCategoryModalTab('list')} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${categoryModalTab === 'list' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    <Icon name="format_list_bulleted" size="16" /> Competitor List
                                </button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
                            {categoryModalTab === 'qualifying' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Overall Category Summary */}
                                    <div className="glass-panel p-6 border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent rounded-3xl mb-4">
                                        <div className="flex items-center gap-2 mb-5">
                                            <Icon name="analytics" size="18" className="text-primary" />
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Qualifying Stage Summary</span>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center"><Icon name="groups" size="14" className="text-white" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Enrolled</span>
                                                </div>
                                                <span className="text-white text-2xl font-black">{selectedCategoryStats.stats.totalCount}</span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-green-500/10 flex items-center justify-center"><Icon name="directions_run" size="14" className="text-green-400" /></div>
                                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-wide leading-tight">Participated</span>
                                                </div>
                                                <span className="text-white text-2xl font-black">{selectedCategoryStats.stats.totalParticipation}</span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-green-500/10 hover:border-green-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-green-500/10 flex items-center justify-center"><Icon name="verified" size="14" className="text-green-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Qualified</span>
                                                </div>
                                                <span className="text-green-400 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.qual, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><Icon name="check_circle" size="14" className="text-blue-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Finished</span>
                                                </div>
                                                <span className="text-blue-400 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.finishedQual, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-red-500/10 hover:border-red-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-red-500/10 flex items-center justify-center"><Icon name="person_off" size="14" className="text-red-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Absentees</span>
                                                </div>
                                                <span className="text-red-400 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.absentQual, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-slate-400/10 hover:border-slate-300/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center"><Icon name="medical_services" size="14" className="text-slate-300" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Med. Excused</span>
                                                </div>
                                                <span className="text-slate-300 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.medExcused + h.preQualMedExcused, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-white/5 flex items-center justify-center"><Icon name="history" size="14" className="text-slate-300" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">DNF</span>
                                                </div>
                                                <span className="text-slate-300 text-2xl font-black">{selectedCategoryStats.stats.dnfCount || 0}</span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-amber-500/10 hover:border-amber-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><Icon name="money_off" size="14" className="text-amber-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Stage Points</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-amber-400 text-2xl font-black">{selectedCategoryStats.stats.qualifyingPoints}</span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-none mt-1">
                                                        {(() => {
                                                            const hs = Object.values(selectedCategoryStats.houseStats) as any[];
                                                            const finishers = hs.reduce((a, h) => a + h.finishedQual, 0);
                                                            const absents = hs.reduce((a, h) => a + h.absentQual, 0);
                                                            const dnfs = hs.reduce((a, h) => a + h.dnfQual, 0);
                                                            return <>({finishers} &times; 1) - ({absents} &times; 1) - ({dnfs} &times; 1)</>;
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(hName => {
                                            const h = selectedCategoryStats.houseStats[hName];
                                            const cfg = houseConfig(hName);
                                            return (
                                                <div key={hName} className="glass-panel p-6 border border-white/5 rounded-2xl relative overflow-hidden group">
                                                    <div className={`absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity`}>
                                                        <Icon name="history" size="64" />
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className={`size-10 rounded-xl flex items-center justify-center font-bold ${cfg.bg}/20 ${cfg.text} border ${cfg.border}/30`}>{hName[0]}</div>
                                                        <h4 className={`font-bold ${cfg.text} text-lg uppercase tracking-tight`}>{hName}</h4>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Enrolled Students</span>
                                                            <span className="text-white font-black">{h.total}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Absentees</span>
                                                            <span className="text-red-400 font-black">{h.absentQual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
                                                            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Q. Moved to Finals</span>
                                                            <span className="text-green-400 font-black text-lg">{h.qual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">DNF</span>
                                                            <span className="text-slate-300 font-black">{h.dnfQual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Finished</span>
                                                            <span className="text-blue-400 font-black">{h.finishedQual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] italic border-t border-white/5 pt-3">
                                                            <span className="text-slate-500">Pre-Q Med: <span className="text-slate-300 font-bold">{h.preQualMedExcused}</span></span>
                                                            <span className="text-slate-500">Pre-Q Leave: <span className="text-slate-300 font-bold">{h.preQualOnLeave}</span></span>
                                                        </div>
                                                        <div className="flex justify-between items-center border-t border-white/10 pt-4">
                                                            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Qualifying Points</span>
                                                            <div className="flex flex-col items-end">
                                                                <span className={`font-black text-2xl ${h.qualifyingPoints > 0 ? 'text-amber-400' : h.qualifyingPoints < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                                    {h.qualifyingPoints}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight text-right leading-tight mt-1 whitespace-nowrap">
                                                                    ({h.finishedQual} &times; 1) - ({h.absentQual} &times; 1) - ({h.dnfQual} &times; 1)
                                                                </span>
                                                                <span className="text-[8px] text-slate-600 font-medium uppercase tracking-widest mt-0.5">(Finishers - Abs - DNF)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Charts Section */}
                                    <div className="space-y-6">
                                        {/* Row 1: Large Bar Chart */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                    <Icon name="bar_chart" size="20" />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-base leading-tight">House Participation Comparison</h4>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Enrolled vs Participated vs Qualified</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-[350px]">
                                                {(() => {
                                                    const hs = selectedCategoryStats.houseStats;
                                                    const compData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => ({
                                                        name: h,
                                                        Enrolled: hs[h].total,
                                                        Participated: hs[h].partQual,
                                                        Qualified: hs[h].qual,
                                                        Finished: hs[h].finishedQual,
                                                        DNF: hs[h].dnfQual
                                                    }));
                                                    return (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={compData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                                <YAxis dataKey="name" type="category" tick={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={80} />
                                                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }} />
                                                                <Bar dataKey="Enrolled" fill="#475569" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="Participated" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="Qualified" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="Finished" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="DNF" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Row 2: Two Donut Charts */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Donut Pie Chart - Student Status Distribution */}
                                            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                        <Icon name="donut_large" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Student Status Distribution</h4>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Qualifying Stage Overview</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-[320px]">
                                                    {(() => {
                                                        const hs = selectedCategoryStats.houseStats;
                                                        const vals = Object.values(hs) as any[];
                                                        const totalParticipated = vals.reduce((a: number, h: any) => a + h.partQual, 0);
                                                        const totalAbsent = vals.reduce((a: number, h: any) => a + h.absentQual, 0);
                                                        const totalMedExcused = vals.reduce((a: number, h: any) => a + h.medExcused + h.preQualMedExcused, 0);
                                                        const totalOnLeave = vals.reduce((a: number, h: any) => a + h.onLeaveQual + h.preQualOnLeave, 0);
                                                        const totalPending = selectedCategoryStats.stats.totalCount - totalParticipated - totalAbsent - totalMedExcused - totalOnLeave;
                                                        const statusData = [
                                                            { name: 'Participated', value: totalParticipated, color: '#22c55e' },
                                                            { name: 'Absent', value: totalAbsent, color: '#ef4444' },
                                                            { name: 'Med. Excused', value: totalMedExcused, color: '#94a3b8' },
                                                            { name: 'On Leave', value: totalOnLeave, color: '#3b82f6' },
                                                            { name: 'Pending', value: totalPending > 0 ? totalPending : 0, color: '#334155' }
                                                        ].filter(d => d.value > 0);
                                                        return (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" animationDuration={800} stroke="none" labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                                        {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                                    </Pie>
                                                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', fontSize: '13px' }} itemStyle={{ color: '#fff' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '15px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Donut Pie Chart - Enrollment by House */}
                                            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-9 rounded-lg bg-white/10 flex items-center justify-center text-white shadow-inner">
                                                        <Icon name="school" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Enrollment by House</h4>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Enrolled Distribution</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-[320px]">
                                                    {(() => {
                                                        const hs = selectedCategoryStats.houseStats;
                                                        const enrollData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik']
                                                            .map(h => ({ name: h, value: hs[h].total, color: HOUSE_COLORS[h.toLowerCase() as keyof typeof HOUSE_COLORS].hex }))
                                                            .filter(d => d.value > 0);
                                                        return (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie data={enrollData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" animationDuration={800} stroke="none" labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                                        {enrollData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                                    </Pie>
                                                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', fontSize: '13px' }} itemStyle={{ color: '#fff' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '15px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {categoryModalTab === 'finals' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Overall Category Results Summary */}
                                    <div className="glass-panel p-6 border border-white/10 bg-gradient-to-br from-amber-500/[0.03] to-transparent rounded-3xl mb-4">
                                        <div className="flex items-center gap-2 mb-5">
                                            <Icon name="emoji_events" size="18" className="text-amber-400" />
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Finals Stage Summary</span>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center"><Icon name="groups" size="14" className="text-white" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Eligible</span>
                                                </div>
                                                <span className="text-white text-2xl font-black">{selectedCategoryStats.stats.preFinalsOk}</span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-green-500/10 flex items-center justify-center"><Icon name="directions_run" size="14" className="text-green-400" /></div>
                                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-wide leading-tight">Participated</span>
                                                </div>
                                                <span className="text-white text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.partFinals, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-green-500/10 hover:border-green-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-green-500/10 flex items-center justify-center"><Icon name="verified" size="14" className="text-green-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Qualified</span>
                                                </div>
                                                <span className="text-green-400 text-2xl font-black">{selectedCategoryStats.stats.qualifiedCount}</span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><Icon name="check_circle" size="14" className="text-blue-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Finished</span>
                                                </div>
                                                <span className="text-blue-400 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.finishedFinals, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-red-500/10 hover:border-red-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-red-500/10 flex items-center justify-center"><Icon name="person_off" size="14" className="text-red-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Absentees</span>
                                                </div>
                                                <span className="text-red-400 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.absentFinals, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-slate-400/10 hover:border-slate-300/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center"><Icon name="medical_services" size="14" className="text-slate-300" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Med. Excused</span>
                                                </div>
                                                <span className="text-slate-300 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.medExcusedFinals + h.preFinalsMedExcused, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-white/5 flex items-center justify-center"><Icon name="history" size="14" className="text-slate-300" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">DNF</span>
                                                </div>
                                                <span className="text-slate-300 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.dnfFinals, 0)}
                                                </span>
                                            </div>
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-amber-500/10 hover:border-amber-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><Icon name="money_off" size="14" className="text-amber-400" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Stage Points</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-amber-400 text-2xl font-black">{selectedCategoryStats.stats.finalsPoints}</span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-none mt-1">
                                                        Q: {selectedCategoryStats.stats.qualifyingPoints} + F: {selectedCategoryStats.stats.finalsPoints}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(hName => {
                                            const h = selectedCategoryStats.houseStats[hName];
                                            const cfg = houseConfig(hName);
                                            return (
                                                <div key={hName} className="glass-panel p-6 border border-white/5 rounded-2xl relative overflow-hidden group">
                                                    <div className={`absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity`}>
                                                        <Icon name="emoji_events" size="64" />
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className={`size-10 rounded-xl flex items-center justify-center font-bold ${cfg.bg}/20 ${cfg.text} border ${cfg.border}/30`}>{hName[0]}</div>
                                                        <h4 className={`font-bold ${cfg.text} text-lg uppercase tracking-tight`}>{hName}</h4>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Progressed To Finals</span>
                                                            <span className="text-white font-black">{h.qual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Total Qualified</span>
                                                            <span className="text-white font-black">{h.qualFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Total Finishers</span>
                                                            <span className="text-white font-black">{h.finishedFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Finals Absentees</span>
                                                            <span className="text-slate-500 font-black">{h.absentFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Finals DNF</span>
                                                            <span className="text-slate-500 font-black">{h.dnfFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] italic border-t border-white/5 pt-3">
                                                            <span className="text-slate-500">Pre-F Med: <span className="text-slate-300 font-bold">{h.preFinalsMedExcused + h.medExcusedFinals}</span></span>
                                                            <span className="text-slate-500">Pre-F Leave: <span className="text-slate-300 font-bold">{h.preFinalsOnLeave}</span></span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
                                                            <div className="flex justify-between items-baseline mb-1">
                                                                <span className="text-slate-400 font-bold text-xs uppercase">Total Points</span>
                                                                <span className={`font-black text-2xl ${h.points > 0 ? 'text-amber-400' : h.points < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                                    {h.points > 0 ? `+${h.points}` : h.points}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-1 px-1">
                                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                                    <span>Qualifying Breakdown</span>
                                                                    <span className="text-slate-400">{h.qualifyingPoints} pts</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[9px] font-black text-amber-500/80 uppercase tracking-widest border-t border-white/5 pt-1">
                                                                    <span>Finals Breakdown</span>
                                                                    <span className="text-amber-400">{h.finalsPoints} pts</span>
                                                                </div>
                                                                <p className="text-[8px] text-slate-600 font-medium italic text-right leading-tight">
                                                                    (Podium + {h.finishedFinals} Fin. - {h.absentFinals} Abs. - {h.dnfFinals} DNF)
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedCategoryStats.bestTiming && (
                                        <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-full bg-amber-500 flex items-center justify-center text-black">
                                                    <Icon name="military_tech" size="32" />
                                                </div>
                                                <div>
                                                    <h4 className="text-amber-400 font-bold uppercase text-xs tracking-widest">Category Champion</h4>
                                                    <p className="text-white text-xl font-black">{selectedCategoryStats.bestTiming.name} <span className="text-slate-500 font-normal">({selectedCategoryStats.bestTiming.house})</span></p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Winning Timing</h4>
                                                <p className="text-amber-400 text-3xl font-mono font-black">{selectedCategoryStats.bestTiming.timing}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Finals Charts Section */}
                                    <div className="space-y-6">
                                        {/* Row 1: Large Bar Chart */}
                                        <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-inner">
                                                    <Icon name="stacked_bar_chart" size="20" />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-base leading-tight">Finals Status Breakdown</h4>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Finishers vs Non-participants per House</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-[350px]">
                                                {(() => {
                                                    const hs = selectedCategoryStats.houseStats;
                                                    const finalsData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => ({
                                                        name: h,
                                                        Finishers: hs[h].partFinals,
                                                        Absent: hs[h].absentFinals,
                                                        'Med. Excused': hs[h].medExcusedFinals + hs[h].preFinalsMedExcused,
                                                        'On Leave': hs[h].onLeaveFinals + hs[h].preFinalsOnLeave
                                                    }));
                                                    return (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={finalsData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                                <YAxis dataKey="name" type="category" tick={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={80} />
                                                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }} />
                                                                <Bar dataKey="Finishers" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} barSize={25} animationDuration={800} />
                                                                <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} barSize={25} animationDuration={800} />
                                                                <Bar dataKey="Med. Excused" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} barSize={25} animationDuration={800} />
                                                                <Bar dataKey="On Leave" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={25} animationDuration={800} />
                                                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Row 2: Two Donut Charts */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Donut Pie Chart - Points Distribution by House */}
                                            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-inner">
                                                        <Icon name="donut_large" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Points Distribution</h4>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">House-wise contribution to total points</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-[300px]">
                                                    {(() => {
                                                        const hs = selectedCategoryStats.houseStats;
                                                        const pointsData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik']
                                                            .map(h => ({ name: h, value: Math.max(0, hs[h].points), color: HOUSE_COLORS[h.toLowerCase() as keyof typeof HOUSE_COLORS].hex }))
                                                            .filter(d => d.value > 0);
                                                        if (pointsData.length === 0) return <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">No points data yet</div>;
                                                        return (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie data={pointsData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" animationDuration={800} stroke="none" labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                                        {pointsData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                                    </Pie>
                                                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', fontSize: '13px' }} itemStyle={{ color: '#fff' }} formatter={(value: number, name: string) => [`${value} pts`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '15px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Donut Pie Chart - Enrollment by House */}
                                            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shadow-inner">
                                                        <Icon name="check_circle" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Moved to Finals</h4>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Qualified Student Distribution</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-[320px]">
                                                    {(() => {
                                                        const hs = selectedCategoryStats.houseStats;
                                                        const qualData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik']
                                                            .map(h => ({ name: h, value: hs[h].qual, color: HOUSE_COLORS[h.toLowerCase() as keyof typeof HOUSE_COLORS].hex }))
                                                            .filter(d => d.value > 0);
                                                        if (qualData.length === 0) return <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">No qualifications yet</div>;
                                                        return (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie data={qualData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" animationDuration={800} stroke="none" labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                                        {qualData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                                    </Pie>
                                                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', fontSize: '13px' }} itemStyle={{ color: '#fff' }} formatter={(value: number, name: string) => [`${value} qualified students`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '15px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {categoryModalTab === 'list' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {(() => {
                                        const qualifyingPositions = getCategoryStagePositions(selectedCategoryStats.name, 'qualifying');
                                        const finalsPositions = getCategoryStagePositions(selectedCategoryStats.name, 'finals');

                                        return (
                                    <div className="glass-panel overflow-hidden border border-white/5 bg-white/[0.01] rounded-2xl shadow-xl">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="bg-white/5 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">SN</th>
                                                    <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'id' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('id'); }}>
                                                        <div className="flex items-center gap-1">Computer No {listSortField === 'id' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                    </th>
                                                    <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'name' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('name'); }}>
                                                        <div className="flex items-center gap-1">Athlete Name {listSortField === 'name' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                    </th>
                                                    <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'house' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('house'); }}>
                                                        <div className="flex items-center gap-1">House {listSortField === 'house' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                    </th>
                                                    <th className="px-6 py-5 text-center">Qualifying</th>
                                                    <th className="px-6 py-5 text-center">Finals</th>
                                                    <th className="px-6 py-5 text-right">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {mockStudents.filter(s => s.category === selectedCategoryStats.name)
                                                    .sort((a, b) => {
                                                        const factor = listSortOrder === 'asc' ? 1 : -1;
                                                        if (listSortField === 'house') return factor * a.house.localeCompare(b.house);
                                                        if (listSortField === 'name') return factor * a.name.localeCompare(b.name);
                                                        return factor * a.id.localeCompare(b.id);
                                                    })
                                                    .map((stu, idx) => {
                                                        const r = results.find(res => res.studentId === stu.id) || {
                                                            studentId: stu.id,
                                                            preQualifyingType: 'pending',
                                                            preFinalsType: 'pending',
                                                            qualifyingType: 'pending',
                                                            finalsType: 'pending'
                                                        };
                                                        const liveQualifyingPosition = qualifyingPositions.get(stu.id) ?? r.qualifyingPosition;
                                                        const liveFinalsPosition = finalsPositions.get(stu.id) ?? r.finalsPosition;
                                                        const hInfo = houseConfig(stu.house);
                                                        return (
                                                            <tr key={stu.id} className="hover:bg-white/[0.02] transition-colors group">
                                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{idx + 1}</td>
                                                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{stu.id}</td>
                                                                <td className="px-6 py-4 font-bold text-white text-base">{stu.name}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`inline-flex items-center gap-1.5 font-black ${hInfo.text} text-[10px] uppercase border ${hInfo.border}/20 px-2 py-0.5 rounded bg-white/5`}>
                                                                        {stu.house}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${r.qualifyingType === 'qualified' ? 'text-primary' : 'text-slate-500'}`}>
                                                                            {r.qualifyingType.replace('_', ' ')}
                                                                        </span>
                                                                        {r.preQualifyingType !== 'participating' && r.preQualifyingType !== 'pending' && (
                                                                            <span className="text-[8px] font-black text-amber-500/80 uppercase">{r.preQualifyingType.replace('_', ' ')}</span>
                                                                        )}
                                                                        {r.qualifyingTiming && <span className="text-[10px] font-mono text-slate-400">Time: {r.qualifyingTiming}</span>}
                                                                        {liveQualifyingPosition && <span className="text-[9px] font-black text-slate-500">Rank: #{liveQualifyingPosition}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${r.finalsType === 'qualified_pos' || r.finalsType === 'finisher' ? 'text-amber-400' : 'text-slate-500'}`}>
                                                                            {r.finalsType.replace('_', ' ')}
                                                                        </span>
                                                                        {r.preFinalsType !== 'participating' && r.preFinalsType !== 'pending' && (
                                                                            <span className="text-[8px] font-black text-amber-500/80 uppercase">{r.preFinalsType.replace('_', ' ')}</span>
                                                                        )}
                                                                        {r.finalsTiming && <span className="text-[10px] font-mono text-slate-400">Time: {r.finalsTiming}</span>}
                                                                        {liveFinalsPosition && <span className="text-[9px] font-black text-slate-500">Rank: #{liveFinalsPosition}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    {liveFinalsPosition && <span className="font-black text-amber-400 text-lg mr-2 italic">#{liveFinalsPosition}</span>}
                                                                    {r.finalsTiming && <span className="text-slate-400 font-mono text-xs">[{r.finalsTiming}]</span>}
                                                                    {!liveFinalsPosition && !r.finalsTiming && <span className="text-slate-600">—</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal for Detailed Standings Stats */}
            {selectedStandingsStats && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedStandingsStats(null)}></div>
                    <div className="relative w-full max-w-6xl bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-gradient-to-r from-primary/10 to-transparent">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">HODSON RUN 2026</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                    <span className="text-slate-400 text-xs">Department Metrics</span>
                                </div>
                                <h3 className="text-white text-3xl font-black">{selectedStandingsStats.title} Stats</h3>
                            </div>
                            <button onClick={() => setSelectedStandingsStats(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2 hover:bg-white/10">
                                <Icon name="close" size="24" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-8">
                            {/* Qualification Rate Banner */}
                            <div className="glass-panel p-6 border border-white/10 bg-gradient-to-br from-primary/[0.03] to-transparent rounded-3xl mb-8">
                                <div className="flex items-center gap-2 mb-5">
                                    <Icon name="insights" size="18" className="text-primary" />
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Department Overview</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20 col-span-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-primary/20 flex items-center justify-center"><Icon name="percent" size="14" className="text-primary" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Qual. Rate</span>
                                        </div>
                                        <span className="text-primary text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.qualificationRate}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-green-500/10 flex items-center justify-center"><Icon name="verified" size="14" className="text-green-400" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Qualified</span>
                                        </div>
                                        <span className="text-green-400 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.qualified}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-green-500/10 flex items-center justify-center"><Icon name="directions_run" size="14" className="text-green-400" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight block max-w-[72px]">
                                                Participants
                                            </span>
                                        </div>
                                        <span className="text-white text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.participants}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center"><Icon name="groups" size="14" className="text-white" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Enrolled</span>
                                        </div>
                                        <span className="text-white text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.total}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-red-500/10 hover:border-red-500/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-red-500/10 flex items-center justify-center"><Icon name="person_off" size="14" className="text-red-400" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Absent</span>
                                        </div>
                                        <span className="text-red-400 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.absent}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center"><Icon name="medical_services" size="14" className="text-slate-300" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Medical</span>
                                        </div>
                                        <span className="text-slate-300 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.medExcused}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><Icon name="check_circle" size="14" className="text-blue-400" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Finished</span>
                                        </div>
                                        <span className="text-blue-400 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.finishedCount}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-white/5 flex items-center justify-center"><Icon name="history" size="14" className="text-slate-300" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">DNF</span>
                                        </div>
                                        <span className="text-slate-300 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.dnfCount}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><Icon name="flight_takeoff" size="14" className="text-blue-400" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">On Leave</span>
                                        </div>
                                        <span className="text-blue-400 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.onLeave}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Breakdown Stacked Bar Chart */}
                            <div className="mb-12 glass-panel p-6 rounded-2xl border border-white/5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Icon name="stacked_bar_chart" size="20" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg leading-tight">Category Breakdown</h4>
                                            <p className="text-xs text-slate-400">Points distribution clustered by category</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => (
                                            <div key={h} className="flex items-center gap-1.5">
                                                <div className="size-3 rounded-full" style={{ backgroundColor: HOUSE_COLORS[h.toLowerCase() as keyof typeof HOUSE_COLORS].hex }}></div>
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300">{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={selectedStandingsStats.breakdown}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#fff', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                                itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}
                                                labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}
                                            />
                                            <Bar dataKey="Vindhya" stackId="a" fill={HOUSE_COLORS.vindhya.hex} radius={[0, 0, 0, 0]} animationDuration={1000} />
                                            <Bar dataKey="Himalaya" stackId="a" fill={HOUSE_COLORS.himalaya.hex} radius={[0, 0, 0, 0]} animationDuration={1000} />
                                            <Bar dataKey="Nilgiri" stackId="a" fill={HOUSE_COLORS.nilgiri.hex} radius={[0, 0, 0, 0]} animationDuration={1000} />
                                            <Bar dataKey="Siwalik" stackId="a" fill={HOUSE_COLORS.siwalik.hex} radius={[4, 4, 0, 0]} animationDuration={1000} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Points Calculation Guide */}
                            <div className="mb-8 p-6 glass-panel border border-amber-500/10 bg-amber-500/5 rounded-2xl">
                                <div className="flex items-center gap-2 mb-5">
                                    <Icon name="info" size="18" className="text-amber-400" />
                                    <span className="text-[10px] text-amber-400/80 font-black uppercase tracking-widest">Points Calculation Guide</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h5 className="text-white text-[11px] font-black mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                            1. Qualifying Stage
                                        </h5>
                                        <ul className="text-[11px] text-slate-400 space-y-2.5">
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5">
                                                <span>Finisher (Not Qualified)</span>
                                                <span className="text-green-400 font-bold">+1 pt</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5">
                                                <span>Absent / DNF</span>
                                                <span className="text-red-400 font-bold">-1 pt</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5 opacity-60">
                                                <span>Qualified for Finals</span>
                                                <span className="text-slate-500 italic">0 pts</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h5 className="text-white text-[11px] font-black mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <div className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                            2. Finals Stage
                                        </h5>
                                        <ul className="text-[11px] text-slate-400 space-y-2.5">
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5">
                                                <span title="Base 5 + (11 - position) if pos 1-10">Podium / Top 10</span>
                                                <span className="text-amber-400 font-bold">5 Base + Bonus</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5">
                                                <span>Finisher</span>
                                                <span className="text-green-400 font-bold">+1 pt</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5">
                                                <span>Absent / DNF</span>
                                                <span className="text-red-400 font-bold">-1 pt</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Category-wise Points Table */}
                            <div className="mb-12 glass-panel overflow-hidden border border-white/10 rounded-3xl bg-black/20 shadow-2xl">
                                <div className="p-5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                            <Icon name="summarize" size="18" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-200 font-black uppercase tracking-[3px] block">Points Breakdown</span>
                                            <span className="text-[9px] text-slate-500 font-bold uppercase italic">Category-wise Point Contributions per House</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                                        <thead>
                                            <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <th className="px-6 py-5 border-r border-white/5">Age Category</th>
                                                {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => (
                                                    <th key={h} className="px-6 py-5 text-center border-r border-white/5 last:border-0">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {Object.values(selectedStandingsStats.categoryPointsMap).map((cat: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                                                    <td className="px-6 py-5 font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors border-r border-white/5">{cat.name}</td>
                                                    <td className="px-6 py-5 text-center font-mono text-slate-300 border-r border-white/5 group-hover:bg-white/[0.01]">{cat.Vindhya}</td>
                                                    <td className="px-6 py-5 text-center font-mono text-slate-300 border-r border-white/5 group-hover:bg-white/[0.01]">{cat.Himalaya}</td>
                                                    <td className="px-6 py-5 text-center font-mono text-slate-300 border-r border-white/5 group-hover:bg-white/[0.01]">{cat.Nilgiri}</td>
                                                    <td className="px-6 py-5 text-center font-mono text-slate-300 group-hover:bg-white/[0.01]">{cat.Siwalik}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-primary/10 font-bold text-white uppercase tracking-widest text-[10px]">
                                            <tr>
                                                <td className="px-6 py-5 border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">Total {selectedStandingsStats.title === "Overall House Standings" ? "Cumulative" : "Department"} Points</td>
                                                <td className="px-6 py-5 text-center text-primary font-black text-sm border-r border-white/10 bg-primary/5">{selectedStandingsStats.houseStats['Vindhya'].points}</td>
                                                <td className="px-6 py-5 text-center text-primary font-black text-sm border-r border-white/10 bg-primary/5">{selectedStandingsStats.houseStats['Himalaya'].points}</td>
                                                <td className="px-6 py-5 text-center text-primary font-black text-sm border-r border-white/10 bg-primary/5">{selectedStandingsStats.houseStats['Nilgiri'].points}</td>
                                                <td className="px-6 py-5 text-center text-primary font-black text-sm bg-primary/5">{selectedStandingsStats.houseStats['Siwalik'].points}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Department Status Charts */}
                            <div className="space-y-6 mb-8">
                                {/* Row 1: Large Bar Chart - House Performance Comparison */}
                                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Icon name="bar_chart" size="20" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-base leading-tight">House Performance Comparison</h4>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">All metrics by house</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-[350px]">
                                        {(() => {
                                            const hs = selectedStandingsStats.houseStats;
                                            const compData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => ({
                                                name: h,
                                                Participated: hs[h].part,
                                                Qualified: hs[h].qual,
                                                Absent: hs[h].absent,
                                                'Med. Excused': hs[h].medExcused,
                                                'On Leave': hs[h].onLeave
                                            }));
                                            return (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={compData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                        <YAxis dataKey="name" type="category" tick={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={80} />
                                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }} />
                                                        <Bar dataKey="Participated" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Qualified" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Absent" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Med. Excused" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="On Leave" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Row 2: Two Donut Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Donut Pie - Overall Student Status */}
                                    <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                <Icon name="donut_large" size="20" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-base leading-tight">Overall Student Status</h4>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Department-wide Distribution</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-[300px]">
                                            {(() => {
                                                const s = selectedStandingsStats.stats;
                                                const pending = s.total - s.participants - s.absent - s.medExcused - s.onLeave;
                                                const pieData = [
                                                    { name: 'Participated', value: s.participants, color: '#22c55e' },
                                                    { name: 'Absent', value: s.absent, color: '#ef4444' },
                                                    { name: 'Med. Excused', value: s.medExcused, color: '#94a3b8' },
                                                    { name: 'On Leave', value: s.onLeave, color: '#3b82f6' },
                                                    { name: 'Pending', value: pending > 0 ? pending : 0, color: '#334155' }
                                                ].filter(d => d.value > 0);
                                                return (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" animationDuration={800} stroke="none">
                                                                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                            </Pie>
                                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', fontSize: '13px' }} itemStyle={{ color: '#fff' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '4px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Donut Pie - Enrollment by House */}
                                    <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="size-9 rounded-lg bg-white/10 flex items-center justify-center text-white shadow-inner">
                                                <Icon name="school" size="20" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-base leading-tight">Enrollment by House</h4>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Enrolled Distribution</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-[320px]">
                                            {(() => {
                                                const hs = selectedStandingsStats.houseStats;
                                                const enrollData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik']
                                                    .map(h => ({ name: h, value: hs[h].total, color: HOUSE_COLORS[h.toLowerCase() as keyof typeof HOUSE_COLORS].hex }))
                                                    .filter(d => d.value > 0);
                                                return (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={enrollData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" animationDuration={800} stroke="none" labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                                {enrollData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                            </Pie>
                                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', fontSize: '13px' }} itemStyle={{ color: '#fff' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '15px' }} formatter={(value: string) => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</span>} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal for Passcode */}
            {showPasscodeModal && createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setShowPasscodeModal(false); setPasscodeInput(''); setPasscodeError(false); }}></div>
                    <div className="relative w-full max-w-sm bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
                                <Icon name="lock" size="24" />
                            </div>
                            <h2 className="text-xl font-black text-white mb-2">Enter Passcode</h2>
                            <p className="text-sm text-slate-400 mb-6">Please enter the 4-digit passcode to access the results editor.</p>
                            
                            <form onSubmit={handlePasscodeSubmit} className="w-full">
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={passcodeInput}
                                    onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(false); }}
                                    className={`w-full text-center text-4xl tracking-[0.5em] font-mono bg-white/5 border ${passcodeError ? 'border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl p-4 text-white outline-none transition-colors mb-4`}
                                    placeholder="••••"
                                    autoFocus
                                />
                                {passcodeError && (
                                    <p className="text-red-400 text-xs font-bold mb-4 animate-in slide-in-from-top-1">Incorrect passcode.</p>
                                )}
                                <div className="flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => { setShowPasscodeModal(false); setPasscodeInput(''); setPasscodeError(false); }}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/20"
                                    >
                                        Unlock
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal for "Add Results" */}
            {showModal && !editCategory && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
                    <div className="relative w-full max-w-5xl h-[90vh] bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Icon name="category" /> Select Category to Edit Results
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2 hover:bg-white/10">
                                <Icon name="close" size="24" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/5">
                            {['BD', 'GD', 'PD'].map(dept => {
                                const deptName = dept === 'BD' ? "Boys' Department" : dept === 'GD' ? "Girls' Department" : "Prep Department";
                                const deptColor = dept === 'BD' ? "from-blue-500/10" : dept === 'GD' ? "from-pink-500/10" : "from-amber-500/10";
                                const deptIcon = dept === 'BD' ? "male" : dept === 'GD' ? "female" : "child_care";

                                const deptCats = CATEGORIES_LIST.filter(c => c.startsWith(dept));
                                if (deptCats.length === 0) return null;

                                return (
                                    <div key={dept} className="mb-10 last:mb-0">
                                        <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl bg-gradient-to-r ${deptColor} to-transparent border-l-4 border-white/20`}>
                                            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                                                <Icon name={deptIcon} size="20" className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight">{deptName}</h3>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{deptCats.length} Categories Enrolled</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                            {deptCats.map(cat => (
                                                <div key={cat} className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-primary/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between shadow-lg hover:shadow-primary/5">
                                                    <div className="mb-4">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h3 className="text-base font-black text-white uppercase tracking-wide group-hover:text-primary transition-colors">{cat}</h3>
                                                            <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">ID: {cat.replace(' ', '_')}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 font-medium">Manage participants, timings and rankings</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setEditCategory(cat)}
                                                        className="w-full py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest border border-primary/20 shadow-sm"
                                                    >
                                                        Manage Results
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal for Editing Specific Category */}
            {editCategory && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditCategory(null)}></div>
                    <div className="relative w-full max-w-7xl h-[90vh] bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-primary/10">
                            <div>
                                <button onClick={() => { setEditCategory(null); setFilterHouse('All'); }} className="text-slate-400 hover:text-white text-xs mb-2 flex items-center gap-1 uppercase tracking-wider font-bold">
                                    <Icon name="arrow_back" size="14" /> Back to Categories
                                </button>
                                <div className="flex items-center gap-6">
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Record Results: {editCategory}</h2>
                                    {skipQualifyingCategories.includes(editCategory) && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                                            <Icon name="fast_forward" size="12" />
                                            Qualifying Skipped
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Icon name="filter_list" size="16" className="text-slate-400" />
                                        <select
                                            value={filterHouse}
                                            onChange={(e) => setFilterHouse(e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold cursor-pointer transition-colors hover:bg-white/5"
                                        >
                                            <option value="All">All Houses</option>
                                            <option value="Vindhya">Vindhya</option>
                                            <option value="Himalaya">Himalaya</option>
                                            <option value="Nilgiri">Nilgiri</option>
                                            <option value="Siwalik">Siwalik</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-300 mt-2 flex items-center gap-2">
                                    <Icon name="info" size="12" className="text-primary" />
                                    <b>Only Qualified</b> Move To Finals | <b>Qualifying:</b> Finished +1, Absent/DNF -1 | <b>Finals (Q+Pos):</b> 5 + (11-pos up to 10th) | <b>Finals Finisher:</b> +1 | <b>Finals Absent/DNF:</b> -1
                                </p>
                                {skipQualifyingCategories.includes(editCategory) && (
                                    <p className="text-xs text-amber-300 mt-2 flex items-center gap-2">
                                        <Icon name="warning" size="12" className="text-amber-400" />
                                        This category is in skip-qualifying mode, so the full enrolled list is available in finals.
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-3 mt-6">
                                    <button onClick={() => setActivePhase('pre_qualifying')} className={`px-4 py-3 font-bold uppercase tracking-wider text-xs rounded-t-lg transition-all ${activePhase === 'pre_qualifying' ? 'bg-black/20 text-white border-b-2 border-slate-400' : 'text-slate-500 hover:text-white bg-white/5'}`}>0. Pre-Qualifying List</button>
                                    <button onClick={() => setActivePhase('qualifying')} className={`px-4 py-3 font-bold uppercase tracking-wider text-xs rounded-t-lg transition-all ${activePhase === 'qualifying' ? 'bg-black/20 text-white border-b-2 border-primary' : 'text-slate-500 hover:text-white bg-white/5'}`}>1. Qualifying Stage</button>
                                    <button onClick={() => setActivePhase('pre_finals')} className={`px-4 py-3 font-bold uppercase tracking-wider text-xs rounded-t-lg transition-all ${activePhase === 'pre_finals' ? 'bg-black/20 text-white border-b-2 border-blue-400' : 'text-slate-500 hover:text-white bg-white/5'}`}>1.5 Pre-Finals List</button>
                                    <button onClick={() => setActivePhase('finals')} className={`px-4 py-3 font-bold uppercase tracking-wider text-xs rounded-t-lg transition-all ${activePhase === 'finals' ? 'bg-black/20 text-white border-b-2 border-amber-400' : 'text-slate-500 hover:text-white bg-white/5'}`}>2. Finals Stage</button>
                                </div>

                                {(() => {
                                    const catData = categoriesData.find(c => c.name === editCategory);
                                    if (!catData) return null;
                                    const isPreQual = activePhase === 'pre_qualifying';
                                    const isPreFinals = activePhase === 'pre_finals';

                                    if (isPreQual || isPreFinals) {
                                        return (
                                            <div className="flex items-center gap-6 mt-4 py-2.5 px-4 bg-white/[0.03] border border-white/5 rounded-xl animate-in slide-in-from-top-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon name="groups" size="14" className="text-slate-500" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                        {isPreQual ? "Pre-Qualify Summary" : "Pre-Finals Summary"}:
                                                    </span>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Medically Excused:</span>
                                                        <span className="text-sm font-black text-amber-500">{isPreQual ? catData.stats.preQualMedExcused : catData.stats.preFinalsMedExcused}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">On Leave:</span>
                                                        <span className="text-sm font-black text-blue-400">{isPreQual ? catData.stats.preQualOnLeave : catData.stats.preFinalsOnLeave}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                    {!skipQualifyingCategories.includes(editCategory) ? (
                                        <button
                                            onClick={() => handleSkipQualifyingPhase(editCategory)}
                                            className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 border text-xs font-bold uppercase tracking-wider hover:bg-amber-500/20 bg-amber-500/10 border-amber-500/20 text-amber-300"
                                        >
                                            <Icon name="fast_forward" size="16" /> Skip Qualifying Phase
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleRestoreQualifyingPhase(editCategory)}
                                            className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 border text-xs font-bold uppercase tracking-wider hover:bg-blue-500/20 bg-blue-500/10 border-blue-500/20 text-blue-300"
                                        >
                                            <Icon name="restore" size="16" /> Restore Qualifying Phase
                                        </button>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Icon name="download" size="16" className="text-slate-400" />
                                        <select
                                            value={downloadFormat}
                                            onChange={(e) => setDownloadFormat(e.target.value as any)}
                                            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold cursor-pointer transition-colors hover:bg-white/5"
                                        >
                                            <option value="xlsx">.xlsx</option>
                                            <option value="docx">.docx</option>
                                        </select>
                                    </div>

                                    <button
                                        disabled={isDownloading}
                                        onClick={() => editCategory && downloadCategoryStageList(editCategory, activePhase, downloadFormat)}
                                        className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 border text-xs font-bold uppercase tracking-wider ${isDownloading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'} bg-white/5 border-white/10 text-white`}
                                    >
                                        <Icon name="download" size="16" /> Download {activePhase.replace('_', ' ')} List
                                    </button>

                                    {(activePhase === 'qualifying' || activePhase === 'finals') && (
                                        <button
                                            onClick={() => {
                                                // Trigger auto-ranking calculation by simulating save-style logic but only in memory for display
                                                // Actually, let's just create a temporary ranking function and update results state
                                                const cat = editCategory;
                                                if (!cat) return;
                                                const studentsInCat = mockStudents.filter(s => s.category === cat);
                                                const qualResults = results.filter(r => {
                                                    const stu = studentsInCat.find(s => s.id === r.studentId);
                                                    const timingField = activePhase === 'qualifying' ? r.qualifyingTiming : r.finalsTiming;
                                                    const typeField = activePhase === 'qualifying' ? r.qualifyingType : r.finalsType;
                                                    const targetType = activePhase === 'qualifying' ? 'qualified' : 'qualified_pos';
                                                    return stu && typeField === targetType && timingField;
                                                });

                                                if (qualResults.length > 0) {
                                                    const sorted = [...qualResults].sort((a, b) => {
                                                        const pS = (t: string) => { const [m, s] = t.split(':').map(v => parseInt(v) || 0); return m * 60 + s; };
                                                        const tA = activePhase === 'qualifying' ? a.qualifyingTiming! : a.finalsTiming!;
                                                        const tB = activePhase === 'qualifying' ? b.qualifyingTiming! : b.finalsTiming!;
                                                        return pS(tA) - pS(tB);
                                                    });

                                                    const newResults = results.map(r => {
                                                        const sIdx = sorted.findIndex(sr => sr.studentId === r.studentId);
                                                        if (sIdx > -1) {
                                                            if (activePhase === 'qualifying') return { ...r, qualifyingPosition: sIdx + 1 };
                                                            return { ...r, finalsPosition: sIdx + 1 };
                                                        }
                                                        return r;
                                                    });
                                                    setResults(newResults);
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 border text-xs font-bold uppercase tracking-wider hover:bg-primary/20 bg-primary/10 border-primary/20 text-primary"
                                        >
                                            <Icon name="auto_awesome" size="16" /> Auto-Rank by Time
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3 self-start">
                                <button onClick={() => { setEditCategory(null); setFilterHouse('All'); }} className="text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2 hover:bg-white/10">
                                    <Icon name="close" size="24" />
                                </button>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleSaveResult(editCategory)}
                                        className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-black rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95 border-b-2 border-green-700"
                                    >
                                        <Icon name="cloud_upload" size="18" /> Save Changes
                                    </button>
                                    <button
                                        onClick={() => handleClearCategoryResults(editCategory)}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black rounded-lg transition-all flex items-center justify-center gap-2 border border-red-500/20 text-[10px] uppercase tracking-wider active:scale-95"
                                    >
                                        <Icon name="delete_sweep" size="14" /> Clear All
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-[300px]">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg text-[10px] uppercase font-black text-slate-500 tracking-widest bg-white/5">SN</th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'id' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('id'); }}>
                                            <div className="flex items-center gap-1">Comp No {listSortField === 'id' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'name' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('name'); }}>
                                            <div className="flex items-center gap-1">Player Name {listSortField === 'name' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'house' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('house'); }}>
                                            <div className="flex items-center gap-1">House {listSortField === 'house' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'status' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('status'); }}>
                                            <div className="flex items-center gap-1">Status {listSortField === 'status' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                        </th>
                                        <th className="px-4 py-3">Position</th>
                                        <th className="px-4 py-3 rounded-r-lg">Timing</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {mockStudents
                                        .filter(s => s.category === editCategory)
                                        .filter(s => filterHouse === 'All' || s.house === filterHouse)
                                        .sort((a, b) => {
                                            const factor = listSortOrder === 'asc' ? 1 : -1;
                                            if (listSortField === 'house') return factor * a.house.localeCompare(b.house);
                                            if (listSortField === 'name') return factor * a.name.localeCompare(b.name);
                                            if (listSortField === 'status') {
                                                const resA = results.find(r => r.studentId === a.id);
                                                const resB = results.find(r => r.studentId === b.id);
                                                const statusA = (activePhase === 'pre_qualifying' ? resA?.preQualifyingType : activePhase === 'pre_finals' ? resA?.preFinalsType : activePhase === 'qualifying' ? resA?.qualifyingType : resA?.finalsType) || 'pending';
                                                const statusB = (activePhase === 'pre_qualifying' ? resB?.preQualifyingType : activePhase === 'pre_finals' ? resB?.preFinalsType : activePhase === 'qualifying' ? resB?.qualifyingType : resB?.finalsType) || 'pending';
                                                return factor * statusA.localeCompare(statusB);
                                            }
                                            return factor * a.id.localeCompare(b.id);
                                        })
                                        .filter(stu => {
                                            const res = results.find(r => r.studentId === stu.id) || { studentId: stu.id, qualifyingType: 'pending' as const, finalsType: 'pending' as const };
                                            const preQualOk = res.preQualifyingType === 'participating';
                                            const skipsQualifying = !!editCategory && skipQualifyingCategories.includes(editCategory);
                                            const qualifiesForPreFinals = skipsQualifying || res.qualifyingType === 'qualified';
                                            const preFinalsOk = skipsQualifying || res.preFinalsType === 'participating';

                                            if (activePhase === 'qualifying' && !preQualOk) return false;
                                            if (activePhase === 'pre_finals' && !qualifiesForPreFinals) return false;
                                            if (activePhase === 'finals' && (!qualifiesForPreFinals || !preFinalsOk)) return false;
                                            return true;
                                        })
                                        .map((stu, index) => {
                                            const res = results.find(r => r.studentId === stu.id) || { studentId: stu.id, qualifyingType: 'pending' as const, finalsType: 'pending' as const };
                                            const cfg = houseConfig(stu.house);

                                            return (
                                                <tr key={stu.id} className="hover:bg-white/[0.02]">
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{index + 1}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{stu.id}</td>
                                                    <td className="px-4 py-3 font-bold text-white">{stu.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center justify-center gap-1 uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg}/20 ${cfg.text} border ${cfg.border}/30`}>
                                                            {stu.house}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {activePhase === 'pre_qualifying' ? (
                                                            <select
                                                                value={res.preQualifyingType || 'pending'}
                                                                onChange={(e) => handleResultChange(stu.id, 'qualifying', res.qualifyingType, (res.qualifyingPosition || '').toString(), res.qualifyingTiming || '', e.target.value, res.preFinalsType || 'pending')}
                                                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-400 w-full max-w-[200px]"
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="participating">Participating</option>
                                                                <option value="on_leave">On Leave</option>
                                                                <option value="medically_excused">Medically Excused</option>
                                                            </select>
                                                        ) : activePhase === 'pre_finals' ? (
                                                            <select
                                                                value={res.preFinalsType || 'pending'}
                                                                onChange={(e) => handleResultChange(stu.id, 'qualifying', res.qualifyingType, (res.qualifyingPosition || '').toString(), res.qualifyingTiming || '', res.preQualifyingType || 'pending', e.target.value)}
                                                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400 w-full max-w-[200px]"
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="participating">Participating</option>
                                                                <option value="on_leave">On Leave</option>
                                                                <option value="medically_excused">Medically Excused</option>
                                                            </select>
                                                        ) : activePhase === 'qualifying' ? (
                                                            <select
                                                                value={res.qualifyingType}
                                                                onChange={(e) => handleResultChange(stu.id, 'qualifying', e.target.value, (res.qualifyingPosition || '').toString(), res.qualifyingTiming || '', res.preQualifyingType || 'pending', res.preFinalsType || 'pending')}
                                                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary w-full max-w-[200px]"
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="qualified">Qualified</option>
                                                                <option value="finished">Finished</option>
                                                                <option value="dnf">DNF</option>
                                                                <option value="absent">Absent</option>
                                                                <option value="medically_excused">Medically Excused</option>
                                                            </select>
                                                        ) : (
                                                            <select
                                                                value={res.finalsType}
                                                                onChange={(e) => handleResultChange(stu.id, 'finals', e.target.value, (res.finalsPosition || '').toString(), res.finalsTiming || '', res.preQualifyingType || 'pending', res.preFinalsType || 'pending')}
                                                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 w-full max-w-[150px]"
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="qualified_pos">Qualified + Position</option>
                                                                <option value="finisher">Finisher</option>
                                                                <option value="dnf">DNF</option>
                                                                <option value="absent">Absent</option>
                                                                <option value="medically_excused">Medically Excused</option>
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {(activePhase === 'finals' && (res.finalsType === 'qualified_pos')) || (activePhase === 'qualifying' && res.qualifyingType === 'qualified') ? (
                                                            <div className="flex flex-col">
                                                                <span className={`${activePhase === 'qualifying' ? 'text-primary' : 'text-amber-400'} font-bold text-[10px] uppercase tracking-wider`}>
                                                                    {res[activePhase === 'qualifying' ? 'qualifyingPosition' : 'finalsPosition'] ? 'Ranked' : 'To be ranked'}
                                                                </span>
                                                                {res[activePhase === 'qualifying' ? 'qualifyingPosition' : 'finalsPosition'] && (
                                                                    <span className="text-white font-black text-xs">#{res[activePhase === 'qualifying' ? 'qualifyingPosition' : 'finalsPosition']}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500 text-xs italic">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {(() => {
                                                            const isQualTiming = activePhase === 'qualifying' && res.qualifyingType === 'qualified';
                                                            const isFinalsTiming = activePhase === 'finals' && (res.finalsType === 'qualified_pos' || res.finalsType === 'finisher');
                                                            const show = isQualTiming || isFinalsTiming;
                                                            if (!show) return <span className="text-slate-500 text-xs italic">—</span>;

                                                            const currentTiming = isQualTiming ? res.qualifyingTiming : res.finalsTiming;
                                                            const tp = parseTiming(currentTiming);
                                                            const border = isQualTiming ? 'focus:border-primary' : 'focus:border-amber-400';
                                                            const placeholder = isQualTiming ? 'MM:SS (req for Qualified)' : 'MM:SS';

                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        placeholder="MM"
                                                                        value={tp.mm}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                                                            const t = buildTiming(val, tp.ss);
                                                                            handleResultChange(
                                                                                stu.id,
                                                                                isQualTiming ? 'qualifying' : 'finals',
                                                                                isQualTiming ? res.qualifyingType : res.finalsType,
                                                                                (isQualTiming ? (res.qualifyingPosition || '') : (res.finalsPosition || '')).toString(),
                                                                                t || '',
                                                                                res.preQualifyingType || 'pending',
                                                                                res.preFinalsType || 'pending'
                                                                            );
                                                                        }}
                                                                        className={`bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none ${border} w-16 font-mono`}
                                                                    />
                                                                    <span className="text-slate-500 font-black">:</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        placeholder="SS"
                                                                        value={tp.ss}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                                                                            const t = buildTiming(tp.mm, val);
                                                                            handleResultChange(
                                                                                stu.id,
                                                                                isQualTiming ? 'qualifying' : 'finals',
                                                                                isQualTiming ? res.qualifyingType : res.finalsType,
                                                                                (isQualTiming ? (res.qualifyingPosition || '') : (res.finalsPosition || '')).toString(),
                                                                                t || '',
                                                                                res.preQualifyingType || 'pending',
                                                                                res.preFinalsType || 'pending'
                                                                            );
                                                                        }}
                                                                        className={`bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none ${border} w-16 font-mono`}
                                                                    />
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden xl:inline">{placeholder}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {showAllResultsModal && createPortal(
                <AllResultsModal
                    categories={categoriesData}
                    standings={standingsDetailsMap}
                    onClose={() => setShowAllResultsModal(false)}
                    onDownload={downloadAllResultsDocx}
                    isDownloading={isDownloading}
                />,
                document.body
            )}
        </div>
    );
};

function AllResultsModal({ categories, standings, onClose, onDownload, isDownloading }: { categories: any[]; standings: any; onClose: () => void; onDownload: () => void; isDownloading: boolean }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 rounded-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Icon name="history_edu" size="24" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">HODSON'S RUN 2026 SUMMARY</h2>
                            <p className="text-xs text-slate-400">Podium results and comprehensive house standings</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onDownload}
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                        >
                            <Icon name={isDownloading ? 'sync' : 'download'} className={isDownloading ? 'animate-spin' : ''} />
                            <span>Download Summary .docx</span>
                        </button>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                            <Icon name="close" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
                    {/* Podium Results Grouping */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-px flex-1 bg-white/5"></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">Category Podiums</span>
                            <div className="h-px flex-1 bg-white/5"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                                    <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{cat.name}</h4>
                                    <div className="space-y-2">
                                        {cat.top3.map((stu: any, rankIdx: number) => (
                                            <div key={rankIdx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black w-6 h-6 rounded flex items-center justify-center ${rankIdx === 0 ? 'bg-yellow-400/10 text-yellow-400' : rankIdx === 1 ? 'bg-slate-300/10 text-slate-300' : 'bg-amber-600/10 text-amber-600'}`}>
                                                        {rankIdx + 1}
                                                    </span>
                                                    <span className="text-xs text-white font-bold truncate max-w-[120px]" title={stu?.name}>{stu?.name || 'TBD'}</span>
                                                    {stu?.class && <span className="text-[9px] text-slate-500 font-medium">({stu.class})</span>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{stu?.house || '—'}</span>
                                                    <span className="text-[10px] font-mono text-slate-400">{stu?.timing || '—'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* House Standings Grouping */}
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-px flex-1 bg-white/5"></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">House Leaderboards</span>
                            <div className="h-px flex-1 bg-white/5"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {['Overall', 'BD', 'GD', 'PD'].map(deptKey => {
                                const dept = standings[deptKey];
                                if (!dept) return null;
                                return (
                                    <div key={deptKey} className="glass-panel p-6 border border-white/10 bg-white/[0.02] rounded-2xl">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Icon name="military_tech" size="18" className="text-primary" />
                                            {dept.title}
                                        </h3>
                                        <div className="space-y-4">
                                            {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik']
                                                .map(h => ({ name: h, points: dept.houseStats[h]?.points || 0 }))
                                                .sort((a, b) => b.points - a.points)
                                                .map((h, i) => {
                                                    const config = houseConfig(h.name);
                                                    return (
                                                        <div key={h.name} className="flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-slate-600">#{i + 1}</span>
                                                                <div className={`size-2 rounded-full ${config.bg}`}></div>
                                                                <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{h.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black text-white">{h.points}</span>
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">pts</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Hodsons;
