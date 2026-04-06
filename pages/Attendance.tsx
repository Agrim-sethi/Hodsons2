import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const HOUSES = [
    { name: 'Himalaya', code: 'H', config: HOUSE_COLORS.himalaya },
    { name: 'Nilgiri', code: 'N', config: HOUSE_COLORS.nilgiri },
    { name: 'Siwalik', code: 'S', config: HOUSE_COLORS.siwalik },
    { name: 'Vindhya', code: 'V', config: HOUSE_COLORS.vindhya },
];

const Attendance: React.FC = () => {
    const [csvData, setCsvData] = useState('');
    const [searchCompNum, setSearchCompNum] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const fetchCsv = async () => {
            try {
                const res = await fetch('/Attendance.csv?t=' + Date.now());
                if (res.ok) {
                    const text = await res.text();
                    setCsvData(text);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchCsv();
        const intervalId = setInterval(fetchCsv, 2000);
        return () => clearInterval(intervalId);
    }, []);

    const parsedCsvData = React.useMemo(() => {
        if (!csvData) return [];
        return csvData.trim().split('\n').slice(1).filter(row => row.trim() !== '').map(row => {
            const [computerNumber, name, house, classStr, date, attended] = row.split(',');
            return {
                computerNumber: computerNumber?.trim() || '',
                name: name?.trim() || '',
                house: house?.trim() || '',
                classStr: classStr?.trim() || '',
                date: date?.trim() || '',
                attended: attended?.trim() === 'Yes'
            };
        });
    }, [csvData]);

    const absentees = React.useMemo(() => {
        const abs = parsedCsvData.filter(row => !row.attended);
        // unique absentees based on latest date or just list them all
        return abs;
    }, [parsedCsvData]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setHasSearched(true);
    };

    const handleDownloadAbsenteesPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Sports Session Absentees Report', 14, 22);

        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 30);

        const tableColumn = ["Comp No.", "Name", "House", "Class", "Date Missed"];
        const tableRows = [];

        absentees.forEach(student => {
            const rowData = [
                student.computerNumber,
                student.name,
                student.house,
                student.classStr,
                student.date
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
        });

        doc.save(`Absentees_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const studentRecords = React.useMemo(() => {
        if (!searchCompNum.trim() || !hasSearched) return null;
        return parsedCsvData.filter(row => row.computerNumber === searchCompNum.trim());
    }, [parsedCsvData, searchCompNum, hasSearched]);

    const searchResultStatus = () => {
        if (!hasSearched || !searchCompNum.trim()) return 'empty';
        if (studentRecords && studentRecords.length > 0) return 'found';
        return 'not_found';
    };

    return (
        <div className="max-w-[1240px] mx-auto space-y-8 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="royal-kicker mb-2">Attendance Ledger</div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Student Attendance Lookup</h1>
                    <p className="text-slate-400 mt-1 font-medium">Verify sports sessions attended by computer number</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Absentees Alert */}
                <div className="lg:col-span-4 space-y-6">
                    {absentees.length > 0 ? (
                        <div className="glass-panel p-6 rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
                                <Icon name="warning" size="100" />
                            </div>
                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Icon name="warning" className="text-red-500 animate-pulse" />
                                        <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest">Absentees Alert</h4>
                                    </div>
                                    <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full w-fit">{absentees.length} Students</span>
                                </div>
                                <button
                                    onClick={handleDownloadAbsenteesPDF}
                                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center"
                                    title="Download PDF Report"
                                >
                                    <Icon name="download" size="20" />
                                </button>
                            </div>
                            <div className="space-y-3 relative z-10 max-h-[500px] overflow-y-auto pr-1">
                                {absentees.map((student, idx) => (
                                    <div key={idx} className="bg-background-dark/50 border border-red-500/20 hover:border-red-500/50 transition-colors rounded-xl p-3 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="text-white font-bold text-sm tracking-wide">{student.name}</span>
                                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-1 rounded">{student.date}</span>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-2 text-[11px] font-medium">
                                            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-bold">#{student.computerNumber}</span>
                                            <span className={`px-2 py-0.5 rounded border border-white/10 ${HOUSES.find(h => h.name === student.house)?.config.bg || ''} bg-opacity-20 text-white uppercase tracking-wider`}>
                                                {student.house}
                                            </span>
                                            <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded">Class {student.classStr}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-6 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent flex flex-col items-center justify-center text-center py-12">
                            <div className="size-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-4">
                                <Icon name="check_circle" size="32" />
                            </div>
                            <h4 className="text-green-500 font-bold tracking-widest uppercase text-sm mb-2">100% Attendance</h4>
                            <p className="text-slate-400 text-xs">No students have missed their mandatory sports sessions in the system recently.</p>
                        </div>
                    )}
                </div>

                {/* Main Content Area: Search & Display */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="glass-panel section-plaque p-8 rounded-2xl border border-white/5 flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-6">Search Student Records</h2>
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <div className="relative flex-1">
                                <Icon name="numbers" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Enter Computer Number (e.g. 1001)"
                                    value={searchCompNum}
                                    onChange={(e) => setSearchCompNum(e.target.value)}
                                    className="w-full royal-input rounded-xl pl-12 pr-4 py-4 placeholder-slate-500 transition-all text-lg font-bold tracking-widest"
                                    required
                                />
                            </div>
                            <button type="submit" className="px-8 py-4 rounded-xl royal-primary-btn font-bold flex items-center gap-2">
                                <Icon name="search" /> Lookup
                            </button>
                        </form>
                    </div>

                    {/* Results Display */}
                    {searchResultStatus() === 'not_found' && (
                        <div className="glass-panel p-12 rounded-2xl border border-red-500/20 bg-red-500/5 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                            <div className="size-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-4">
                                <Icon name="error_outline" size="40" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Computer Number Not Found</h3>
                            <p className="text-slate-400 text-sm max-w-sm font-medium">
                                The computer number <span className="text-red-400 font-bold px-1">{searchCompNum}</span> does not exist in our attendance directory. Please reinput the right computer number.
                            </p>
                            <button onClick={() => { setSearchCompNum(''); setHasSearched(false); }} className="mt-6 px-6 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold transition-all">
                                Try Again
                            </button>
                        </div>
                    )}

                    {searchResultStatus() === 'found' && studentRecords && (
                        <div className="space-y-6 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
                            {/* Student Identity Card */}
                            <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full opacity-50 ${HOUSES.find(h => h.name === studentRecords[0].house)?.config.bg.replace('bg-', 'bg-')}`}></div>

                                <div className="size-24 md:size-32 rounded-3xl bg-background-dark border-4 border-white/5 flex items-center justify-center shadow-inner shrink-0 text-white/20">
                                    <Icon name="person" size="64" />
                                </div>
                                <div className="text-center md:text-left flex-1 z-10">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                        <span className="text-xs font-bold text-primary bg-primary/20 px-3 py-1 rounded-full uppercase tracking-widest">#{studentRecords[0].computerNumber}</span>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 ${HOUSES.find(h => h.name === studentRecords[0].house)?.config.bg || ''} bg-opacity-20 text-white`}>{studentRecords[0].house}</span>
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{studentRecords[0].name}</h2>
                                    <p className="text-slate-400 font-medium">Class {studentRecords[0].classStr}</p>
                                </div>
                                <div className="flex flex-col items-center justify-center glass-panel px-6 py-4 rounded-xl border border-white/5 shrink-0 z-10">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Attendance</span>
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-black text-white">{studentRecords.filter(r => r.attended).length}</span>
                                        <span className="text-sm font-medium text-slate-500 mb-1">/ {studentRecords.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Session Timeline */}
                            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                        <Icon name="history" size="20" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Session History</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {studentRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((session, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${session.attended ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-400 font-mono">{session.date}</span>
                                                {session.attended ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-500 bg-green-500/20 px-2 py-0.5 rounded">
                                                        <Icon name="check" size="14" /> Present
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 bg-red-500/20 px-2 py-0.5 rounded">
                                                        <Icon name="close" size="14" /> Absent
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-white">Daily Sports Session</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Attendance;
