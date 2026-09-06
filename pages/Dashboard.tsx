import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import { HOUSE_COLORS, IMAGES } from '../constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getEvents, Event, getSessions, saveSession, deleteSession, Session, getAttendance, saveAttendance, replaceAttendance, AttendanceRecord, InjuryRecord, getInjuries, saveInjury, deleteInjury, subscribeToGeneralData } from '../utils/storage';
import { combineEventDateTime, formatEventTime } from '../utils/eventTime';
import studentClasses from '../utils/studentClasses.json';
import { getAllHodsonsClasses, getAllHodsonsStudents } from '../utils/hodsonsStorage';

// Data for the Bar Chart
const chartData = [
  { name: 'Vindhya', points: 1150, color: HOUSE_COLORS.vindhya.hex },
  { name: 'Nilgiri', points: 1420, color: HOUSE_COLORS.nilgiri.hex },
  { name: 'Siwalik', points: 980, color: HOUSE_COLORS.siwalik.hex },
  { name: 'Himalaya', points: 1240, color: HOUSE_COLORS.himalaya.hex },
];

const StatCard = ({ title, value, subtext, icon, colorClass, borderClass, onClick, manageText = "Manage" }: any) => (
  <div
    onClick={onClick}
    className={`glass-panel p-5 rounded-xl border-l-4 ${borderClass} flex flex-col justify-between hover:bg-white/5 transition-all group relative ${onClick ? 'cursor-pointer' : ''}`}
  >
    {onClick && (
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-sm z-10">
        <div className="bg-white/10 p-2 rounded-full border border-white/20">
          <Icon name="edit" className="text-white" />
        </div>
        <span className="ml-2 text-white font-medium text-sm">{manageText}</span>
      </div>
    )}
    <div className="flex justify-between items-start mb-2">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <Icon name={icon} className={`${colorClass} opacity-80 group-hover:scale-110 transition-transform`} />
    </div>
    <div>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      <div className="mt-1">{subtext}</div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { showToast } = useToast();
  const [upcomingEvent, setUpcomingEvent] = useState<Event | null>(null);
  const [days, setDays] = useState('00');
  const [hrs, setHrs] = useState('00');
  const [min, setMin] = useState('00');

  // Active Sessions State
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newSession, setNewSession] = useState({
    activity: 'Football',
    startTime: '',
    endTime: '',
    description: ''
  });

  const loadSessions = () => {
    setActiveSessions(getSessions());
  };

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: 'Football',
    compNumber: ''
  });

  const loadAttendance = () => {
    setAttendanceRecords(getAttendance());
  };

  const migrateLegacyAttendanceIfNeeded = async () => {
    if (getAttendance().length > 0) return;

    try {
      const res = await fetch('/Attendance.csv?t=' + Date.now());
      if (!res.ok) return;

      const text = await res.text();
      const rows = text
        .trim()
        .split('\n')
        .slice(1)
        .filter(row => row.trim() !== '')
        .map((row, index) => {
          const [computerNumber, name, house, classStr, date, attended] = row.split(',');
          const studentId = computerNumber?.trim() || '';

          if (!studentId || !date?.trim()) return null;

          return {
            id: `${date.trim()}-legacy-${studentId}-${index}`,
            studentId,
            studentName: name?.trim() || '',
            date: date.trim(),
            activity: 'Legacy Attendance',
            house: house?.trim() || '',
            attended: attended?.trim() === 'Yes',
            className: classStr?.trim() || ''
          } as AttendanceRecord;
        })
        .filter((record): record is AttendanceRecord => Boolean(record));

      if (rows.length > 0) {
        replaceAttendance(rows);
        setAttendanceRecords(rows);
      }
    } catch (error) {
      console.error('Legacy attendance migration failed:', error);
    }
  };

  // Injury State
  const [injuries, setInjuries] = useState<InjuryRecord[]>([]);
  const [showInjuryModal, setShowInjuryModal] = useState(false);
  const [injuryForm, setInjuryForm] = useState({
    playerName: '',
    house: 'Nilgiri',
    sport: 'Football',
    injuryType: '',
    severity: 'Low' as 'Low' | 'Medium' | 'High',
    date: new Date().toISOString().split('T')[0],
    comments: ''
  });

  const loadInjuries = () => {
    setInjuries(getInjuries());
  };

  useEffect(() => {
    const loadAll = () => {
      loadSessions();
      loadAttendance();
      loadInjuries();
      const events = getEvents();
      if (events.length > 0) {
        // Simplest future filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today

        const upcoming = events
          .filter(e => !e.completed)
          .filter(e => {
            // Use the precise date+time when available so an event earlier
            // today doesn't still show as "upcoming" once it has passed.
            const preciseStart = combineEventDateTime(e.date, e.time);
            if (preciseStart) return preciseStart.getTime() >= now.getTime();
            const eventDate = new Date(e.date);
            return eventDate >= today; // Legacy fallback: date-only comparison
          })
          .sort((a, b) => {
            const aTime = combineEventDateTime(a.date, a.time)?.getTime() ?? new Date(a.date).getTime();
            const bTime = combineEventDateTime(b.date, b.time)?.getTime() ?? new Date(b.date).getTime();
            return aTime - bTime;
          });

        setUpcomingEvent(upcoming.length > 0 ? upcoming[0] : null);
      }
    };

    const unsubscribe = subscribeToGeneralData(() => {
      loadAll();
    });

    migrateLegacyAttendanceIfNeeded();
    loadAll();

    return () => unsubscribe();
  }, []);

  // Live countdown: recompute every second from whichever event is upcoming.
  // Falls back to a date-only day count for events saved before the precise
  // time field existed.
  useEffect(() => {
    if (!upcomingEvent) {
      setDays('00');
      setHrs('00');
      setMin('00');
      return;
    }

    const tick = () => {
      const now = new Date();
      const preciseStart = combineEventDateTime(upcomingEvent.date, upcomingEvent.time);

      if (preciseStart) {
        const diffMs = Math.max(0, preciseStart.getTime() - now.getTime());
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diffMs / (1000 * 60)) % 60);
        setDays(d.toString().padStart(2, '0'));
        setHrs(h.toString().padStart(2, '0'));
        setMin(m.toString().padStart(2, '0'));
      } else {
        // Legacy event with no parseable time: date-only day count.
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDate = new Date(upcomingEvent.date);
        const diff = eventDate.getTime() - today.getTime();
        const d = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
        setDays(d.toString().padStart(2, '0'));
        setHrs('00');
        setMin('00');
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [upcomingEvent]);

  const handleAddSession = () => {
    if (newSession.startTime && newSession.endTime && newSession.description) {
      const session: Session = {
        id: Date.now().toString(),
        ...newSession
      };
      saveSession(session);
      loadSessions();
      setNewSession({ activity: 'Football', startTime: '', endTime: '', description: '' });
      showToast({
        title: 'Session Started',
        description: `${session.activity} for ${session.description} is now active.`
      });
    } else {
      alert('Please fill all fields');
    }
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    loadSessions();
  };

  const handleSubmitAttendance = async () => {
    const compNumber = attendanceForm.compNumber.trim();
    if (!compNumber) {
      alert('Enter a valid Computer Number');
      return;
    }

    const allStudents = getAllHodsonsStudents();
    const student = allStudents.find((entry) => entry.id === compNumber);

    if (!student) {
      alert(`Computer Number ${compNumber} not found in the Hodsons student list.`);
      setAttendanceForm({ ...attendanceForm, compNumber: '' });
      return;
    }

    const allClasses = getAllHodsonsClasses(studentClasses as Record<string, string>);
    const existingRecord = attendanceRecords.find((record) =>
      record.studentId === compNumber &&
      record.date === attendanceForm.date &&
      record.activity === attendanceForm.activity
    );

    const updatedRecord: AttendanceRecord = {
      id: existingRecord?.id || `${attendanceForm.date}-${attendanceForm.activity}-${compNumber}`,
      studentId: compNumber,
      studentName: student.name,
      date: attendanceForm.date,
      activity: attendanceForm.activity,
      house: student.house,
      attended: existingRecord ? !existingRecord.attended : true,
      className: allClasses[compNumber] || ''
    };

    saveAttendance(updatedRecord);
    loadAttendance();
    setShowAttendanceModal(false);
    setAttendanceForm({
      date: new Date().toISOString().split('T')[0],
      activity: 'Football',
      compNumber: ''
    });
    showToast({
      title: 'Attendance Updated',
      description: `${student.name} is now marked as ${updatedRecord.attended ? 'present' : 'absent'} for ${attendanceForm.activity}.`
    });
  };

  const totalStudentsToday = attendanceRecords
    .filter(r => r.date === new Date().toISOString().split('T')[0] && r.attended)
    .length;

  const handleSubmitInjury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injuryForm.playerName || !injuryForm.injuryType) {
      alert('Please fill in required fields');
      return;
    }
    const record: InjuryRecord = {
      id: Date.now().toString(),
      ...injuryForm
    };
    saveInjury(record);
    loadInjuries();
    setShowInjuryModal(false);
    setInjuryForm({
      playerName: '',
      house: 'Nilgiri',
      sport: 'Football',
      injuryType: '',
      severity: 'Low',
      date: new Date().toISOString().split('T')[0],
      comments: ''
    });
    showToast({
      title: 'Injury Logged',
      description: `${record.playerName}'s report has been saved to the injury ledger.`
    });
  };

  const handleDeleteInjury = (id: string) => {
    deleteInjury(id);
    loadInjuries();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Right Sidebar Widgets shifted to full or simplified if no graph */}
        <div className="lg:col-span-12 flex flex-col gap-6">

          {/* Upcoming Event - Now more prominent */}
          <div className="glass-panel rounded-2xl p-8 relative overflow-hidden group min-h-[300px] flex flex-col justify-center">
            <div className="absolute inset-0 z-0">
              <div className="w-full h-full bg-gradient-to-r from-background-dark via-background-dark/80 to-transparent absolute inset-0 z-10"></div>
              <img src={IMAGES.footballField} alt="Field" className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 rounded bg-primary text-[10px] font-bold uppercase tracking-wide text-white">Next Scheduled</span>
                <span className="text-slate-300 text-xs font-medium">{upcomingEvent ? upcomingEvent.sport : 'No Upcoming Events'}</span>
              </div>
              <h3 className="text-4xl font-bold text-white mb-4 leading-tight">
                {upcomingEvent ? (
                  <>
                    {upcomingEvent.participation === 'inter_school' && upcomingEvent.homeSchool ? (
                      <>
                        {upcomingEvent.homeSchool}
                        <br />
                        <span className="text-2xl text-slate-300">VS {upcomingEvent.opponentSchool || 'TBD'}</span>
                      </>
                    ) : upcomingEvent.participation === 'houses' && upcomingEvent.houses ? (
                      <span>{upcomingEvent.houses.join(' vs ')}</span>
                    ) : (
                      <>{upcomingEvent.title}</>
                    )}
                  </>
                ) : 'Stay tuned for upcoming sports events'}
              </h3>

              {upcomingEvent && (
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex items-center gap-6 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <Icon name="calendar_today" size="16" />
                      <span>{new Date(upcomingEvent.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="schedule" size="16" />
                      <span>{formatEventTime(upcomingEvent.time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="location_on" size="16" />
                      <span>{upcomingEvent.venue}</span>
                    </div>
                  </div>

                  <div className="flex gap-6 mt-2">
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">{days}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">Days</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">{hrs}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">Hours</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">{min}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">Minutes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Recent Matches Table */}
      <div className="glass-panel rounded-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Recent Results</h3>
          <Link to="/archive" className="text-xs text-slate-400 hover:text-white underline">View All Results</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="royal-data-table">
            <thead>
              <tr>
                <th className="rounded-l-xl">Match</th>
                <th className="royal-col-secondary">Sport</th>
                <th>Date</th>
                <th className="text-right rounded-r-xl">Result</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const completedEvents = getEvents()
                  .filter(e => e.completed)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5); // Show top 5

                if (completedEvents.length === 0) {
                  return (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                        No recent results available
                      </td>
                    </tr>
                  );
                }

                return completedEvents.map(event => {
                  let winnerHouse = '';
                  const winnerRaw = (event.resultDetails?.winner || '').trim().toLowerCase();
                  if (winnerRaw.includes('vindhya') || winnerRaw === 'v') winnerHouse = 'Vindhya';
                  else if (winnerRaw.includes('himalaya') || winnerRaw === 'h') winnerHouse = 'Himalaya';
                  else if (winnerRaw.includes('nilgiri') || winnerRaw === 'n') winnerHouse = 'Nilgiri';
                  else if (winnerRaw.includes('siwalik') || winnerRaw === 's') winnerHouse = 'Siwalik';

                  const houseConfig = winnerHouse ? (HOUSE_COLORS as any)[winnerHouse.toLowerCase()] : null;

                  return (
                    <tr key={event.id} className="hover:bg-white/5 transition-colors">
                      <td className="font-medium text-white">{event.title}</td>
                      <td className="royal-col-secondary">{event.sport}</td>
                      <td>{new Date(event.date).toLocaleDateString()}</td>
                      <td className="text-right">
                        {houseConfig ? (
                          <div className="flex items-center justify-end gap-2" title={`${winnerHouse} House Won`}>
                            <span className={`font-bold ${houseConfig.text}`}>{event.result || 'Completed'}</span>
                            <div className={`size-6 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-xs ${houseConfig.bg}/20 ${houseConfig.text} border ${houseConfig.border}/30`}>
                              {winnerHouse[0]}
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-green-400">{event.result || 'Completed'}</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
