import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import { HOUSE_COLORS, IMAGES } from '../constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getEvents, Event, getSessions, saveSession, deleteSession, Session, getAttendance, saveAttendance, AttendanceRecord, InjuryRecord, getInjuries, saveInjury, deleteInjury } from '../utils/storage';

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
          const eventDate = new Date(e.date);
          return eventDate >= today; // Include today
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (upcoming.length > 0) {
        setUpcomingEvent(upcoming[0]);

        // Simple countdown based on date only
        const eventDate = new Date(upcoming[0].date);
        const diff = eventDate.getTime() - today.getTime();
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));

        setDays(d.toString().padStart(2, '0'));
        setHrs('00'); // Keep hrs/min 00 for simplicity as time parsing was problematic
        setMin('00');
      } else {
        setUpcomingEvent(null);
      }
    }
  }, []);

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
    if (!attendanceForm.compNumber.trim()) {
      alert('Enter a valid Computer Number');
      return;
    }

    try {
      const res = await fetch('/api/mark-attendance', {
        method: 'POST',
        body: JSON.stringify({
          compNumber: attendanceForm.compNumber,
          date: attendanceForm.date
        })
      });

      if (res.ok) {
        setShowAttendanceModal(false);
        setAttendanceForm({
          date: new Date().toISOString().split('T')[0],
          activity: 'Football',
          compNumber: ''
        });
        showToast({
          title: 'Attendance Updated',
          description: 'The attendance register was toggled successfully.'
        });
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
        setAttendanceForm({ ...attendanceForm, compNumber: '' }); // prompt clear the wrong number
      }
    } catch (e: any) {
      alert('Failed to send request: ' + e.message);
    }
  };

  const totalStudentsToday = attendanceRecords
    .filter(r => r.date === new Date().toISOString().split('T')[0])
    .reduce((acc, r) => acc + r.players.length, 0);

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
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Daily Attendance"
          value={totalStudentsToday > 0 ? totalStudentsToday.toString() : "--"}
          icon="analytics"
          borderClass="border-l-primary"
          colorClass="text-primary"
          subtext={<p className="text-xs text-slate-400">{totalStudentsToday > 0 ? `${totalStudentsToday} marked today` : 'Record attendance'}</p>}
          onClick={() => setShowAttendanceModal(true)}
          manageText="Mark Attendance"
        />
        <StatCard
          title="Active Sessions"
          value={activeSessions.length.toString()}
          icon="exercise"
          borderClass="border-l-house-siwalik"
          colorClass="text-house-siwalik"
          subtext={<p className="text-xs text-slate-400">{activeSessions.length > 0 ? `${activeSessions.length} active now` : 'No active sessions'}</p>}
          onClick={() => setShowSessionModal(true)}
          manageText="Manage Sessions"
        />
        <StatCard
          title="Injuries Reported"
          value={injuries.length.toString()}
          icon="medical_services"
          borderClass="border-l-house-vindhya"
          colorClass="text-house-vindhya"
          subtext={<p className="text-xs text-slate-400">{injuries.length > 0 ? `${injuries.length} reports logged` : 'None reported'}</p>}
          onClick={() => setShowInjuryModal(true)}
          manageText="Report Injury"
        />
      </div>

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
                    {upcomingEvent.title}
                    {upcomingEvent.participation === 'inter_school' && upcomingEvent.opponentSchool && (
                      <span className="block text-2xl text-slate-300 mt-2">vs {upcomingEvent.opponentSchool}</span>
                    )}
                    {upcomingEvent.participation === 'houses' && upcomingEvent.houses && (
                      <span className="block text-2xl text-slate-300 mt-2">{upcomingEvent.houses.join(' vs ')}</span>
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
                      <span>{upcomingEvent.time}</span>
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

              <button disabled={!upcomingEvent} className="px-8 py-3 rounded-lg bg-white text-background-dark font-bold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50">
                {upcomingEvent ? 'Event Details' : 'View Calendar'}
              </button>
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
      {/* Active Sessions Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
            <ModalHeader
              compact
              kicker="Training Control"
              icon="schedule"
              title="Manage Active Sessions"
              subtitle="Review live sessions and start a new one without leaving the dashboard."
              onClose={() => setShowSessionModal(false)}
            />

            <div className="p-6">
              {/* Current Sessions List */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Current Sessions ({activeSessions.length})</h3>
                {activeSessions.length > 0 ? (
                  <div className="space-y-3">
                    {activeSessions.map(session => (
                      <div key={session.id} className="bg-white/5 border border-white/5 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold">{session.activity}</span>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{session.description}</span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Icon name="schedule" size="14" />
                            {session.startTime} - {session.endTime}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="End Session"
                        >
                          <Icon name="delete" size="20" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-lg text-slate-500 italic">
                    No active sessions currently.
                  </div>
                )}
              </div>

              {/* Add New Session Form */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Add New Session</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Activity</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={newSession.activity}
                      onChange={e => setNewSession({ ...newSession, activity: e.target.value })}
                    >
                      <option value="Football">Football</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Cricket">Cricket</option>
                      <option value="Athletics">Athletics</option>
                      <option value="Tennis">Tennis</option>
                      <option value="Badminton">Badminton</option>
                      <option value="Swimming">Swimming</option>
                      <option value="Hockey">Hockey</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">For Whom (e.g. U-17)</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. U-17 Boys"
                      value={newSession.description}
                      onChange={e => setNewSession({ ...newSession, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={newSession.startTime}
                      onChange={e => setNewSession({ ...newSession, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">End Time</label>
                    <input
                      type="time"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={newSession.endTime}
                      onChange={e => setNewSession({ ...newSession, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddSession}
                  className="w-full royal-primary-btn font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Icon name="add_circle" size="20" />
                  Start Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
            <ModalHeader
              compact
              kicker="Attendance Desk"
              icon="fact_check"
              title="Record Attendance"
              subtitle="Use the computer number to quickly toggle a student’s session attendance."
              onClose={() => setShowAttendanceModal(false)}
            />

            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Date (Ongoing)</label>
                  <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary opacity-70 cursor-not-allowed"
                    value={attendanceForm.date}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Activity</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={attendanceForm.activity}
                    onChange={e => setAttendanceForm({ ...attendanceForm, activity: e.target.value })}
                  >
                    <option value="Football">Football</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Athletics">Athletics</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Swimming">Swimming</option>
                    <option value="Hockey">Hockey</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Toggle Attendance</label>
                <div className="flex flex-col gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Enter Student's Computer Number..."
                    value={attendanceForm.compNumber}
                    onChange={e => setAttendanceForm({ ...attendanceForm, compNumber: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-lg text-center tracking-widest"
                  />
                  <p className="text-xs text-slate-500 text-center">Entering the computer number will automatically toggle the student's absent/present state.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex justify-end">
                <button
                  onClick={handleSubmitAttendance}
                  disabled={!attendanceForm.compNumber.trim()}
                  className="w-full royal-primary-btn font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-lg uppercase tracking-wider"
                >
                  <Icon name="check_circle" />
                  Submit Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Injury Modal */}
      {showInjuryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
            <ModalHeader
              compact
              kicker="Medical Register"
              icon="healing"
              title="Report & Manage Injuries"
              subtitle="Track active injury reports and add new entries with a consistent medical log."
              onClose={() => setShowInjuryModal(false)}
            />

            <div className="p-6 overflow-y-auto max-h-[80vh]">
              {/* Current Injuries List */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Active Reports ({injuries.length})</h3>
                {injuries.length > 0 ? (
                  <div className="space-y-3">
                    {injuries.map(injury => (
                      <div key={injury.id} className="bg-white/5 border border-white/5 p-4 rounded-lg flex items-center justify-between group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold">{injury.playerName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${injury.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                              injury.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                              {injury.severity} Severity
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {injury.house} • {injury.sport} • <span className="text-slate-300">{injury.injuryType}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteInjury(injury.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Clear Report"
                        >
                          <Icon name="delete" size="20" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-lg text-slate-500 italic text-sm">
                    No active injury reports.
                  </div>
                )}
              </div>

              {/* New Injury Form */}
              <div className="pt-6 border-t border-white/5">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 text-center">New Injury Report</h3>
                <form onSubmit={handleSubmitInjury} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Player Name</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Full name"
                        value={injuryForm.playerName}
                        onChange={e => setInjuryForm({ ...injuryForm, playerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">House</label>
                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={injuryForm.house}
                        onChange={e => setInjuryForm({ ...injuryForm, house: e.target.value })}
                      >
                        <option value="Nilgiri">Nilgiri</option>
                        <option value="Vindhya">Vindhya</option>
                        <option value="Himalaya">Himalaya</option>
                        <option value="Siwalik">Siwalik</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Sport</label>
                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={injuryForm.sport}
                        onChange={e => setInjuryForm({ ...injuryForm, sport: e.target.value })}
                      >
                        <option value="Football">Football</option>
                        <option value="Basketball">Basketball</option>
                        <option value="Cricket">Cricket</option>
                        <option value="Athletics">Athletics</option>
                        <option value="Hockey">Hockey</option>
                        <option value="Tennis">Tennis</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Injury Type</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. Sprained Ankle"
                        value={injuryForm.injuryType}
                        onChange={e => setInjuryForm({ ...injuryForm, injuryType: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Severity</label>
                      <div className="flex gap-2">
                        {['Low', 'Medium', 'High'].map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInjuryForm({ ...injuryForm, severity: level as any })}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${injuryForm.severity === level
                              ? 'bg-primary border-primary text-white'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                              }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Date</label>
                      <input
                        type="date"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={injuryForm.date}
                        onChange={e => setInjuryForm({ ...injuryForm, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Comments</label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                      placeholder="Doctor's notes or recovery timeline..."
                      value={injuryForm.comments}
                      onChange={e => setInjuryForm({ ...injuryForm, comments: e.target.value })}
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 mt-2"
                  >
                    <Icon name="medical_services" />
                    Submit Official Report
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
