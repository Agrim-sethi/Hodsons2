import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Legend } from 'recharts';
import { mockStudents, getHodsonsResults, saveHodsonsResults, HodsonsResult, CATEGORIES_LIST, getSkipQualifyingCategories, saveSkipQualifyingCategories, HodsonsCategory, HodsonsStudent, getExtraStudents, saveExtraStudents, getExtraClasses, saveExtraClasses, subscribeToHodsonsData } from '../utils/hodsonsStorage';
import { ACCESS_OPTIONS, ACCESS_SCOPE_CONFIG, RESULTS_DEPARTMENTS } from '../components/hodsons/config';
import { PodiumStep, StandingsChart } from '../components/hodsons/shared';
import { buildDerivedHodsonsData } from '../utils/hodsonsDerived';
import { CategoryData, DepartmentStandingsData, DerivedHodsonsData, EditorPhase, HouseAccessScope, HouseStandingsDatum, ResultsDepartmentKey, StandingsScopeKey } from '../components/hodsons/types';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import * as XLSX from 'xlsx';
import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import studentClasses from '../utils/studentClasses.json';
import { classifyQualifyingTiming, HODSONS_RACE_INFO, timingToSeconds } from '../utils/hodsonsRaceInfo';
import { useStaffAuth } from '../components/auth/StaffAuthProvider';

const houseConfig = (house: string) => {
    const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
    return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

const chartGridStroke = 'rgba(201,163,74,0.12)';
const chartTickStyle = { fill: '#c7d2e0', fontSize: 11, fontWeight: 'bold' as const };
const chartYAxisStyle = { fill: '#f8f1de', fontSize: 12, fontWeight: 'bold' as const };
const chartLegendFormatter = (value: string) => <span style={{ color: '#f3e4bd', fontWeight: 700 }}>{value}</span>;
const chartTooltipStyle = {
    backgroundColor: 'rgba(10, 20, 34, 0.96)',
    borderColor: 'rgba(201,163,74,0.28)',
    color: '#fff7e4',
    borderRadius: '14px',
    padding: '10px 14px',
    boxShadow: '0 14px 32px rgba(0, 0, 0, 0.42)'
};

const qualifiesForFinals = (qualifyingType?: string, skipsQualifying?: boolean) =>
    Boolean(skipsQualifying || qualifyingType === 'qualified' || qualifyingType === 'bonus' || qualifyingType === 'finished');

const formatRaceInfoLabel = (timing?: string) => timing ? `${timing} min` : '—';

type CategoryRecordAlert = {
    category: HodsonsCategory;
    athleteName: string;
    athleteHouse: string;
    currentTiming: string;
    recordTiming: string;
    recordHolder: string;
    recordYear: string;
    marginLabel: string;
};

const parseExtendedTimingToSeconds = (timing?: string): number => {
    if (!timing) return Number.POSITIVE_INFINITY;
    const parts = timing.split(':').map((segment) => parseInt(segment, 10));
    if (parts.some((value) => Number.isNaN(value))) return Number.POSITIVE_INFINITY;
    if (parts.length >= 3) {
        return (parts[0] * 60) + parts[1] + (parts[2] / 100);
    }
    if (parts.length === 2) {
        return (parts[0] * 60) + parts[1];
    }
    return Number.POSITIVE_INFINITY;
};

const formatRecordMargin = (seconds: number) => `${seconds.toFixed(seconds >= 1 ? 2 : 2)}s faster`;

const getCategoryRecordAlert = (categoryData?: CategoryData | null): CategoryRecordAlert | null => {
    if (!categoryData?.bestTiming) return null;
    const raceInfo = HODSONS_RACE_INFO[categoryData.name];
    const currentSeconds = parseExtendedTimingToSeconds(categoryData.bestTiming.timing);
    const recordSeconds = parseExtendedTimingToSeconds(raceInfo.recordTiming);

    if (!Number.isFinite(currentSeconds) || !Number.isFinite(recordSeconds) || currentSeconds >= recordSeconds) {
        return null;
    }

    return {
        category: categoryData.name,
        athleteName: categoryData.bestTiming.name,
        athleteHouse: categoryData.bestTiming.house,
        currentTiming: categoryData.bestTiming.timing,
        recordTiming: raceInfo.recordTiming,
        recordHolder: raceInfo.recordHolder,
        recordYear: raceInfo.recordYear,
        marginLabel: formatRecordMargin(recordSeconds - currentSeconds)
    };
};

const prettifyExportStatus = (status?: string) => {
    if (!status) return 'Pending';
    if (status === 'medically_excused') return 'Medically Excused';
    if (status === 'not_participating') return 'Not Participating';
    if (status === 'on_leave') return 'On Leave';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStageExportStatus = (
    result: Partial<HodsonsResult>,
    stage: 'pre_qualifying' | 'qualifying' | 'pre_finals' | 'finals',
    skipsQualifying = false
) => {
    if (stage === 'pre_qualifying') {
        return prettifyExportStatus(result.preQualifyingType || 'pending');
    }

    if (stage === 'qualifying') {
        if (result.preQualifyingType === 'medically_excused') return 'Medically Excused';
        if (result.preQualifyingType === 'not_participating') return 'Not Participating';
        if (result.preQualifyingType === 'on_leave') return 'On Leave';
        if (result.qualifyingType === 'absent') return 'Absent';
        return prettifyExportStatus(result.qualifyingType || 'pending');
    }

    if (stage === 'pre_finals') {
        if (skipsQualifying) return 'Participating';
        return prettifyExportStatus(result.preFinalsType || 'pending');
    }

    if (result.preFinalsType === 'medically_excused' || result.finalsType === 'medically_excused') return 'Medically Excused';
    if (result.preFinalsType === 'not_participating') return 'Not Participating';
    if (result.preFinalsType === 'on_leave') return 'On Leave';
    if (result.finalsType === 'absent') return 'Absent';
    return prettifyExportStatus(result.finalsType || 'pending');
};

const Hodsons: React.FC = () => {
    const { showToast } = useToast();
    const { isLoggedIn } = useStaffAuth();
    const [results, setResults] = useState<HodsonsResult[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editCategory, setEditCategory] = useState<HodsonsCategory | null>(null);
    const [selectedCategoryStats, setSelectedCategoryStats] = useState<CategoryData | null>(null);
    const [selectedStandingsStats, setSelectedStandingsStats] = useState<DepartmentStandingsData | null>(null);
    const [filterHouse, setFilterHouse] = useState<HouseAccessScope>('All');
    const [activePhase, setActivePhase] = useState<EditorPhase>('pre_qualifying');
    const [listSortField, setListSortField] = useState<'id' | 'house' | 'name' | 'class' | 'status' | 'performance'>('id');
    const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedResultsDept, setSelectedResultsDept] = useState<ResultsDepartmentKey>('BD');
    const [selectedAddResultsDept, setSelectedAddResultsDept] = useState<ResultsDepartmentKey>('BD');
    const [showAllResultsModal, setShowAllResultsModal] = useState(false);

    // Derived State
    const [standings, setStandings] = useState<HouseStandingsDatum[]>([]);
    const [bdStandings, setBdStandings] = useState<HouseStandingsDatum[]>([]);
    const [gdStandings, setGdStandings] = useState<HouseStandingsDatum[]>([]);
    const [pdStandings, setPdStandings] = useState<HouseStandingsDatum[]>([]);
    const [categoriesData, setCategoriesData] = useState<CategoryData[]>([]);
    const [standingsDetailsMap, setStandingsDetailsMap] = useState<Record<StandingsScopeKey, DepartmentStandingsData>>({} as Record<StandingsScopeKey, DepartmentStandingsData>);
    const [skipQualifyingCategories, setSkipQualifyingCategories] = useState<HodsonsCategory[]>([]);
    const [extraStudents, setExtraStudents] = useState<HodsonsStudent[]>([]);
    const [extraClasses, setExtraClasses] = useState<Record<string, string>>({});
    const [newStudentData, setNewStudentData] = useState({ id: '', name: '', house: 'Vindhya' as const, class: '' });

    const allHodsonsStudents = [...mockStudents, ...extraStudents];
    const allHodsonsClasses = { ...(studentClasses as Record<string, string>), ...extraClasses };

    const [categoryModalTab, setCategoryModalTab] = useState<'qualifying' | 'finals' | 'race' | 'list'>('qualifying');
    const [downloadFormat, setDownloadFormat] = useState<'xlsx' | 'docx'>('xlsx');
    const [isDownloading, setIsDownloading] = useState(false);

    // Access / Passcode State
    const [showAccessScopeModal, setShowAccessScopeModal] = useState(false);
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [pendingCategoryAccess, setPendingCategoryAccess] = useState<HodsonsCategory | null>(null);
    const [selectedAccessScope, setSelectedAccessScope] = useState<HouseAccessScope | null>(null);
    const [editorAccessScope, setEditorAccessScope] = useState<HouseAccessScope | null>(null);
    const [passcodeInput, setPasscodeInput] = useState('');
    const [passcodeError, setPasscodeError] = useState(false);
    const [mainSectionTab, setMainSectionTab] = useState<'standings' | 'results' | 'summary'>('standings');
    const [lastSavedMeta, setLastSavedMeta] = useState<{ category: string; savedAt: string } | null>(null);
    const [isAutoSavingIndicator, setIsAutoSavingIndicator] = useState(false);
    
    const resultsRef = useRef(results);
    useEffect(() => { resultsRef.current = results; }, [results]);

    useEffect(() => {
        if (!editCategory) return;
        const interval = setInterval(() => {
            const studentsInCat = allHodsonsStudents.filter(s => s.category === editCategory);
            const getRes = (stuId: string) => resultsRef.current.find(r => r.studentId === stuId) || { studentId: stuId, preQualifyingType: 'pending' as const, preFinalsType: 'pending' as const, qualifyingType: 'pending' as const, finalsType: 'pending' as const };
            
            const qualifiedWithTiming = studentsInCat
                .map(stu => ({ stu, res: getRes(stu.id) }))
                .filter(({ res }) => res.qualifyingType === 'qualified' && res.qualifyingTiming)
                .sort((a, b) => timingToSeconds(a.res.qualifyingTiming) - timingToSeconds(b.res.qualifyingTiming));

            const finalistsWithTiming = studentsInCat
                .map(stu => ({ stu, res: getRes(stu.id) }))
                .filter(({ res }) => res.finalsType === 'qualified_pos' && res.finalsTiming)
                .sort((a, b) => timingToSeconds(a.res.finalsTiming) - timingToSeconds(b.res.finalsTiming));

            const updatedResults = [...resultsRef.current];

            qualifiedWithTiming.forEach(({ stu }, idx) => {
                const rIdx = updatedResults.findIndex(r => r.studentId === stu.id);
                if (rIdx >= 0) updatedResults[rIdx] = { ...updatedResults[rIdx], qualifyingPosition: idx + 1 };
            });

            finalistsWithTiming.forEach(({ stu }, idx) => {
                const rIdx = updatedResults.findIndex(r => r.studentId === stu.id);
                if (rIdx >= 0) updatedResults[rIdx] = { ...updatedResults[rIdx], finalsPosition: idx + 1 };
            });

            studentsInCat.forEach(stu => {
                const rIdx = updatedResults.findIndex(r => r.studentId === stu.id);
                if (rIdx < 0) return;
                const r = updatedResults[rIdx];
                if (r.qualifyingType !== 'qualified') updatedResults[rIdx] = { ...updatedResults[rIdx], qualifyingPosition: undefined };
                if (r.finalsType !== 'qualified_pos') updatedResults[rIdx] = { ...updatedResults[rIdx], finalsPosition: undefined };
            });

            setResults(updatedResults);
            saveHodsonsResults(updatedResults);
            loadData();
            setIsAutoSavingIndicator(true);
            setTimeout(() => setIsAutoSavingIndicator(false), 2000);
        }, 10000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editCategory]);

    const categoryRecordAlerts = categoriesData
        .map((category) => getCategoryRecordAlert(category))
        .filter(Boolean) as CategoryRecordAlert[];
    const categoryRecordAlertMap = Object.fromEntries(
        categoryRecordAlerts.map((alert) => [alert.category, alert])
    ) as Partial<Record<HodsonsCategory, CategoryRecordAlert>>;

    useEffect(() => {
        const unsubscribe = subscribeToHodsonsData(() => {
            loadData();
        });
        loadData();
        
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!editorAccessScope || editorAccessScope === 'All' || !editCategory) return;

        const skipsQualifying = skipQualifyingCategories.includes(editCategory);
        const allowedPhases = ACCESS_SCOPE_CONFIG[editorAccessScope].allowedPhases;

        if (skipsQualifying) {
            if (activePhase !== 'pre_finals') {
                setActivePhase('pre_finals');
            }
            return;
        }

        if (!allowedPhases.includes(activePhase)) {
            setActivePhase(allowedPhases[0]);
        }
    }, [activePhase, editorAccessScope, editCategory, skipQualifyingCategories]);

    const handlePasscodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedAccessScope && passcodeInput === ACCESS_SCOPE_CONFIG[selectedAccessScope].passcode) {
            const unlockedCategory = pendingCategoryAccess;
            const houseAccessOnSkippedCategory = selectedAccessScope !== 'All' && unlockedCategory && skipQualifyingCategories.includes(unlockedCategory);
            setShowPasscodeModal(false);
            setPasscodeInput('');
            setPasscodeError(false);
            setEditorAccessScope(selectedAccessScope);
            setFilterHouse(selectedAccessScope === 'All' ? 'All' : selectedAccessScope);
            setActivePhase(houseAccessOnSkippedCategory ? 'pre_finals' : 'pre_qualifying');
            setEditCategory(unlockedCategory);
            setPendingCategoryAccess(null);
            setSelectedAccessScope(null);
        } else {
            setPasscodeError(true);
        }
    };

    const resetAccessFlow = () => {
        setShowAccessScopeModal(false);
        setShowPasscodeModal(false);
        setPendingCategoryAccess(null);
        setSelectedAccessScope(null);
        setPasscodeInput('');
        setPasscodeError(false);
    };

    const closeCategoryEditor = () => {
        setEditCategory(null);
        setFilterHouse('All');
        setEditorAccessScope(null);
        resetAccessFlow();
    };

    const openCategoryAccessFlow = (category: HodsonsCategory) => {
        setPendingCategoryAccess(category);
        setSelectedAccessScope(null);
        setPasscodeInput('');
        setPasscodeError(false);
        setShowAccessScopeModal(true);
    };

    const loadData = () => {
        const skippedCategories = getSkipQualifyingCategories();
        const storedExtraStudents = getExtraStudents();
        const storedExtraClasses = getExtraClasses();

        setExtraStudents(storedExtraStudents);
        setExtraClasses(storedExtraClasses);
        setSkipQualifyingCategories(skippedCategories);

        const currentAllStudents = [...mockStudents, ...storedExtraStudents];
        const currentAllClasses = { ...(studentClasses as Record<string, string>), ...storedExtraClasses };

        const storedResults = getHodsonsResults().map(raw => {
            const r = { ...raw } as any;
            const qualifyingType = r.qualifyingType === 'late' ? 'dnf' : r.qualifyingType;
            const finalsType = r.finalsType === 'late' ? 'dnf' : r.finalsType;

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

            const stu = currentAllStudents.find((s: any) => s.id === migrated.studentId);
            const skipsQualifying = stu ? skippedCategories.includes(stu.category) : false;

            if (!skipsQualifying && ['pending', 'medically_excused', 'on_leave'].includes(migrated.preQualifyingType as string)) {
                migrated.qualifyingType = 'pending';
                migrated.qualifyingPosition = undefined;
                migrated.qualifyingTiming = undefined;
                migrated.preFinalsType = 'pending';
                migrated.finalsType = 'pending';
                migrated.finalsPosition = undefined;
                migrated.finalsTiming = undefined;
            }

            if (!qualifiesForFinals(migrated.qualifyingType, skipsQualifying)) {
                migrated.preFinalsType = 'pending';
                migrated.finalsType = 'pending';
                migrated.finalsPosition = undefined;
                migrated.finalsTiming = undefined;
            }

            if (['pending', 'not_participating', 'medically_excused', 'on_leave'].includes(migrated.preFinalsType as string)) {
                migrated.finalsType = 'pending';
                migrated.finalsPosition = undefined;
                migrated.finalsTiming = undefined;
            }

            return migrated;
        });

        const derivedData: DerivedHodsonsData = buildDerivedHodsonsData(storedResults, skippedCategories, currentAllStudents, currentAllClasses);

        setResults(storedResults);
        setSkipQualifyingCategories(skippedCategories);
        setStandings(derivedData.standings);
        setBdStandings(derivedData.bdStandings);
        setGdStandings(derivedData.gdStandings);
        setPdStandings(derivedData.pdStandings);
        setCategoriesData(derivedData.categoriesData);
        setStandingsDetailsMap(derivedData.standingsDetailsMap);
    };

    const handleSaveResult = (cat: string) => {
        const studentsInCat = allHodsonsStudents.filter(s => s.category === cat);
        const getRes = (stuId: string) => results.find(r => r.studentId === stuId) || { studentId: stuId, preQualifyingType: 'pending' as const, preFinalsType: 'pending' as const, qualifyingType: 'pending' as const, finalsType: 'pending' as const };

        // Auto-rank qualified students by timing (fastest = rank 1)
        // Qualifying phase: rank students with qualifyingType === 'qualified' who have a timing
        const qualifiedWithTiming = studentsInCat
            .map(stu => ({ stu, res: getRes(stu.id) }))
            .filter(({ res }) => res.qualifyingType === 'qualified' && res.qualifyingTiming)
            .sort((a, b) => timingToSeconds(a.res.qualifyingTiming) - timingToSeconds(b.res.qualifyingTiming));

        // Finals phase: rank students with finalsType === 'qualified_pos' who have a timing
        const finalistsWithTiming = studentsInCat
            .map(stu => ({ stu, res: getRes(stu.id) }))
            .filter(({ res }) => res.finalsType === 'qualified_pos' && res.finalsTiming)
            .sort((a, b) => timingToSeconds(a.res.finalsTiming) - timingToSeconds(b.res.finalsTiming));

        // Apply auto-ranks to results
        const updatedResults = [...results];

        // Assign qualifying positions
        qualifiedWithTiming.forEach(({ stu }, idx) => {
            const rIdx = updatedResults.findIndex(r => r.studentId === stu.id);
            if (rIdx >= 0) {
                updatedResults[rIdx] = { ...updatedResults[rIdx], qualifyingPosition: idx + 1 };
            }
        });

        // Assign finals positions
        finalistsWithTiming.forEach(({ stu }, idx) => {
            const rIdx = updatedResults.findIndex(r => r.studentId === stu.id);
            if (rIdx >= 0) {
                updatedResults[rIdx] = { ...updatedResults[rIdx], finalsPosition: idx + 1 };
            }
        });

        // Clear positions for non-qualified students (cleanup)
        studentsInCat.forEach(stu => {
            const rIdx = updatedResults.findIndex(r => r.studentId === stu.id);
            if (rIdx < 0) return;
            const r = updatedResults[rIdx];
            if (r.qualifyingType !== 'qualified') {
                updatedResults[rIdx] = { ...updatedResults[rIdx], qualifyingPosition: undefined };
            }
            if (r.finalsType !== 'qualified_pos') {
                updatedResults[rIdx] = { ...updatedResults[rIdx], finalsPosition: undefined };
            }
        });

        setResults(updatedResults);
        saveHodsonsResults(updatedResults);
        loadData();
        showToast({
            title: 'Results Saved',
            description: `Results for ${cat} saved. ${qualifiedWithTiming.length} qualifying + ${finalistsWithTiming.length} finals positions auto-ranked by timing.`
        });
        setLastSavedMeta({
            category: cat,
            savedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        });
    };

    const handleAddExtraStudent = () => {
        if (!newStudentData.id || !newStudentData.name || !newStudentData.class || !editCategory) {
            showToast({
                title: 'Missing Details',
                description: 'Please fill all student details.'
            });
            return;
        }

        const compNo = newStudentData.id.trim();
        if (allHodsonsStudents.some(s => s.id === compNo)) {
            showToast({
                title: 'Duplicate Entry',
                description: 'Student with this Computer No already exists.'
            });
            return;
        }

        const newStu: HodsonsStudent = {
            id: compNo,
            name: newStudentData.name.trim(),
            house: newStudentData.house,
            category: editCategory
        };

        const updatedStudents = [...extraStudents, newStu];
        const updatedClasses = { ...extraClasses, [compNo]: newStudentData.class.trim() };

        saveExtraStudents(updatedStudents);
        saveExtraClasses(updatedClasses);

        // Also ensure a result entry exists for this new student
        const newResult: HodsonsResult = {
            studentId: compNo,
            qualifyingType: 'pending',
            finalsType: 'pending',
            preQualifyingType: 'pending',
            preFinalsType: 'pending'
        };
        saveHodsonsResults([...results, newResult]);

        setNewStudentData({ id: '', name: '', house: 'Vindhya', class: '' });
        loadData();
        showToast({
            title: 'Student Added',
            description: `Student ${newStu.name} added to ${editCategory}!`
        });
    };

    const handleClearCategoryResults = (cat: string) => {
        if (window.confirm(`Are you sure you want to completely erase ALL results for ${cat}? This cannot be undone.`)) {
            // Overwrite results for this specific category to 'pending'
            const newResults = results.map(r => {
                const stu = allHodsonsStudents.find(s => s.id === r.studentId);
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
            showToast({
                title: 'Category Cleared',
                description: `${cat} was reset back to a clean results state.`
            });
        }
    };

    const handleSkipQualifyingPhase = (cat: HodsonsCategory) => {
        const confirmed = window.confirm(
            `Skip the qualifying phase for ${cat}?\n\nThis will delete all qualifying-stage data for this category, allow the full enrolled list to move directly to finals, and reset the pre-finals list to pending for all students in this category.`
        );

        if (!confirmed) return;

        const categoryStudentIds = new Set(
            allHodsonsStudents.filter(student => student.category === cat).map(student => student.id)
        );

        const existingByStudent = new Map<string, HodsonsResult>(results.map(result => [result.studentId, result]));
        const updatedResults = allHodsonsStudents
            .filter(student => student.category === cat)
            .map(student => {
                const current = existingByStudent.get(student.id);
                return {
                    studentId: student.id,
                    preQualifyingType: current?.preQualifyingType ?? 'pending',
                    preFinalsType: 'pending' as const,
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
        showToast({
            title: 'Qualifying Skipped',
            description: `${cat} now routes the full enrolled list into pre-finals/finals mode.`
        });
    };

    const handleRestoreQualifyingPhase = (cat: HodsonsCategory) => {
        const confirmed = window.confirm(
            `Restore the qualifying phase for ${cat}?\n\nThis will remove skip-qualifying mode for this category and reset auto-filled pre-finals entries back to pending where no qualifying result exists. Finals data will be kept.`
        );

        if (!confirmed) return;

        const nextResults = results.map(result => {
            const student = allHodsonsStudents.find(s => s.id === result.studentId);
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
        showToast({
            title: 'Qualifying Restored',
            description: `${cat} is back on the standard qualifying flow.`
        });
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

            let nextQualType = phase === 'qualifying' ? type : (idx >= 0 ? newRes[idx].qualifyingType : 'pending');
            let nextFinalType = phase === 'finals' ? type : (idx >= 0 ? newRes[idx].finalsType : 'pending');
            let nextQualPos = phase === 'qualifying' ? pos : (idx >= 0 ? newRes[idx].qualifyingPosition : undefined);
            let nextQualTiming = phase === 'qualifying' ? timing : (idx >= 0 ? newRes[idx].qualifyingTiming : undefined);
            let nextFinalPos = phase === 'finals' ? pos : (idx >= 0 ? newRes[idx].finalsPosition : undefined);
            let nextFinalTiming = phase === 'finals' ? timing : (idx >= 0 ? newRes[idx].finalsTiming : undefined);
            let nextPreFinalsType = preFinalsType;

            const categoryObj = allHodsonsStudents.find((s: any) => s.id === stuId)?.category as HodsonsCategory | undefined;
            const skipsQualifying = categoryObj ? skipQualifyingCategories.includes(categoryObj as HodsonsCategory) : false;
            const manualQualifyingStatus = phase === 'qualifying' ? type : (idx >= 0 ? newRes[idx].qualifyingType : 'pending');

            if (phase === 'qualifying' && !skipsQualifying && categoryObj) {
                nextQualType = manualQualifyingStatus;
                if (manualQualifyingStatus === 'absent' || manualQualifyingStatus === 'medically_excused' || manualQualifyingStatus === 'dnf' || manualQualifyingStatus === 'left_school') {
                    nextQualPos = undefined;
                    nextQualTiming = undefined;
                } else if (manualQualifyingStatus === 'bonus') {
                    nextQualPos = undefined;
                }
            }

            if (!skipsQualifying && ['pending', 'medically_excused', 'on_leave', 'left_school'].includes(preQualifyingType as string)) {
                nextQualType = preQualifyingType === 'left_school' ? 'left_school' : 'pending';
                nextQualPos = undefined;
                nextQualTiming = undefined;
                nextPreFinalsType = preQualifyingType === 'left_school' ? 'left_school' : 'pending';
                nextFinalType = preQualifyingType === 'left_school' ? 'left_school' : 'pending';
                nextFinalPos = undefined;
                nextFinalTiming = undefined;
            }

            if (!qualifiesForFinals(nextQualType, skipsQualifying)) {
                nextPreFinalsType = nextQualType === 'left_school' ? 'left_school' : 'pending';
                nextFinalType = nextQualType === 'left_school' ? 'left_school' : 'pending';
                nextFinalPos = undefined;
                nextFinalTiming = undefined;
            }

            if (['pending', 'not_participating', 'medically_excused', 'on_leave', 'left_school'].includes(nextPreFinalsType as string)) {
                nextFinalType = nextPreFinalsType === 'left_school' ? 'left_school' : 'pending';
                nextFinalPos = undefined;
                nextFinalTiming = undefined;
            }

            const newResult = {
                studentId: stuId,
                preQualifyingType: (preQualifyingType === 'left_school' || nextQualType === 'left_school' || nextPreFinalsType === 'left_school' || nextFinalType === 'left_school') ? 'left_school' : preQualifyingType,
                preFinalsType: nextPreFinalsType,
                qualifyingType: nextQualType,
                finalsType: nextFinalType,
                qualifyingPosition: nextQualPos,
                qualifyingTiming: nextQualTiming,
                finalsPosition: nextFinalPos,
                finalsTiming: nextFinalTiming
            };

            if (idx >= 0) {
                newRes[idx] = newResult;
            } else {
                newRes.push(newResult);
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
                const student = allHodsonsStudents.find(stu => stu.id === result.studentId);
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
        showToast({
            title: 'Download Ready',
            description: filename
        });
    };

    const downloadAllResultsDocx = async () => {
        try {
            setIsDownloading(true);
            const timestamp = new Date().toISOString().slice(0, 10);
            const newRecordRows = categoryRecordAlerts.map((alert) => ({
                Category: alert.category,
                Athlete: alert.athleteName,
                House: alert.athleteHouse,
                'New Mark': alert.currentTiming,
                'Old Record': alert.recordTiming,
                Margin: alert.marginLabel
            }));

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

            const newRecordsSection = newRecordRows.length > 0 ? [
                new Paragraph({ children: [new TextRun({ text: "NEW RECORDS", bold: true, size: 32 })], spacing: { before: 800, after: 300 }, alignment: AlignmentType.CENTER }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: ['Category', 'Athlete', 'House', 'New Mark', 'Old Record', 'Margin'].map(h => new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                                shading: { fill: 'EEEEEE', type: ShadingType.CLEAR }
                            }))
                        }),
                        ...newRecordRows.map(r => new TableRow({
                            children: [r.Category, r.Athlete, r.House, r['New Mark'], r['Old Record'], r.Margin].map(v => new TableCell({
                                children: [new Paragraph(String(v))]
                            }))
                        }))
                    ]
                })
            ] : [];

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ children: [new TextRun({ text: "HODSON'S RUN 2026 - FINAL RESULTS", bold: true, size: 36 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        ...newRecordsSection,
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

    const downloadAllCompetitorsXlsx = () => {
        try {
            setIsDownloading(true);
            const wb = XLSX.utils.book_new();
            const timestamp = new Date().toISOString().slice(0, 10);

            CATEGORIES_LIST.forEach(cat => {
                const competitorRows = allHodsonsStudents
                    .filter(s => s.category === cat)
                    .map((stu, idx) => ({
                        'SN': idx + 1,
                        'Comp No': stu.id,
                        'Name': stu.name,
                        'Class': allHodsonsClasses[stu.id] || '—',
                        'House': stu.house,
                        'Category': stu.category
                    }));

                if (competitorRows.length > 0) {
                    const ws = XLSX.utils.json_to_sheet(competitorRows);
                    XLSX.utils.book_append_sheet(wb, ws, cat.slice(0, 31));
                }
            });

            const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            downloadBlob(blob, `Hodsons 2026 All Competitors ${timestamp}.xlsx`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadAllCompetitorsDocx = async () => {
        try {
            setIsDownloading(true);
            const timestamp = new Date().toISOString().slice(0, 10);

            const sections = CATEGORIES_LIST.map(cat => {
                const students = allHodsonsStudents.filter(s => s.category === cat);
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: ['SN', 'Comp No', 'Name', 'Class', 'House'].map(h => new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                                shading: { fill: 'EEEEEE', type: ShadingType.CLEAR }
                            }))
                        }),
                        ...students.map((s, idx) => new TableRow({
                            children: [String(idx + 1), s.id, s.name, allHodsonsClasses[s.id] || '—', s.house].map(v => new TableCell({
                                children: [new Paragraph(String(v))]
                            }))
                        }))
                    ]
                });

                return [
                    new Paragraph({ children: [new TextRun({ text: cat, bold: true, size: 28 })], spacing: { before: 400, after: 200 } }),
                    table
                ];
            }).flat();

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ children: [new TextRun({ text: "HODSON'S RUN 2026 - COMPETITOR LIST", bold: true, size: 36 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        ...sections
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            downloadBlob(blob, `Hodsons 2026 Competitor List ${timestamp}.docx`);
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

            const rows = allHodsonsStudents
                .filter(s => s.category === category)
                .filter(s => filterHouse === 'All' || s.house === filterHouse)
                .map((stu, idx) => {
                    const res = results.find(r => r.studentId === stu.id) || { studentId: stu.id, preQualifyingType: 'pending', preFinalsType: 'pending', qualifyingType: 'pending', finalsType: 'pending', position: undefined, timing: undefined };

                    const preQualOk = res.preQualifyingType === 'participating';
                    const qualifiedForPreFinals = qualifiesForFinals(res.qualifyingType, skipsQualifying);
                    const preFinalsOk = skipsQualifying || res.preFinalsType === 'participating';

                    if (stage === 'qualifying' && !preQualOk) return null;
                    if (stage === 'pre_finals' && !qualifiedForPreFinals) return null;
                    if (stage === 'finals' && (!qualifiedForPreFinals || !preFinalsOk)) return null;

                    if (stage === 'pre_qualifying') {
                        return {
                            SN: idx + 1,
                            'Comp No': stu.id,
                            'Player Name': stu.name,
                            'Class': allHodsonsClasses[stu.id] || '—',
                            House: stu.house,
                            Status: getStageExportStatus(res, 'pre_qualifying')
                        };
                    }

                    if (stage === 'pre_finals') {
                        return {
                            SN: idx + 1,
                            'Comp No': stu.id,
                            'Player Name': stu.name,
                            'Class': allHodsonsClasses[stu.id] || '—',
                            House: stu.house,
                            Status: getStageExportStatus(res, 'pre_finals', skipsQualifying)
                        };
                    }

                    if (stage === 'qualifying') {
                        return {
                            SN: idx + 1,
                            'Comp No': stu.id,
                            'Player Name': stu.name,
                            'Class': allHodsonsClasses[stu.id] || '—',
                            House: stu.house,
                            Status: getStageExportStatus(res, 'qualifying'),
                            Timing: res.qualifyingTiming || '—'
                        };
                    }

                    return {
                        SN: idx + 1,
                        'Comp No': stu.id,
                        'Player Name': stu.name,
                        'Class': allHodsonsClasses[stu.id] || '—',
                        House: stu.house,
                        Status: getStageExportStatus(res, 'finals'),
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
                stage === 'pre_qualifying' || stage === 'pre_finals' ? ['SN', 'Comp No', 'Player Name', 'Class', 'House', 'Status']
                    : stage === 'qualifying' ? ['SN', 'Comp No', 'Player Name', 'Class', 'House', 'Status', 'Timing']
                        : ['SN', 'Comp No', 'Player Name', 'Class', 'House', 'Status', 'Position', 'Timing']
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

    const downloadCategoryCompetitorsXlsx = (category: string) => {
        try {
            setIsDownloading(true);
            const timestamp = new Date().toISOString().slice(0, 10);
            const qualifyingPositions = getCategoryStagePositions(category, 'qualifying');
            const finalsPositions = getCategoryStagePositions(category, 'finals');

            const rows = allHodsonsStudents
                .filter(s => s.category === category)
                .map((stu, idx) => {
                    const r = results.find(res => res.studentId === stu.id) || {
                        studentId: stu.id,
                        preQualifyingType: 'pending',
                        preFinalsType: 'pending',
                        qualifyingType: 'pending',
                        finalsType: 'pending'
                    };
                    const qualPos = qualifyingPositions.get(stu.id) ?? r.qualifyingPosition;
                    const finalsPos = finalsPositions.get(stu.id) ?? r.finalsPosition;

                    return {
                        'SN': idx + 1,
                        'Comp No': stu.id,
                        'Athlete Name': stu.name,
                        'Class': allHodsonsClasses[stu.id] || '—',
                        'House': stu.house,
                        'Qualifying Status': getStageExportStatus(r, 'qualifying'),
                        'Qualifying Time': r.qualifyingTiming || '—',
                        'Qualifying Rank': qualPos ? `#${qualPos}` : '—',
                        'Finals Status': getStageExportStatus(r, 'finals'),
                        'Finals Time': r.finalsTiming || '—',
                        'Finals Rank': finalsPos ? `#${finalsPos}` : '—'
                    };
                });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Competitors');
            const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            downloadBlob(blob, `Hodsons 2026 ${category} Competitors ${timestamp}.xlsx`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadCategoryCompetitorsDocx = async (category: string) => {
        try {
            setIsDownloading(true);
            const timestamp = new Date().toISOString().slice(0, 10);
            const qualifyingPositions = getCategoryStagePositions(category, 'qualifying');
            const finalsPositions = getCategoryStagePositions(category, 'finals');

            const students = allHodsonsStudents.filter(s => s.category === category);
            const table = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: ['SN', 'ID', 'Athlete Name', 'Class', 'House', 'Qualifying', 'Finals'].map(h => new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
                            shading: { fill: 'EEEEEE', type: ShadingType.CLEAR }
                        }))
                    }),
                    ...students.map((stu, idx) => {
                        const r = results.find(res => res.studentId === stu.id) || { studentId: stu.id, qualifyingType: 'pending', finalsType: 'pending' };
                        const qualPos = qualifyingPositions.get(stu.id) ?? r.qualifyingPosition;
                        const finalsPos = finalsPositions.get(stu.id) ?? r.finalsPosition;

                        const qualCell = `${getStageExportStatus(r, 'qualifying')}\nTime: ${r.qualifyingTiming || '—'}\nRank: ${qualPos ? '#' + qualPos : '—'}`;
                        const finalsCell = `${getStageExportStatus(r, 'finals')}\nTime: ${r.finalsTiming || '—'}\nRank: ${finalsPos ? '#' + finalsPos : '—'}`;

                        return new TableRow({
                            children: [
                                String(idx + 1),
                                stu.id,
                                stu.name,
                                allHodsonsClasses[stu.id] || '—',
                                stu.house,
                                qualCell,
                                finalsCell
                            ].map(v => new TableCell({
                                children: v.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 16 })] }))
                            }))
                        });
                    })
                ]
            });

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ children: [new TextRun({ text: `HODSON'S RUN 2026 - ${category.toUpperCase()}`, bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        new Paragraph({ children: [new TextRun({ text: "COMPETITOR LIST & RESULTS", bold: true, size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        table
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            downloadBlob(blob, `Hodsons 2026 ${category} Competitors ${timestamp}.docx`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="max-w-[1440px] mx-auto w-full pb-20 px-4 relative">
            {isAutoSavingIndicator && (
                <div className="fixed top-6 right-6 z-[9999] bg-green-500/20 text-green-400 border border-green-500/30 px-5 py-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 shadow-xl backdrop-blur-md">
                    <Icon name="cloud_done" className="text-xl" />
                    <span className="font-bold text-sm tracking-wide uppercase">Auto-saved</span>
                </div>
            )}
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
                    {isLoggedIn && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-[#b38b33] text-[#091423] hover:text-[#06101b] font-bold rounded-2xl transition-all shadow-[0_18px_36px_rgba(201,163,74,0.26)] border border-primary/35 whitespace-nowrap ring-1 ring-primary/10"
                        >
                            <Icon name="edit_document" />
                            <span>Manage Results</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-8">
                <div className="mx-auto max-w-fit rounded-2xl border border-primary/15 bg-[#0b1322]/88 px-2 py-2 shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {[
                            { key: 'standings', label: 'Standings', icon: 'leaderboard' },
                            { key: 'results', label: 'Age Category Results', icon: 'category' },
                            { key: 'summary', label: 'Summary', icon: 'history_edu' }
                        ].map((tab) => {
                            const isActive = mainSectionTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setMainSectionTab(tab.key as 'standings' | 'results' | 'summary')}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${isActive ? 'bg-primary text-[#091423] shadow-[0_10px_24px_rgba(201,163,74,0.28)]' : 'text-slate-300 hover:bg-white/6 hover:text-white'}`}
                                >
                                    <Icon name={tab.icon} size="16" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isLoggedIn && lastSavedMeta && (
                <div className="mb-8 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
                    <Icon name="check_circle" size="18" className="text-emerald-300" />
                    <span className="font-bold">Last saved:</span>
                    <span>{lastSavedMeta.category}</span>
                    <span className="text-emerald-200/75">at {lastSavedMeta.savedAt}</span>
                </div>
            )}

            {mainSectionTab === 'standings' && (
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
            )}

            {mainSectionTab === 'results' && (
                <>
                    {/* Intricate Visual Divider */}
                    <div className="relative h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20 flex justify-center items-center">
                        <div className="absolute size-12 rounded-full border border-white/10 bg-[#0f172a] flex items-center justify-center shadow-2xl">
                            <div className="size-8 rounded-full bg-gradient-to-br from-[#f1d386] via-primary to-[#8d6b23] flex items-center justify-center animate-pulse">
                                <Icon name="expand_more" className="text-white text-xl" />
                            </div>
                        </div>
                        <div className="absolute -top-10 text-[80px] font-black text-white/[0.12] uppercase tracking-[20px] pointer-events-none select-none">
                            RESULTS
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/10">
                            <Icon name="category" size="22" />
                        </div>
                        <div>
                            <div className="royal-kicker mb-1">Championship Ledger</div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Category Results</h3>
                            <p className="text-sm text-slate-400">Podium standings and detailed metrics for each age group</p>
                        </div>
                        <span className="ml-auto px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest hidden md:inline">
                            Click cards for detailed stats
                        </span>
                    </div>

                    {(() => {
                        const activeDept = RESULTS_DEPARTMENTS.find(dept => dept.key === selectedResultsDept)!;
                        const visibleCategories = categoriesData.filter(cat => cat.name.startsWith(selectedResultsDept));

                        return (
                            <>
                                <div className="glass-panel section-plaque rounded-[32px] border border-primary/15 p-5 sm:p-6 mb-8 overflow-hidden relative">
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none"></div>
                                    <div className="absolute -top-8 -right-8 size-32 rounded-full bg-primary/10 blur-2xl pointer-events-none"></div>
                                    <div className="relative z-10 flex flex-col gap-5">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div>
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${activeDept.chip} ${activeDept.accent} text-[10px] font-black uppercase tracking-[0.25em] mb-3`}>
                                                    <Icon name={activeDept.icon} size="14" />
                                                    Department Navigation
                                                </div>
                                                <h4 className="text-white text-xl sm:text-2xl font-black tracking-tight">Browse Results By Department</h4>
                                                <p className="text-sm text-slate-400 mt-1">Switch between `BD`, `GD`, and `PD` to jump straight to the age-category cards you need.</p>
                                            </div>
                                            <div className="flex items-center gap-3 self-start lg:self-auto">
                                                <div className="royal-stat-card px-4 py-2 rounded-2xl shadow-[inset_0_1px_0_rgba(255,244,214,0.04)]">
                                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Showing</div>
                                                    <div className="text-white text-lg font-black">{visibleCategories.length} Categories</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {RESULTS_DEPARTMENTS.map(dept => {
                                                const deptCategories = categoriesData.filter(cat => cat.name.startsWith(dept.key));
                                                const isActive = dept.key === selectedResultsDept;

                                                return (
                                                    <button
                                                        key={dept.key}
                                                        onClick={() => setSelectedResultsDept(dept.key)}
                                                        className={`rounded-2xl border px-4 py-4 text-left transition-all group ${isActive ? dept.buttonActive : dept.buttonIdle}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className={`size-11 rounded-2xl flex items-center justify-center border ${dept.chip} ${isActive ? 'scale-105' : ''} transition-transform`}>
                                                                <Icon name={dept.icon} size="22" className={dept.accent} />
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                                {dept.shortLabel}
                                                            </span>
                                                        </div>
                                                        <div className={`text-base font-black mb-1 ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{dept.label}</div>
                                                        <div className="text-xs text-slate-400">{deptCategories.length} age categories</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 mb-6">
                                    <div>
                                        <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] ${activeDept.accent}`}>
                                            <Icon name={activeDept.icon} size="14" />
                                            {activeDept.shortLabel} Results
                                        </div>
                                        <h4 className="text-white text-xl font-black mt-2">{activeDept.label}</h4>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-primary/15 bg-primary/[0.06] text-xs font-bold uppercase tracking-widest text-[#f2e2b7]">
                                        <Icon name="touch_app" size="14" />
                                        Select a card to open deeper stats
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {visibleCategories.map((cat, idx) => (
                                        <div
                                            key={`${selectedResultsDept}-${idx}`}
                                            onClick={() => setSelectedCategoryStats(cat)}
                                            className="glass-panel rounded-[28px] p-6 relative overflow-hidden cursor-pointer border border-primary/12 hover:border-primary/35 focus:border-primary/40 transition-all hover:shadow-[0_24px_48px_rgba(0,0,0,0.32)] flex flex-col h-full group outline-none"
                                        >
                                            {(() => {
                                                const recordAlert = categoryRecordAlertMap[cat.name];
                                                return recordAlert ? (
                                                    <div className="absolute left-4 right-4 top-4 z-20 rounded-2xl border border-amber-300/35 bg-[linear-gradient(135deg,rgba(245,158,11,0.24),rgba(201,163,74,0.12))] px-4 py-3 shadow-[0_14px_30px_rgba(166,118,18,0.22)] backdrop-blur-sm">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 size-9 rounded-xl bg-amber-300/15 border border-amber-200/20 flex items-center justify-center text-amber-200">
                                                                <Icon name="workspace_premium" size="18" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-100/90">New Record</div>
                                                                <div className="text-sm font-black text-white leading-tight mt-1">
                                                                    {recordAlert.athleteName} clocked {recordAlert.currentTiming}
                                                                </div>
                                                                <div className="text-[11px] text-amber-100/80 mt-1">
                                                                    {recordAlert.marginLabel} than {recordAlert.recordTiming}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })()}
                                            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent pointer-events-none"></div>
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,163,74,0.10),transparent_34%)] opacity-80 pointer-events-none"></div>
                                            <div className="absolute top-4 right-4 text-primary/10 pointer-events-none group-hover:text-primary/20 transition-colors">
                                                <Icon name="directions_run" className="text-6xl" />
                                            </div>

                                            <div className={`relative z-10 border-b border-primary/10 pb-4 ${categoryRecordAlertMap[cat.name] ? 'pt-24 mb-5' : 'mb-6'}`}>
                                                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-primary/80 mb-2">Age Category Performance Cards</div>
                                                <h3 className="text-2xl font-black text-white uppercase tracking-wide group-hover:text-primary transition-colors">{cat.name}</h3>
                                                <p className="text-slate-400 text-sm mt-1">HODSON Podium and House Merit Snapshot</p>
                                            </div>

                                            {/* Podium Display */}
                                            <div className="flex items-end justify-center gap-0 lg:gap-2 h-[260px] mb-8 relative z-10 w-full max-w-[400px] mx-auto opacity-90 group-hover:opacity-100 transition-opacity">
                                                {[cat.top3[1], cat.top3[0], cat.top3[2]].map((player: any, i: number) => (
                                                    <PodiumStep
                                                        key={i}
                                                        player={player}
                                                        rank={player ? player.rank : (i === 0 ? 2 : i === 1 ? 1 : 3)}
                                                        isRecord={Boolean(
                                                            player &&
                                                            player.rank === 1 &&
                                                            categoryRecordAlertMap[cat.name]?.athleteName === player.name &&
                                                            categoryRecordAlertMap[cat.name]?.currentTiming === player.timing
                                                        )}
                                                    />
                                                ))}
                                            </div>

                                            <div className="flex flex-col gap-6 mb-8 mt-auto px-2 border-t border-primary/10 pt-6">
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(houseName => {
                                                        const house = cat.houseStats[houseName];
                                                        const cfg = houseConfig(houseName);
                                                        return (
                                                            <div key={houseName} className="text-center bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(201,163,74,0.02))] p-3 rounded-xl border border-primary/10 group-hover:border-primary/20 transition-colors">
                                                                <p className={`text-[8px] font-bold uppercase tracking-[0.2em] mb-1 ${cfg.text}`}>{houseName}</p>
                                                                <p className="text-xl font-black text-white">
                                                                    {house.points > 0 ? `+${house.points}` : house.points}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="flex items-center justify-between gap-4 py-3 px-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(201,163,74,0.03))] rounded-2xl border border-primary/10">
                                                    <div className="flex flex-col flex-1">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Pre-Qualifying Off-Rolls</span>
                                                            <Icon name="history" size="10" className="text-slate-600" />
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="size-1.5 rounded-full bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                                                                <span className="text-[10px] font-black text-slate-300">Medically Excused: <span className="text-amber-500">{cat.stats.preQualMedExcused + cat.stats.qualMedExcused}</span></span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="size-1.5 rounded-full bg-[#d6bd84]/70 shadow-[0_0_8px_rgba(214,189,132,0.32)]"></div>
                                                                <span className="text-[10px] font-black text-slate-300">LEAVE: <span className="text-[#e7cf96]">{cat.stats.preQualOnLeave}</span></span>
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
                                                                <span className="text-[10px] font-black text-slate-300">Medically Excused: <span className="text-amber-500">{cat.stats.preFinalsMedExcused + cat.stats.finalsMedExcused}</span></span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="size-1.5 rounded-full bg-[#d6bd84]/70 shadow-[0_0_8px_rgba(214,189,132,0.32)]"></div>
                                                                <span className="text-[10px] font-black text-slate-300">LEAVE: <span className="text-[#e7cf96]">{cat.stats.preFinalsOnLeave}</span></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        );
                    })()}
                </>
            )}
            {mainSectionTab === 'summary' && (
                <div className="glass-panel rounded-[32px] border border-white/10 overflow-hidden">
                    <AllResultsContent
                        categories={categoriesData}
                        newRecords={categoryRecordAlerts}
                        standings={standingsDetailsMap}
                        onDownload={downloadAllResultsDocx}
                        isDownloading={isDownloading}
                    />
                </div>
            )}
            {selectedCategoryStats && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedCategoryStats(null)}></div>
                    <div className="relative w-full max-w-6xl bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-primary/10 to-transparent">
                            <ModalHeader
                                kicker={`Hodson Run 2026 • ${selectedCategoryStats.name}`}
                                icon="analytics"
                                title={`${selectedCategoryStats.name} Insights`}
                                subtitle="Review qualifying trends, finals outcomes, and the full competitor ledger from one polished overview."
                                onClose={() => setSelectedCategoryStats(null)}
                                actions={categoryModalTab === 'list' ? (
                                    <div className="hidden sm:flex items-center gap-2 animate-in fade-in zoom-in-95 bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">Export</span>
                                        <button
                                            onClick={() => downloadCategoryCompetitorsXlsx(selectedCategoryStats.name)}
                                            disabled={isDownloading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                        >
                                            <Icon name="table_chart" size="16" /> .xlsx
                                        </button>
                                        <button
                                            onClick={() => downloadCategoryCompetitorsDocx(selectedCategoryStats.name)}
                                            disabled={isDownloading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 border border-primary/20"
                                        >
                                            <Icon name="description" size="16" /> .docx
                                        </button>
                                    </div>
                                ) : null}
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setCategoryModalTab('qualifying')} className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${categoryModalTab === 'qualifying' ? 'bg-primary text-[#091423] shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                        <Icon name="history" size="16" /> <span className="hidden sm:inline">1. </span>Qualifying Stats
                                    </button>
                                    <button onClick={() => setCategoryModalTab('finals')} className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${categoryModalTab === 'finals' ? 'bg-[linear-gradient(135deg,#f1d386,#c9a34a)] text-[#091423] shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                        <Icon name="emoji_events" size="16" /> <span className="hidden sm:inline">2. </span>Finals Results
                                    </button>
                                    <button onClick={() => setCategoryModalTab('race')} className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${categoryModalTab === 'race' ? 'bg-sky-500/15 text-sky-200 border border-sky-400/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                        <Icon name="route" size="16" /> Race Info
                                    </button>
                                    <button onClick={() => setCategoryModalTab('list')} className={`px-4 sm:px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${categoryModalTab === 'list' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                        <Icon name="format_list_bulleted" size="16" /> Competitor List
                                    </button>
                                </div>

                                {categoryModalTab === 'list' && (
                                    <div className="flex sm:hidden items-center gap-2 animate-in fade-in zoom-in-95 bg-white/5 p-1.5 rounded-xl border border-white/10 w-full justify-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Export:</span>
                                        <button
                                            onClick={() => downloadCategoryCompetitorsXlsx(selectedCategoryStats.name)}
                                            disabled={isDownloading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                                        >
                                            <Icon name="table_chart" size="14" /> .xlsx
                                        </button>
                                        <button
                                            onClick={() => downloadCategoryCompetitorsDocx(selectedCategoryStats.name)}
                                            disabled={isDownloading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                                        >
                                            <Icon name="description" size="14" /> .docx
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
                            {categoryModalTab === 'qualifying' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Overall Category Summary */}
                                    <div className="glass-panel section-plaque p-6 border border-white/10 rounded-3xl mb-4">
                                        <div className="flex items-center gap-2 mb-5">
                                            <Icon name="analytics" size="18" className="text-primary" />
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Qualifying Stage Summary</span>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
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
                                            <div className="bg-white/[0.04] rounded-xl p-4 border border-sky-500/10 hover:border-sky-500/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-sky-500/10 flex items-center justify-center"><Icon name="stars" size="14" className="text-sky-300" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Bonus</span>
                                                </div>
                                                <span className="text-sky-300 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.bonusQual, 0)}
                                                </span>
                                            </div>
                                            <div className="royal-stat-card rounded-xl p-4 border border-primary/10 hover:border-primary/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center"><Icon name="check_circle" size="14" className="text-primary" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Finished</span>
                                                </div>
                                                <span className="text-primary text-2xl font-black">
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
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Medically Excused</span>
                                                </div>
                                                <span className="text-slate-300 text-2xl font-black">
                                                    {Object.values(selectedCategoryStats.houseStats).reduce((acc: number, h: any) => acc + h.medExcused + h.preQualMedExcused + (h.medExcusedFinals || 0) + (h.preFinalsMedExcused || 0), 0)}
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
                                                            <span className="text-green-400 font-black text-lg">{h.qual + h.bonusQual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Bonus Entries</span>
                                                            <span className="text-sky-300 font-black">{h.bonusQual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">DNF</span>
                                                            <span className="text-slate-300 font-black">{h.dnfQual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-400">Finished</span>
                                                            <span className="text-primary font-black">{h.finishedQual}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] italic border-t border-white/5 pt-3">
                                                            <span className="text-slate-500">Medically Excused: <span className="text-slate-300 font-bold">{h.preQualMedExcused + h.medExcused}</span></span>
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
                                        <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                    <Icon name="bar_chart" size="20" />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-base leading-tight">House Participation Comparison</h4>
                                                    <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">Enrolled vs Participated vs Qualified</p>
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
                                                        Bonus: hs[h].bonusQual,
                                                        Finished: hs[h].finishedQual,
                                                        DNF: hs[h].dnfQual
                                                    }));
                                                    return (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={compData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} horizontal={false} />
                                                                <XAxis type="number" tick={chartTickStyle} axisLine={false} tickLine={false} />
                                                                <YAxis dataKey="name" type="category" tick={chartYAxisStyle} axisLine={false} tickLine={false} width={84} />
                                                                <Tooltip cursor={{ fill: 'rgba(201,163,74,0.06)' }} contentStyle={chartTooltipStyle} itemStyle={{ color: '#fff7e4', fontWeight: 'bold', fontSize: '12px' }} />
                                                                <Bar dataKey="Enrolled" fill="#6f7c90" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="Participated" fill="#3a7f5d" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="Qualified" fill="#c9a34a" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="Bonus" fill="#7dd3fc" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="Finished" fill="#e8cf93" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Bar dataKey="DNF" fill="#9c7a47" radius={[0, 4, 4, 0]} barSize={10} animationDuration={800} />
                                                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} formatter={chartLegendFormatter} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Row 2: Two Donut Charts */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Donut Pie Chart - Student Status Distribution */}
                                            <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                        <Icon name="donut_large" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Student Status Distribution</h4>
                                                        <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">Qualifying Stage Overview</p>
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
                                                            { name: 'Participated', value: totalParticipated, color: '#3a7f5d' },
                                                            { name: 'Absent', value: totalAbsent, color: '#ef4444' },
                                                            { name: 'Medically Excused', value: totalMedExcused, color: '#8f9aae' },
                                                            { name: 'On Leave', value: totalOnLeave, color: '#c9a34a' },
                                                            { name: 'Pending', value: totalPending > 0 ? totalPending : 0, color: '#415065' }
                                                        ].filter(d => d.value > 0);
                                                        return (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" animationDuration={800} stroke="none" labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                                        {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                                    </Pie>
                                                                    <Tooltip contentStyle={{ ...chartTooltipStyle, fontSize: '13px' }} itemStyle={{ color: '#fff7e4' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#c7d2e0', paddingTop: '15px' }} formatter={chartLegendFormatter} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Donut Pie Chart - Enrollment by House */}
                                            <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="size-9 rounded-lg bg-white/10 flex items-center justify-center text-white shadow-inner">
                                                        <Icon name="school" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Enrollment by House</h4>
                                                        <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">Total Enrolled Distribution</p>
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
                                                                    <Tooltip contentStyle={{ ...chartTooltipStyle, fontSize: '13px' }} itemStyle={{ color: '#fff7e4' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#c7d2e0', paddingTop: '15px' }} formatter={chartLegendFormatter} />
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
                                    <div className="glass-panel section-plaque p-6 border border-primary/10 rounded-3xl mb-4">
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
                                            <div className="royal-stat-card rounded-xl p-4 border border-primary/10 hover:border-primary/20 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center"><Icon name="check_circle" size="14" className="text-primary" /></div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Finished</span>
                                                </div>
                                                <span className="text-primary text-2xl font-black">
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
                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Medically Excused</span>
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
                                                        <div className="flex justify-between items-center text-sm gap-2">
                                                            <span className="text-slate-400 truncate">Progressed To Finals</span>
                                                            <span className="text-white font-black shrink-0">{h.qualFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm gap-2">
                                                            <span className="text-slate-400 truncate">Total Qualified</span>
                                                            <span className="text-white font-black shrink-0">{h.qualPosFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm gap-2">
                                                            <span className="text-slate-400 truncate">Total Finishers</span>
                                                            <span className="text-white font-black shrink-0">{h.finishedFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm gap-2">
                                                            <span className="text-slate-400 truncate">Finals Absentees</span>
                                                            <span className="text-slate-500 font-black shrink-0">{h.absentFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm gap-2">
                                                            <span className="text-slate-400 truncate">Finals DNF</span>
                                                            <span className="text-slate-500 font-black shrink-0">{h.dnfFinals}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] italic border-t border-white/5 pt-3 gap-2">
                                                            <span className="text-slate-500 truncate">Medically Excused: <span className="text-slate-300 font-bold">{h.preFinalsMedExcused + h.medExcusedFinals}</span></span>
                                                            <span className="text-slate-500 truncate">Pre-F Leave: <span className="text-slate-300 font-bold">{h.preFinalsOnLeave}</span></span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
                                                            <div className="flex justify-between items-baseline mb-1 gap-2">
                                                                <span className="text-slate-400 font-bold text-xs uppercase truncate">Total Points</span>
                                                                <span className={`font-black text-2xl shrink-0 ${h.points > 0 ? 'text-amber-400' : h.points < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                                    {h.points > 0 ? `+${h.points}` : h.points}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-1 px-1">
                                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest gap-2">
                                                                    <span className="truncate">Qualifying Breakdown</span>
                                                                    <span className="text-slate-400 shrink-0">{h.qualifyingPoints} pts</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[9px] font-black text-amber-500/80 uppercase tracking-widest border-t border-white/5 pt-1 gap-2">
                                                                    <span className="truncate">Finals Breakdown</span>
                                                                    <span className="text-amber-400 shrink-0">{h.finalsPoints} pts</span>
                                                                </div>
                                                                <p className="text-[8px] text-slate-600 font-medium italic text-right leading-tight truncate">
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
                                        <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-amber-500/5">
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-full bg-amber-500 flex items-center justify-center text-black shrink-0">
                                                        <Icon name="military_tech" size="32" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-amber-400 font-bold uppercase text-xs tracking-widest whitespace-nowrap">Category Champion</h4>
                                                        <p className="text-white text-xl font-black truncate">{selectedCategoryStats.bestTiming.name} <span className="text-slate-500 font-normal whitespace-nowrap">({selectedCategoryStats.bestTiming.house})</span></p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap">Winning Timing</h4>
                                                    <p className="text-amber-400 text-3xl font-mono font-black tabular-nums">{selectedCategoryStats.bestTiming.timing}</p>
                                                </div>
                                            </div>
                                            {getCategoryRecordAlert(selectedCategoryStats) && (
                                                <div className="mt-4 rounded-2xl border border-amber-300/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(201,163,74,0.08))] px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-xl bg-amber-300/15 border border-amber-200/20 flex items-center justify-center text-amber-200">
                                                            <Icon name="workspace_premium" size="18" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/90">New Official Record</div>
                                                            <div className="text-white font-bold text-sm">
                                                                {getCategoryRecordAlert(selectedCategoryStats)?.currentTiming} beats {getCategoryRecordAlert(selectedCategoryStats)?.recordTiming} by {getCategoryRecordAlert(selectedCategoryStats)?.marginLabel}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Finals Charts Section */}
                                    <div className="space-y-6">
                                        {/* Row 1: Large Bar Chart */}
                                        <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-inner">
                                                    <Icon name="stacked_bar_chart" size="20" />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-base leading-tight">Finals Status Breakdown</h4>
                                                    <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">Finishers vs non-participants per house</p>
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
                                                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} horizontal={false} />
                                                                <XAxis type="number" tick={chartTickStyle} axisLine={false} tickLine={false} />
                                                                <YAxis dataKey="name" type="category" tick={chartYAxisStyle} axisLine={false} tickLine={false} width={84} />
                                                                <Tooltip cursor={{ fill: 'rgba(201,163,74,0.06)' }} contentStyle={chartTooltipStyle} itemStyle={{ color: '#fff7e4', fontWeight: 'bold', fontSize: '12px' }} />
                                                                <Bar dataKey="Finishers" stackId="a" fill="#3a7f5d" radius={[0, 0, 0, 0]} barSize={25} animationDuration={800} />
                                                                <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} barSize={25} animationDuration={800} />
                                                                <Bar dataKey="Med. Excused" stackId="a" fill="#8f9aae" radius={[0, 0, 0, 0]} barSize={25} animationDuration={800} />
                                                                <Bar dataKey="On Leave" stackId="a" fill="#c9a34a" radius={[0, 4, 4, 0]} barSize={25} animationDuration={800} />
                                                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} formatter={chartLegendFormatter} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Row 2: Two Donut Charts */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Donut Pie Chart - Points Distribution by House */}
                                            <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-inner">
                                                        <Icon name="donut_large" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Points Distribution</h4>
                                                        <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">House-wise contribution to total points</p>
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
                                                                    <Tooltip contentStyle={{ ...chartTooltipStyle, fontSize: '13px' }} itemStyle={{ color: '#fff7e4' }} formatter={(value: number, name: string) => [`${value} pts`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#c7d2e0', paddingTop: '15px' }} formatter={chartLegendFormatter} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Donut Pie Chart - Enrollment by House */}
                                            <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shadow-inner">
                                                        <Icon name="check_circle" size="20" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-base leading-tight">Moved to Finals</h4>
                                                        <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">Qualified student distribution</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-[320px]">
                                                    {(() => {
                                                        const hs = selectedCategoryStats.houseStats;
                                                        const qualData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik']
                                                            .map(h => ({ name: h, value: hs[h as any].qual + hs[h as any].bonusQual, color: HOUSE_COLORS[h.toLowerCase() as keyof typeof HOUSE_COLORS].hex }))
                                                            .filter(d => d.value > 0);
                                                        if (qualData.length === 0) return <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">No qualifications yet</div>;
                                                        return (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie data={qualData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" animationDuration={800} stroke="none" labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                                        {qualData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                                    </Pie>
                                                                    <Tooltip contentStyle={{ ...chartTooltipStyle, fontSize: '13px' }} itemStyle={{ color: '#fff7e4' }} formatter={(value: number, name: string) => [`${value} qualified students`, name]} />
                                                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#c7d2e0', paddingTop: '15px' }} formatter={chartLegendFormatter} />
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

                            {categoryModalTab === 'race' && selectedCategoryStats && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {(() => {
                                        const raceInfo = HODSONS_RACE_INFO[selectedCategoryStats.name];
                                        return (
                                            <>
                                                <div className="glass-panel section-plaque p-6 border border-white/10 rounded-3xl">
                                                    <div className="flex items-center gap-2 mb-5">
                                                        <Icon name="route" size="18" className="text-sky-300" />
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Official Race Specifications</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                                        <div className="royal-stat-card rounded-2xl p-5 border border-primary/10">
                                                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/75 mb-2">Division</div>
                                                            <div className="text-white font-black text-xl">{raceInfo.division}</div>
                                                            <div className="text-xs text-slate-500 mt-1">{raceInfo.ageGroup}</div>
                                                        </div>
                                                        <div className="royal-stat-card rounded-2xl p-5 border border-primary/10">
                                                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/75 mb-2">Distance</div>
                                                            <div className="text-white font-black text-xl">{raceInfo.distanceKm} km</div>
                                                            <div className="text-xs text-slate-500 mt-1">Traditional route format</div>
                                                        </div>
                                                        <div className="royal-stat-card rounded-2xl p-5 border border-sky-500/10">
                                                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/80 mb-2">Qualifying Window</div>
                                                            <div className="text-sky-300 font-black text-lg">{formatRaceInfoLabel(raceInfo.qualifyingTiming)}</div>
                                                            <div className="text-xs text-slate-500 mt-1">Bonus until {formatRaceInfoLabel(raceInfo.bonusTiming)}</div>
                                                        </div>
                                                        <div className="royal-stat-card rounded-2xl p-5 border border-green-500/10">
                                                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-green-400/80 mb-2">Finished Window</div>
                                                            <div className="text-green-400 font-black text-lg">{formatRaceInfoLabel(raceInfo.finishedTiming)}</div>
                                                            <div className="text-xs text-slate-500 mt-1">After this, status becomes DNF</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                                                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                                <Icon name="map" size="20" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-white font-black text-lg">Route Details</h4>
                                                                <p className="text-xs royal-subtitle uppercase tracking-[0.18em]">Traditional course reference</p>
                                                            </div>
                                                        </div>
                                                        <div className="rounded-2xl border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(201,163,74,0.03))] px-5 py-6">
                                                            <div className="text-2xl font-black text-white">{raceInfo.route}</div>
                                                            <p className="text-sm text-slate-400 mt-3 leading-relaxed">

                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="glass-panel p-6 rounded-2xl border border-amber-500/15 bg-amber-500/5">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                                                                <Icon name="military_tech" size="20" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-white font-black text-lg">Record Details</h4>
                                                                <p className="text-xs royal-subtitle uppercase tracking-[0.18em]">Best known category mark</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400/80 mb-1">Record Timing</div>
                                                                <div className="text-3xl font-black text-white">{raceInfo.recordTiming} min</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Record Holder</div>
                                                                <div className="text-white font-bold">{raceInfo.recordHolder}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Year</div>
                                                                <div className="text-slate-300 font-bold">{raceInfo.recordYear}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {categoryModalTab === 'list' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {(() => {
                                        const qualifyingPositions = getCategoryStagePositions(selectedCategoryStats.name, 'qualifying');
                                        const finalsPositions = getCategoryStagePositions(selectedCategoryStats.name, 'finals');

                                        return (
                                            <div className="glass-panel overflow-hidden border border-primary/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(201,163,74,0.02))] rounded-[28px] shadow-[0_20px_44px_rgba(0,0,0,0.26)]">
                                                <table className="royal-data-table min-w-[44rem]">
                                                    <thead>
                                                        <tr>
                                                            <th>SN</th>
                                                            <th className="cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'id' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('id'); }}>
                                                                <div className="flex items-center gap-1">Computer No {listSortField === 'id' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                            </th>
                                                            <th className="cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'name' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('name'); }}>
                                                                <div className="flex items-center gap-1">Athlete Name {listSortField === 'name' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                            </th>
                                                            <th className="royal-col-secondary cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'house' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('house'); }}>
                                                                <div className="flex items-center gap-1">House {listSortField === 'house' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                            </th>
                                                            <th className="royal-col-secondary cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'class' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('class'); }}>
                                                                <div className="flex items-center gap-1">Class {listSortField === 'class' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                            </th>
                                                            <th>Qualifying</th>
                                                            <th className="royal-col-optional">Finals</th>
                                                            <th className="text-right cursor-pointer hover:text-white transition-colors" onClick={() => { setListSortOrder(listSortField === 'performance' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('performance'); }}>
                                                                <div className="flex items-center justify-end gap-1">Result {listSortField === 'performance' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-primary/10">
                                                        {allHodsonsStudents
                                                            .filter(s => s.category === selectedCategoryStats.name)
                                                            .filter(s => {
                                                                const res = results.find(r => r.studentId === s.id);
                                                                if (!res) return true;
                                                                return res.preQualifyingType !== 'left_school' && res.qualifyingType !== 'left_school' && res.preFinalsType !== 'left_school' && res.finalsType !== 'left_school';
                                                            })
                                                            .sort((a, b) => {
                                                                const factor = listSortOrder === 'asc' ? 1 : -1;

                                                                if (listSortField === 'performance') {
                                                                    const resA = results.find(r => r.studentId === a.id);
                                                                    const resB = results.find(r => r.studentId === b.id);

                                                                    // Helper to calculate a rank score
                                                                    const getScore = (res: any, stuId: string) => {
                                                                        if (!res) return Infinity;
                                                                        const sType = res.finalsType === 'pending' || res.finalsType === 'participating' ? res.qualifyingType : res.finalsType;
                                                                        const fPos = finalsPositions.get(stuId) ?? res.finalsPosition;
                                                                        if (fPos) return fPos; // Ranks 1, 2, 3...
                                                                        if (sType === 'qualified_pos' || sType === 'qualified' || sType === 'finisher') return 1000;
                                                                        if (sType === 'pending' || sType === 'participating') return 2000;
                                                                        return 3000; // DNF, Absent, Excused, Leave
                                                                    };

                                                                    const scoreA = getScore(resA, a.id);
                                                                    const scoreB = getScore(resB, b.id);

                                                                    if (scoreA !== scoreB) return factor * (scoreA - scoreB);

                                                                    // If scores are tied and they have timings, compare timings string-wise
                                                                    const timeA = resA?.finalsTiming || resA?.qualifyingTiming || '99:99:99';
                                                                    const timeB = resB?.finalsTiming || resB?.qualifyingTiming || '99:99:99';
                                                                    if (timeA !== timeB) return factor * timeA.localeCompare(timeB);
                                                                }

                                                                if (listSortField === 'house') return factor * a.house.localeCompare(b.house);
                                                                if (listSortField === 'class') return factor * ((allHodsonsClasses[a.id] || '—').localeCompare(allHodsonsClasses[b.id] || '—'));
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
                                                                    <tr key={stu.id} className="hover:bg-primary/[0.05] transition-colors group">
                                                                        <td className="font-mono text-xs text-slate-500">{idx + 1}</td>
                                                                        <td className="font-mono text-xs text-[#d4d9e2]">{stu.id}</td>
                                                                        <td className="font-bold text-[#f8f1de] text-base">{stu.name}</td>
                                                                        <td className="royal-col-secondary">
                                                                            <span className={`inline-flex items-center gap-1.5 font-black ${hInfo.text} text-[10px] uppercase border ${hInfo.border}/20 px-2 py-0.5 rounded bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]`}>
                                                                                {stu.house}
                                                                            </span>
                                                                        </td>
                                                                        <td className="royal-col-secondary">
                                                                            <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.035] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                                                                                {allHodsonsClasses[stu.id] || '—'}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            <div className="flex flex-col">
                                                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${r.qualifyingType === 'qualified' ? 'text-primary' : r.qualifyingType === 'bonus' ? 'text-sky-300' : 'text-slate-500'}`}>
                                                                                    {r.qualifyingType.replace('_', ' ')}
                                                                                </span>
                                                                                {r.preQualifyingType !== 'participating' && r.preQualifyingType !== 'pending' && (
                                                                                    <span className="text-[8px] font-black text-amber-500/80 uppercase">{r.preQualifyingType.replace('_', ' ')}</span>
                                                                                )}
                                                                                {r.qualifyingTiming && <span className="text-[10px] font-mono text-slate-400">Time: {r.qualifyingTiming}</span>}
                                                                                {liveQualifyingPosition && <span className="text-[9px] font-black text-[#d8be80]">Rank: #{liveQualifyingPosition}</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td className="royal-col-optional">
                                                                            <div className="flex flex-col">
                                                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${r.finalsType === 'qualified_pos' || r.finalsType === 'finisher' ? 'text-amber-400' : 'text-slate-500'}`}>
                                                                                    {r.finalsType.replace('_', ' ')}
                                                                                </span>
                                                                                {r.preFinalsType !== 'participating' && r.preFinalsType !== 'pending' && (
                                                                                    <span className="text-[8px] font-black text-amber-500/80 uppercase">{r.preFinalsType.replace('_', ' ')}</span>
                                                                                )}
                                                                                {r.finalsTiming && <span className="text-[10px] font-mono text-slate-400">Time: {r.finalsTiming}</span>}
                                                                                {liveFinalsPosition && <span className="text-[9px] font-black text-[#d8be80]">Rank: #{liveFinalsPosition}</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td className="text-right">
                                                                            {liveFinalsPosition && <span className="font-black text-primary text-lg mr-2 italic">#{liveFinalsPosition}</span>}
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
                            <div className="glass-panel section-plaque p-6 border border-white/10 rounded-3xl mb-8">
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
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-sky-500/10 hover:border-sky-500/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-sky-500/10 flex items-center justify-center"><Icon name="stars" size="14" className="text-sky-300" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Bonus</span>
                                        </div>
                                        <span className="text-sky-300 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.bonusQualified}</span>
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
                                    <div className="royal-stat-card rounded-xl p-4 border border-primary/10 hover:border-primary/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center"><Icon name="check_circle" size="14" className="text-primary" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">Finished</span>
                                        </div>
                                        <span className="text-primary text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.finishedCount}</span>
                                    </div>
                                    <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-white/5 flex items-center justify-center"><Icon name="history" size="14" className="text-slate-300" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">DNF</span>
                                        </div>
                                        <span className="text-slate-300 text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.dnfCount}</span>
                                    </div>
                                    <div className="royal-stat-card rounded-xl p-4 border border-primary/10 hover:border-primary/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center"><Icon name="flight_takeoff" size="14" className="text-primary" /></div>
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wide leading-tight">On Leave</span>
                                        </div>
                                        <span className="text-primary text-[1.75rem] leading-none font-black">{selectedStandingsStats.stats.onLeave}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Breakdown Stacked Bar Chart */}
                            <div className="mb-12 glass-panel royal-chart-panel p-6 rounded-2xl">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Icon name="stacked_bar_chart" size="20" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg leading-tight">Category Breakdown</h4>
                                            <p className="text-xs royal-subtitle">Points distribution clustered by category</p>
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
                                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                                            <XAxis dataKey="name" tick={chartTickStyle} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#f8f1de', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(201,163,74,0.06)' }}
                                                contentStyle={chartTooltipStyle}
                                                itemStyle={{ color: '#fff7e4', fontWeight: 'bold', fontSize: '13px' }}
                                                labelStyle={{ color: '#c7d2e0', fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid rgba(201,163,74,0.12)', paddingBottom: '4px' }}
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
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5">
                                                <span>Bonus Qualifier</span>
                                                <span className="text-sky-300 font-bold">0 pts / Finals access</span>
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
                                                <span title="1st gets 20, 2nd gets 19, continuing down to 15th = 6, after which everyone gets 5">Position Score</span>
                                                <span className="text-amber-400 font-bold">5 Base + 15..1</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-white/[0.03] p-2 rounded border border-white/5">
                                                <span>Finisher</span>
                                                <span className="text-green-400 font-bold">+1 pt</span>
                                            </li>
                                            <li className="flex justify-between items-center bg-[linear-gradient(135deg,rgba(245,158,11,0.1),rgba(255,255,255,0.02))] p-2 rounded border border-amber-500/20">
                                                <span title="Awarded to the house whose student breaks the category record" className="flex items-center gap-1.5"><Icon name="workspace_premium" size="14" className="text-amber-400" /> Record Breaker</span>
                                                <span className="text-amber-400 font-bold">+3 pts</span>
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
                            <div className="mb-12 glass-panel royal-table-shell overflow-hidden rounded-3xl bg-black/20 shadow-2xl">
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
                                <div className="overflow-auto custom-scrollbar max-h-[420px]">
                                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                                        <thead>
                                            <tr className="royal-table-head text-[10px] font-black uppercase tracking-widest">
                                                <th className="sticky top-0 z-10 px-6 py-5 border-r border-white/5 royal-table-head">Age Category</th>
                                                {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => (
                                                    <th key={h} className="sticky top-0 z-10 px-6 py-5 text-center border-r border-white/5 last:border-0 royal-table-head">{h}</th>
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
                                <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Icon name="bar_chart" size="20" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-base leading-tight">House Performance Comparison</h4>
                                            <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">All metrics by house</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-[350px]">
                                        {(() => {
                                            const hs = selectedStandingsStats.houseStats;
                                            const compData = ['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => ({
                                                name: h,
                                                Participated: hs[h].part,
                                                Qualified: hs[h].qual,
                                                Bonus: hs[h].bonusQual,
                                                Finished: hs[h].finished,
                                                DNF: hs[h].dnf,
                                                Absent: hs[h].absent,
                                                'Med. Excused': hs[h].medExcused,
                                                'On Leave': hs[h].onLeave
                                            }));
                                            return (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={compData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} horizontal={false} />
                                                        <XAxis type="number" tick={chartTickStyle} axisLine={false} tickLine={false} />
                                                        <YAxis dataKey="name" type="category" tick={chartYAxisStyle} axisLine={false} tickLine={false} width={84} />
                                                        <Tooltip cursor={{ fill: 'rgba(201,163,74,0.06)' }} contentStyle={chartTooltipStyle} itemStyle={{ color: '#fff7e4', fontWeight: 'bold', fontSize: '12px' }} />
                                                        <Bar dataKey="Participated" fill="#3a7f5d" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Qualified" fill="#c9a34a" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Bonus" fill="#7dd3fc" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Finished" fill="#ecd8a6" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="DNF" fill="#9c7a47" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Absent" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="Med. Excused" fill="#8f9aae" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Bar dataKey="On Leave" fill="#e4c67d" radius={[0, 4, 4, 0]} barSize={12} animationDuration={800} />
                                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} formatter={chartLegendFormatter} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Row 2: Two Donut Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Donut Pie - Overall Student Status */}
                                    <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                <Icon name="donut_large" size="20" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-base leading-tight">Overall Student Status</h4>
                                                <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">Department-wide distribution</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-[300px]">
                                            {(() => {
                                                const s = selectedStandingsStats.stats;
                                                const pending = s.total - s.participants - s.absent - s.medExcused - s.onLeave;
                                                const pieData = [
                                                    { name: 'Participated', value: s.participants, color: '#3a7f5d' },
                                                    { name: 'Absent', value: s.absent, color: '#ef4444' },
                                                    { name: 'Med. Excused', value: s.medExcused, color: '#8f9aae' },
                                                    { name: 'On Leave', value: s.onLeave, color: '#c9a34a' },
                                                    { name: 'Pending', value: pending > 0 ? pending : 0, color: '#415065' }
                                                ].filter(d => d.value > 0);
                                                return (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" animationDuration={800} stroke="none">
                                                                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                                            </Pie>
                                                            <Tooltip contentStyle={{ ...chartTooltipStyle, fontSize: '13px' }} itemStyle={{ color: '#fff7e4' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#c7d2e0', paddingTop: '4px' }} formatter={chartLegendFormatter} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Donut Pie - Enrollment by House */}
                                    <div className="glass-panel royal-chart-panel p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="size-9 rounded-lg bg-white/10 flex items-center justify-center text-white shadow-inner">
                                                <Icon name="school" size="20" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-base leading-tight">Enrollment by House</h4>
                                                <p className="text-[11px] royal-subtitle uppercase tracking-[0.18em]">Total enrolled distribution</p>
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
                                                            <Tooltip contentStyle={{ ...chartTooltipStyle, fontSize: '13px' }} itemStyle={{ color: '#fff7e4' }} formatter={(value: number, name: string) => [`${value} students`, name]} />
                                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#c7d2e0', paddingTop: '15px' }} formatter={chartLegendFormatter} />
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

            {showAccessScopeModal && pendingCategoryAccess && createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={resetAccessFlow}></div>
                    <div className="relative w-full max-w-3xl bg-[#0f172a] rounded-2xl border border-primary/15 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 section-plaque">
                        <ModalHeader
                            compact
                            kicker="Access Scope"
                            icon="lock"
                            title="Choose List Access"
                            subtitle={`Select which list you want to open for ${pendingCategoryAccess}.`}
                            onClose={resetAccessFlow}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ACCESS_OPTIONS.map(option => {
                                const isFullAccess = option.scopeType === 'all';
                                const houseStyle = !isFullAccess ? houseConfig(option.key) : null;

                                return (
                                    <button
                                        key={option.key}
                                        onClick={() => {
                                            setSelectedAccessScope(option.key);
                                            setShowAccessScopeModal(false);
                                            setShowPasscodeModal(true);
                                            setPasscodeInput('');
                                            setPasscodeError(false);
                                        }}
                                        className={`glass-panel rounded-2xl border bg-white/[0.03] hover:bg-white/[0.05] transition-all text-left p-5 group overflow-hidden relative ${isFullAccess ? 'border-primary/20 hover:border-primary/30' : 'border-primary/10 hover:border-primary/20'}`}
                                    >
                                        <div className={`absolute inset-x-0 top-0 h-1 ${isFullAccess ? option.visual.topBarClass : houseStyle?.bg}`}></div>
                                        <div
                                            className="absolute -top-10 -right-10 size-28 rounded-full blur-3xl pointer-events-none opacity-20"
                                            style={{ backgroundColor: option.visual.glowHex }}
                                        ></div>

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-4">
                                                {isFullAccess ? (
                                                    <div className="flex items-center gap-1.5">
                                                        {['vindhya', 'himalaya', 'nilgiri', 'siwalik'].map((houseKey) => (
                                                            <span
                                                                key={houseKey}
                                                                className="size-3.5 rounded-full border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.08)]"
                                                                style={{ backgroundColor: HOUSE_COLORS[houseKey as keyof typeof HOUSE_COLORS].hex }}
                                                            ></span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className="size-11 rounded-2xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${houseStyle?.hex}33, ${houseStyle?.hex})`
                                                            }}
                                                        ></span>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${option.visual.accentClass}`}>{option.key}</span>
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.18em]">{option.visual.badgeLabel}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${isFullAccess ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                    {option.visual.badgeLabel}
                                                </span>
                                            </div>

                                            <div className="text-white font-black text-base">{option.label}</div>
                                            <div className="text-xs text-slate-400 mt-2 leading-relaxed">
                                                {option.allowedPhases.map(phase => phase.replace('_', ' ')).join(', ')} available after password unlock
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal for Passcode */}
            {showPasscodeModal && createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={resetAccessFlow}></div>
                    <div className="relative w-full max-w-sm bg-[#0f172a] rounded-2xl border border-primary/15 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 section-plaque">
                        <div className="flex flex-col items-center text-center">
                            <ModalHeader
                                compact
                                kicker="Protected Access"
                                icon="password"
                                title="Enter Passcode"
                                subtitle="Please enter the 4-digit passcode to access the selected list."
                                onClose={resetAccessFlow}
                            />
                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
                                <Icon name="lock" size="24" />
                            </div>
                            {selectedAccessScope && (
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-6">
                                    {selectedAccessScope === 'All' ? 'Full Houses Access' : `${selectedAccessScope} House Access`}
                                </p>
                            )}

                            <form onSubmit={handlePasscodeSubmit} className="w-full">
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={passcodeInput}
                                    onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(false); }}
                                    className={`w-full text-center text-4xl tracking-[0.5em] font-mono royal-input ${passcodeError ? 'border-red-500' : 'border-primary/15'} rounded-xl p-4 outline-none transition-colors mb-4`}
                                    placeholder="••••"
                                    autoFocus
                                />
                                {passcodeError && (
                                    <p className="text-red-400 text-xs font-bold mb-4 animate-in slide-in-from-top-1">Incorrect passcode.</p>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetAccessFlow}
                                        className="flex-1 py-3 royal-secondary-btn font-bold rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 royal-primary-btn font-bold rounded-xl"
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
                    <div className="relative w-full max-w-5xl h-[90vh] bg-[#0f172a] rounded-2xl border border-primary/15 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <ModalHeader
                            compact
                            kicker="Results Control"
                            icon="category"
                            title="Select Category To Edit Results"
                            subtitle="Choose a department first, then jump straight into the age category you want to manage."
                            onClose={() => setShowModal(false)}
                        />
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/5">
                            {(() => {
                                const activeDept = RESULTS_DEPARTMENTS.find(dept => dept.key === selectedAddResultsDept)!;
                                const visibleCategories = CATEGORIES_LIST.filter(cat => cat.startsWith(selectedAddResultsDept));

                                return (
                                    <>
                                        <div className="glass-panel section-plaque rounded-[32px] border border-white/10 p-5 sm:p-6 mb-8 overflow-hidden relative">
                                            <div className="absolute -top-10 -right-10 size-36 rounded-full bg-white/[0.03] blur-3xl pointer-events-none"></div>
                                            <div className="relative z-10 flex flex-col gap-5">
                                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                                    <div>
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${activeDept.chip} ${activeDept.accent} text-[10px] font-black uppercase tracking-[0.25em] mb-3`}>
                                                            <Icon name={activeDept.icon} size="14" />
                                                            Department Navigation
                                                        </div>
                                                        <h3 className="text-white text-xl sm:text-2xl font-black tracking-tight">Jump To The Right Results Group</h3>
                                                        <p className="text-sm text-slate-400 mt-1">Pick a department first, then choose the age category card you want to edit.</p>
                                                    </div>
                                                    <div className="royal-stat-card px-4 py-2 rounded-2xl self-start lg:self-auto">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Visible Now</div>
                                                        <div className="text-white text-lg font-black">{visibleCategories.length} Categories</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {RESULTS_DEPARTMENTS.map(dept => {
                                                        const deptCategories = CATEGORIES_LIST.filter(cat => cat.startsWith(dept.key));
                                                        const isActive = dept.key === selectedAddResultsDept;

                                                        return (
                                                            <button
                                                                key={dept.key}
                                                                onClick={() => setSelectedAddResultsDept(dept.key)}
                                                                className={`rounded-2xl border px-4 py-4 text-left transition-all group ${isActive ? dept.buttonActive : dept.buttonIdle}`}
                                                            >
                                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                                    <div className={`size-11 rounded-2xl flex items-center justify-center border ${dept.chip} ${isActive ? 'scale-105' : ''} transition-transform`}>
                                                                        <Icon name={dept.icon} size="22" className={dept.accent} />
                                                                    </div>
                                                                    <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                                        {dept.shortLabel}
                                                                    </span>
                                                                </div>
                                                                <div className={`text-base font-black mb-1 ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{dept.label}</div>
                                                                <div className="text-xs text-slate-400">{deptCategories.length} age categories</div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 mb-6">
                                            <div>
                                                <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] ${activeDept.accent}`}>
                                                    <Icon name={activeDept.icon} size="14" />
                                                    {activeDept.shortLabel} Categories
                                                </div>
                                                <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight mt-2">{activeDept.label}</h3>
                                            </div>
                                            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-primary/15 bg-primary/[0.05] text-xs font-bold uppercase tracking-widest text-[#f2e2b7]">
                                                <Icon name="edit_note" size="14" />
                                                Choose a category card to edit
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                            {visibleCategories.map(cat => (
                                                <div key={cat} className="glass-panel rounded-2xl p-5 border border-primary/10 hover:border-primary/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between shadow-lg hover:shadow-primary/5 relative overflow-hidden">
                                                    {categoryRecordAlertMap[cat as HodsonsCategory] && (
                                                        <div className="mb-4 rounded-2xl border border-amber-300/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(201,163,74,0.08))] px-3 py-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="size-8 rounded-xl bg-amber-300/15 border border-amber-200/20 flex items-center justify-center text-amber-200">
                                                                    <Icon name="workspace_premium" size="16" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-100/90">New Record</div>
                                                                    <div className="text-[11px] text-white font-bold truncate">
                                                                        {categoryRecordAlertMap[cat as HodsonsCategory]?.currentTiming} by {categoryRecordAlertMap[cat as HodsonsCategory]?.athleteName}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="mb-4">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h3 className="text-base font-black text-white uppercase tracking-wide group-hover:text-primary transition-colors">{cat}</h3>
                                                            <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">ID: {cat.replace(' ', '_')}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 font-medium">Manage participants, timings and rankings</p>
                                                    </div>
                                                    <button
                                                        onClick={() => openCategoryAccessFlow(cat)}
                                                        className="w-full py-2.5 royal-primary-btn rounded-xl font-black text-xs uppercase tracking-widest shadow-sm"
                                                    >
                                                        Manage Results
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal for Editing Specific Category */}
            {editCategory && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeCategoryEditor}></div>
                    <div className="relative w-full max-w-7xl h-[90vh] min-h-0 bg-[#0f172a] rounded-2xl border border-primary/15 shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-200">
                        <ModalHeader
                            compact
                            kicker="Results Editor"
                            icon="edit_note"
                            title={`Record Results: ${editCategory}`}
                            subtitle="Compact control room for race entries, rankings, and exports."
                            onClose={closeCategoryEditor}
                        />
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                            <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(201,163,74,0.12),rgba(255,255,255,0.02))] px-5 pb-4">
                                <button onClick={closeCategoryEditor} className="text-slate-400 hover:text-white text-[11px] mb-2 flex items-center gap-1 uppercase tracking-wider font-bold">
                                    <Icon name="arrow_back" size="14" /> Back to Categories
                                </button>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {editorAccessScope && (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.18em] ${editorAccessScope === 'All' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-[#e2c98d]/30 bg-[#e2c98d]/10 text-[#f6e3b2]'}`}>
                                            <Icon name={editorAccessScope === 'All' ? 'groups' : 'lock'} size="11" />
                                            {editorAccessScope === 'All' ? 'Full Houses Access' : `${editorAccessScope} Access`}
                                        </span>
                                    )}
                                    {skipQualifyingCategories.includes(editCategory) && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-300 text-[9px] font-black uppercase tracking-[0.18em]">
                                            <Icon name="fast_forward" size="11" />
                                            Qualifying Skipped
                                        </span>
                                    )}
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">House Filter</span>
                                        <select
                                            value={filterHouse}
                                            onChange={(e) => setFilterHouse(e.target.value as HouseAccessScope)}
                                            disabled={editorAccessScope !== 'All'}
                                            className={`royal-input rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors min-w-[9rem] ${editorAccessScope !== 'All' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-white/5'}`}
                                        >
                                            <option value="All">All Houses</option>
                                            <option value="Vindhya">Vindhya</option>
                                            <option value="Himalaya">Himalaya</option>
                                            <option value="Nilgiri">Nilgiri</option>
                                            <option value="Siwalik">Siwalik</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3">
                                    <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5">
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary/75">
                                            <Icon name="info" size="11" className="text-primary" />
                                            Quick Guide
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] leading-5 text-slate-300">
                                            <span><b className="text-[#f6e3b2]">Finals Access:</b> Qualified + Bonus</span>
                                            <span><b className="text-[#f6e3b2]">Qualifying Auto-Tags:</b> Cutoff = Qualified, +1 min = Bonus, +2 mins = Finished, Then DNF</span>
                                            <span><b className="text-[#f6e3b2]">Qualifying Stage Points:</b> Finished = +1, Bonus = 0, Absent/DNF = -1</span>
                                            <span><b className="text-[#f6e3b2]">Finals Stage Points:</b> Qualified = 1st +20 ... 15th +6, Then +5, Finisher = +1</span>
                                        </div>
                                    </div>
                                    {(() => {
                                        const raceInfo = HODSONS_RACE_INFO[editCategory];
                                        const recordAlert = categoryRecordAlertMap[editCategory];
                                        return (
                                            <div className="rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,rgba(201,163,74,0.08),rgba(255,255,255,0.02))] px-3 py-2.5">
                                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary/75">
                                                    <Icon name="flag" size="11" className="text-primary" />
                                                    Race Info
                                                </div>
                                                {recordAlert && (
                                                    <div className="mt-2 rounded-xl border border-amber-300/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(201,163,74,0.08))] px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <Icon name="workspace_premium" size="16" className="text-amber-200" />
                                                            <div>
                                                                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-100/90">New Record Live</div>
                                                                <div className="text-[11px] text-white font-bold">{recordAlert.athleteName} clocked {recordAlert.currentTiming}</div>
                                                            </div>
                                                            <div className="ml-auto text-[10px] font-black text-amber-100">{recordAlert.marginLabel}</div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                                                    <div className="rounded-xl border border-white/6 bg-white/[0.025] px-2.5 py-2">
                                                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-black">Race</div>
                                                        <div className="mt-1 text-white font-black">{raceInfo.distanceKm} km</div>
                                                        <div className="text-slate-400 truncate">{raceInfo.division}</div>
                                                    </div>
                                                    <div className="rounded-xl border border-white/6 bg-white/[0.025] px-2.5 py-2">
                                                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-black">Timings</div>
                                                        <div className="mt-1 text-green-400 font-black">{formatRaceInfoLabel(raceInfo.qualifyingTiming)}</div>
                                                        <div className="text-sky-300 font-bold">Bonus {formatRaceInfoLabel(raceInfo.bonusTiming)}</div>
                                                        <div className="text-primary font-bold">Finish {formatRaceInfoLabel(raceInfo.finishedTiming)}</div>
                                                    </div>
                                                    <div className="rounded-xl border border-white/6 bg-white/[0.025] px-2.5 py-2">
                                                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-black">Route</div>
                                                        <div className="mt-1 text-white font-bold leading-4">{raceInfo.route}</div>
                                                        <div className="text-slate-500">{raceInfo.ageGroup}</div>
                                                    </div>
                                                    <div className="rounded-xl border border-white/6 bg-white/[0.025] px-2.5 py-2">
                                                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-black">Record</div>
                                                        <div className="mt-1 text-white font-black">{raceInfo.recordTiming} min</div>
                                                        <div className="text-slate-400 truncate">{raceInfo.recordHolder}</div>
                                                        <div className="text-slate-500">Year {raceInfo.recordYear}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                {skipQualifyingCategories.includes(editCategory) && (
                                    <p className="text-[11px] text-amber-300 mt-2 flex items-center gap-2">
                                        <Icon name="warning" size="12" className="text-amber-400" />
                                        This category is in skip-qualifying mode, so the full enrolled list is available in finals.
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2.5 mt-3">
                                    {(editorAccessScope === 'All' || !skipQualifyingCategories.includes(editCategory)) && (
                                        <button onClick={() => setActivePhase('pre_qualifying')} className={`px-3 py-2 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all ${activePhase === 'pre_qualifying' ? 'bg-black/25 text-[#fff4d4] border border-primary/40 shadow-[0_10px_30px_rgba(201,163,74,0.12)]' : 'text-slate-400 hover:text-white bg-white/[0.04] border border-white/6'}`}>0. Pre-Qualifying</button>
                                    )}
                                    {editorAccessScope === 'All' && (
                                        <>
                                            <button onClick={() => setActivePhase('qualifying')} className={`px-3 py-2 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all ${activePhase === 'qualifying' ? 'bg-black/25 text-[#fff4d4] border border-primary/40 shadow-[0_10px_30px_rgba(201,163,74,0.12)]' : 'text-slate-400 hover:text-white bg-white/[0.04] border border-white/6'}`}>1. Qualifying</button>
                                        </>
                                    )}
                                    <button onClick={() => setActivePhase('pre_finals')} className={`px-3 py-2 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all ${activePhase === 'pre_finals' ? 'bg-black/25 text-[#fff4d4] border border-primary/40 shadow-[0_10px_30px_rgba(201,163,74,0.12)]' : 'text-slate-400 hover:text-white bg-white/[0.04] border border-white/6'}`}>1.5 Pre-Finals</button>
                                    {editorAccessScope === 'All' && (
                                        <>
                                            <button onClick={() => setActivePhase('finals')} className={`px-3 py-2 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all ${activePhase === 'finals' ? 'bg-black/25 text-[#fff4d4] border border-primary/40 shadow-[0_10px_30px_rgba(201,163,74,0.12)]' : 'text-slate-400 hover:text-white bg-white/[0.04] border border-white/6'}`}>2. Finals</button>
                                        </>
                                    )}
                                </div>

                                {(() => {
                                    const catData = categoriesData.find(c => c.name === editCategory);
                                    if (!catData) return null;
                                    const isPreQual = activePhase === 'pre_qualifying';
                                    const isPreFinals = activePhase === 'pre_finals';

                                    if (isPreQual || isPreFinals) {
                                        return (
                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 py-2.5 px-3.5 bg-white/[0.03] border border-white/10 rounded-xl animate-in slide-in-from-top-2 overflow-hidden">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Icon name="groups" size="14" className="text-amber-500 shrink-0" />
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none whitespace-nowrap truncate">
                                                        {isPreQual ? "Pre-Qualify Summary" : "Pre-Finals Summary"}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 shrink-0 items-center border-l border-white/10 pl-5 ml-1">
                                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Medically Excused:</span>
                                                        <span className="text-sm font-black text-amber-500 tabular-nums">{isPreQual ? catData.stats.preQualMedExcused : catData.stats.preFinalsMedExcused}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">On Leave:</span>
                                                        <span className="text-sm font-black text-[#e7cf96] tabular-nums">{isPreQual ? catData.stats.preQualOnLeave : catData.stats.preFinalsOnLeave}</span>
                                                    </div>
                                                </div>
                                                <div className="ml-auto flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            if (!editCategory) return;
                                                            const studentsInCat = allHodsonsStudents
                                                                .filter(s => s.category === editCategory)
                                                                .filter(s => filterHouse === 'All' || s.house === filterHouse);
                                                            setResults(prev => {
                                                                const newResults = [...prev];
                                                                studentsInCat.forEach(stu => {
                                                                    const existing = newResults.find(r => r.studentId === stu.id);
                                                                    if (existing) {
                                                                        if (isPreQual) existing.preQualifyingType = 'pending';
                                                                        else if (isPreFinals) existing.preFinalsType = 'pending';
                                                                    }
                                                                });
                                                                return newResults;
                                                            });
                                                            showToast({ title: 'Status Reset', description: `All student statuses reset to pending for ${isPreQual ? 'pre-qualifying' : 'pre-finals'}.` });
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border text-[10px] font-bold uppercase tracking-wider hover:bg-slate-500/20 bg-slate-500/10 border-white/5 text-slate-400 active:scale-95 whitespace-nowrap shadow-sm"
                                                        title="Reset all to pending"
                                                    >
                                                        <Icon name="history" size="14" /> Undo
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!editCategory) return;
                                                            const studentsInCat = allHodsonsStudents
                                                                .filter(s => s.category === editCategory)
                                                                .filter(s => filterHouse === 'All' || s.house === filterHouse);
                                                            const skipsQualifying = skipQualifyingCategories.includes(editCategory);
                                                            setResults(prev => {
                                                                const newResults = [...prev];
                                                                studentsInCat.forEach(stu => {
                                                                    const existing = newResults.find(r => r.studentId === stu.id);
                                                                    if (isPreQual) {
                                                                        if (existing) {
                                                                            if (existing.preQualifyingType !== 'medically_excused' && existing.preQualifyingType !== 'on_leave') {
                                                                                existing.preQualifyingType = 'participating';
                                                                            }
                                                                        } else {
                                                                            newResults.push({ studentId: stu.id, preQualifyingType: 'participating', preFinalsType: 'pending', qualifyingType: 'pending', finalsType: 'pending' } as any);
                                                                        }
                                                                    } else if (isPreFinals) {
                                                                        const qualifiesForPreFinals = qualifiesForFinals(existing?.qualifyingType, skipsQualifying);
                                                                        if (qualifiesForPreFinals && existing) {
                                                                            if (existing.preFinalsType !== 'medically_excused' && existing.preFinalsType !== 'on_leave') {
                                                                                existing.preFinalsType = 'participating';
                                                                            }
                                                                        }
                                                                    }
                                                                });
                                                                return newResults;
                                                            });
                                                            showToast({ title: 'Marked All', description: `All eligible students marked as participating for ${isPreQual ? 'pre-qualifying' : 'pre-finals'}.` });
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border text-[10px] font-bold uppercase tracking-wider hover:bg-green-500/20 bg-green-500/10 border-green-500/20 text-green-400 active:scale-95 whitespace-nowrap shadow-sm"
                                                    >
                                                        <Icon name="check_circle" size="14" /> Mark All as Participating
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="flex flex-wrap items-center gap-2.5 mt-3">
                                    {editorAccessScope === 'All' && (
                                        !skipQualifyingCategories.includes(editCategory) ? (
                                            <button
                                                onClick={() => handleSkipQualifyingPhase(editCategory)}
                                                className="px-3 py-2 rounded-lg transition-all flex items-center gap-2 border text-[11px] font-bold uppercase tracking-wider hover:bg-amber-500/20 bg-amber-500/10 border-amber-500/20 text-amber-300"
                                            >
                                                <Icon name="fast_forward" size="16" /> Skip Qualifying Phase
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRestoreQualifyingPhase(editCategory)}
                                                className="px-3 py-2 rounded-lg transition-all flex items-center gap-2 border text-[11px] font-bold uppercase tracking-wider hover:bg-primary/20 bg-primary/10 border-primary/20 text-primary"
                                            >
                                                <Icon name="restore" size="16" /> Restore Qualifying Phase
                                            </button>
                                        )
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Icon name="download" size="16" className="text-slate-400" />
                                        <select
                                            value={downloadFormat}
                                            onChange={(e) => setDownloadFormat(e.target.value as any)}
                                            className="royal-input rounded-lg px-2 py-1.5 text-[11px] font-bold cursor-pointer transition-colors hover:bg-white/5"
                                        >
                                            <option value="xlsx">.xlsx</option>
                                            <option value="docx">.docx</option>
                                        </select>
                                    </div>

                                    <button
                                        disabled={isDownloading}
                                        onClick={() => editCategory && downloadCategoryStageList(editCategory, activePhase, downloadFormat)}
                                        className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 border text-[11px] font-bold uppercase tracking-wider ${isDownloading ? 'opacity-60 cursor-not-allowed' : ''} royal-secondary-btn`}
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
                                                const studentsInCat = allHodsonsStudents.filter(s => s.category === cat);
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
                                            className="px-3 py-2 rounded-lg transition-all flex items-center gap-2 border text-[11px] font-bold uppercase tracking-wider hover:bg-primary/20 bg-primary/10 border-primary/20 text-primary"
                                        >
                                            <Icon name="auto_awesome" size="16" /> Auto-Rank by Time
                                        </button>
                                    )}
                                    <div className="ml-auto flex items-center gap-2">
                                        <button
                                            onClick={() => handleClearCategoryResults(editCategory)}
                                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black rounded-lg transition-all flex items-center justify-center gap-2 border border-red-500/20 text-[10px] uppercase tracking-wider active:scale-95"
                                        >
                                            <Icon name="delete_sweep" size="14" /> Clear All
                                        </button>
                                        <button
                                            onClick={() => handleSaveResult(editCategory)}
                                            className="px-4 py-2.5 bg-green-500 hover:bg-green-400 text-white font-black rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] active:scale-95 border-b-2 border-green-700"
                                        >
                                            <Icon name="cloud_upload" size="16" /> Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 pb-5 pt-3">
                                <table className="royal-data-table min-w-[46rem]">
                                    <thead>
                                        <tr>
                                            <th>SN</th>
                                            <th className="cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'id' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('id'); }}>
                                                <div className="flex items-center gap-1">Comp No {listSortField === 'id' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                            </th>
                                            <th className="cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'name' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('name'); }}>
                                                <div className="flex items-center gap-1">Player Name {listSortField === 'name' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                            </th>
                                            <th className="royal-col-secondary cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'house' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('house'); }}>
                                                <div className="flex items-center gap-1">House {listSortField === 'house' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                            </th>
                                            <th className="royal-col-secondary cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'class' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('class'); }}>
                                                <div className="flex items-center gap-1">Class {listSortField === 'class' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                            </th>
                                            <th className="royal-col-secondary">Position</th>
                                            <th>Timing</th>
                                            <th className="cursor-pointer hover:text-white" onClick={() => { setListSortOrder(listSortField === 'status' ? (listSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'); setListSortField('status'); }}>
                                                <div className="flex items-center gap-1">Status {listSortField === 'status' && <Icon name={listSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} size="12" />}</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allHodsonsStudents
                                            .filter(s => s.category === editCategory)
                                            .filter(s => filterHouse === 'All' || s.house === filterHouse)
                                            .sort((a, b) => {
                                                const factor = listSortOrder === 'asc' ? 1 : -1;
                                                if (listSortField === 'house') return factor * a.house.localeCompare(b.house);
                                                if (listSortField === 'class') return factor * ((allHodsonsClasses[a.id] || '—').localeCompare(allHodsonsClasses[b.id] || '—'));
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
                                                const qualifiesForPreFinals = qualifiesForFinals(res.qualifyingType, skipsQualifying);
                                                const preFinalsOk = res.preFinalsType === 'participating';

                                                if (activePhase === 'qualifying' && !skipsQualifying && !preQualOk) return false;
                                                if (activePhase === 'pre_finals' && !qualifiesForPreFinals) return false;
                                                if (activePhase === 'finals' && (!qualifiesForPreFinals || !preFinalsOk)) return false;
                                                return true;
                                            })
                                            .map((stu, index) => {
                                                const res = results.find(r => r.studentId === stu.id) || { studentId: stu.id, qualifyingType: 'pending' as const, finalsType: 'pending' as const };
                                                const cfg = houseConfig(stu.house);
                                                const skipsQualifying = !!editCategory && skipQualifyingCategories.includes(editCategory);

                                                return (
                                                    <tr key={stu.id} className="hover:bg-white/[0.02]">
                                                        <td className="font-mono text-xs text-slate-500">{index + 1}</td>
                                                        <td className="font-mono text-xs">{stu.id}</td>
                                                        <td className="font-bold text-white">{stu.name}</td>
                                                        <td className="royal-col-secondary">
                                                            <span className={`inline-flex items-center justify-center gap-1 uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg}/20 ${cfg.text} border ${cfg.border}/30`}>
                                                                {stu.house}
                                                            </span>
                                                        </td>
                                                        <td className="royal-col-secondary">
                                                            <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.035] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                                                                {allHodsonsClasses[stu.id] || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="royal-col-secondary">
                                                            {(activePhase === 'finals' && res.finalsType === 'qualified_pos') || (activePhase === 'qualifying' && res.qualifyingType === 'qualified') ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-slate-500 font-bold text-[10px]">#</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        placeholder="Rank"
                                                                        value={activePhase === 'qualifying' ? (res.qualifyingPosition || '') : (res.finalsPosition || '')}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                                                            handleResultChange(
                                                                                stu.id,
                                                                                activePhase === 'qualifying' ? 'qualifying' : 'finals',
                                                                                activePhase === 'qualifying' ? res.qualifyingType : res.finalsType,
                                                                                val,
                                                                                (activePhase === 'qualifying' ? (res.qualifyingTiming || '') : (res.finalsTiming || '')).toString(),
                                                                                res.preQualifyingType || 'pending',
                                                                                res.preFinalsType || 'pending'
                                                                            );
                                                                        }}
                                                                        className={`bg-black/50 border ${activePhase === 'qualifying' ? 'focus:border-primary' : 'focus:border-amber-400'} border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none w-14 font-mono font-bold`}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-500 text-xs italic">—</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {(() => {
                                                                const isQualTiming = activePhase === 'qualifying';
                                                                const isFinalsTiming = activePhase === 'finals' && (res.finalsType === 'qualified_pos' || res.finalsType === 'finisher');
                                                                const show = isQualTiming || isFinalsTiming;
                                                                if (!show) return <span className="text-slate-500 text-xs italic">—</span>;

                                                                const currentTiming = isQualTiming ? res.qualifyingTiming : res.finalsTiming;
                                                                const tp = parseTiming(currentTiming);
                                                                const border = isQualTiming ? 'focus:border-primary' : 'focus:border-amber-400';
                                                                const raceInfo = editCategory ? HODSONS_RACE_INFO[editCategory] : null;
                                                                const placeholder = isQualTiming
                                                                    ? `${raceInfo?.qualifyingTiming || 'MM:SS'} qual / ${raceInfo?.bonusTiming || 'MM:SS'} bonus / ${raceInfo?.finishedTiming || 'MM:SS'} fin`
                                                                    : 'MM:SS';

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
                                                        <td>
                                                            {activePhase === 'pre_qualifying' ? (
                                                                <select
                                                                    value={res.preQualifyingType || 'pending'}
                                                                    disabled={skipsQualifying}
                                                                    onChange={(e) => handleResultChange(stu.id, 'qualifying', res.qualifyingType, (res.qualifyingPosition || '').toString(), res.qualifyingTiming || '', e.target.value, res.preFinalsType || 'pending')}
                                                                    className={`bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-400 w-full max-w-[200px] ${skipsQualifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <option value="pending">Pending</option>
                                                                    <option value="participating">Participating</option>
                                                                    <option value="not_participating">Not Participating</option>
                                                                    <option value="on_leave">On Leave</option>
                                                                    <option value="medically_excused">Medically Excused</option>
                                                                    <option value="left_school">Left School / Invalid</option>
                                                                </select>
                                                            ) : activePhase === 'pre_finals' ? (
                                                                <select
                                                                    value={res.preFinalsType || 'pending'}
                                                                    onChange={(e) => handleResultChange(stu.id, 'qualifying', res.qualifyingType, (res.qualifyingPosition || '').toString(), res.qualifyingTiming || '', res.preQualifyingType || 'pending', e.target.value)}
                                                                    className="royal-input rounded px-2 py-1 text-xs w-full max-w-[200px]"
                                                                >
                                                                    <option value="pending">Pending</option>
                                                                    <option value="participating">Participating</option>
                                                                    <option value="not_participating">Not Participating</option>
                                                                    <option value="on_leave">On Leave</option>
                                                                    <option value="medically_excused">Medically Excused</option>
                                                                    <option value="left_school">Left School / Invalid</option>
                                                                </select>
                                                            ) : activePhase === 'qualifying' ? (
                                                                <select
                                                                    value={res.qualifyingType}
                                                                    disabled={skipsQualifying}
                                                                    onChange={(e) => handleResultChange(stu.id, 'qualifying', e.target.value, (res.qualifyingPosition || '').toString(), res.qualifyingTiming || '', res.preQualifyingType || 'pending', res.preFinalsType || 'pending')}
                                                                    className={`bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary w-full max-w-[200px] ${skipsQualifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <option value="pending">Pending</option>
                                                                    <option value="qualified">Qualified</option>
                                                                    <option value="bonus">Bonus</option>
                                                                    <option value="finished">Finished</option>
                                                                    <option value="dnf">DNF</option>
                                                                    <option value="absent">Absent</option>
                                                                    <option value="medically_excused">Medically Excused</option>
                                                                    <option value="left_school">Left School / Invalid</option>
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
                                                                    <option value="left_school">Left School / Invalid</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add New Student Form */}
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <div className="glass-panel p-6 rounded-2xl bg-white/[0.02]">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <Icon name="person_add" size="18" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">Add New Competitor</h4>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-tight">Officially add a student to {editCategory}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comp. No</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 1234"
                                                value={newStudentData.id}
                                                onChange={e => setNewStudentData(prev => ({ ...prev, id: e.target.value }))}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. John Doe"
                                                value={newStudentData.name}
                                                onChange={e => setNewStudentData(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">House</label>
                                            <select
                                                value={newStudentData.house}
                                                onChange={e => setNewStudentData(prev => ({ ...prev, house: e.target.value as any }))}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                                            >
                                                {['Vindhya', 'Himalaya', 'Nilgiri', 'Siwalik'].map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 10B"
                                                value={newStudentData.class}
                                                onChange={e => setNewStudentData(prev => ({ ...prev, class: e.target.value }))}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={handleAddExtraStudent}
                                            className="px-6 py-2.5 bg-primary text-[#091423] rounded-xl text-xs font-black uppercase tracking-[0.1em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                        >
                                            <Icon name="add_circle" size="18" />
                                            Add Student to {editCategory}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {showAllResultsModal && createPortal(
                <AllResultsModal
                    categories={categoriesData}
                    newRecords={categoryRecordAlerts}
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

function AllResultsContent({ categories, newRecords, standings, onDownload, isDownloading }: { categories: any[]; newRecords: CategoryRecordAlert[]; standings: any; onDownload: () => void; isDownloading: boolean }) {
    return (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
            <div className="flex items-center justify-end">
                <button
                    onClick={onDownload}
                    disabled={isDownloading}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                    <Icon name={isDownloading ? 'sync' : 'download'} className={isDownloading ? 'animate-spin' : ''} />
                    <span>Download Full Results (.docx)</span>
                </button>
            </div>
            {newRecords.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px flex-1 bg-white/5"></div>
                        <span className="text-[10px] font-black text-amber-300 uppercase tracking-[4px]">New Records</span>
                        <div className="h-px flex-1 bg-white/5"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {newRecords.map((record) => (
                            <div key={record.category} className="rounded-[26px] border border-amber-300/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(201,163,74,0.06))] p-5 shadow-[0_18px_34px_rgba(0,0,0,0.2)]">
                                <div className="flex items-start gap-3">
                                    <div className="size-11 rounded-2xl bg-amber-300/15 border border-amber-200/20 flex items-center justify-center text-amber-200">
                                        <Icon name="workspace_premium" size="20" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/90">{record.category}</div>
                                        <div className="text-white text-lg font-black mt-1">{record.athleteName}</div>
                                        <div className="text-[11px] text-amber-100/85 mt-1">
                                            {record.currentTiming} for {record.athleteHouse} | {record.marginLabel}
                                        </div>
                                        <div className="text-[11px] text-slate-300 mt-2">
                                            Previous: {record.recordTiming} by {record.recordHolder} ({record.recordYear})
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
    );
}

function AllResultsModal({ categories, newRecords, standings, onClose, onDownload, isDownloading }: { categories: any[]; newRecords: CategoryRecordAlert[]; standings: any; onClose: () => void; onDownload: () => void; isDownloading: boolean }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 rounded-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <ModalHeader
                    kicker="Championship Summary"
                    icon="history_edu"
                    title="Hodson's Run 2026 Summary"
                    subtitle="Podium results and comprehensive house standings in one export-friendly overview."
                    onClose={onClose}
                    actions={null}
                />
                <AllResultsContent
                    categories={categories}
                    newRecords={newRecords}
                    standings={standings}
                    onDownload={onDownload}
                    isDownloading={isDownloading}
                />
            </div>
        </div>
    );
}

export default Hodsons;
