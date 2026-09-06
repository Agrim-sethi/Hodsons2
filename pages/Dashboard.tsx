import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import { HOUSE_COLORS, IMAGES } from '../constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getEvents, Event, getSessions, saveSession, deleteSession, Session, getAttendance, saveAttendance, replaceAttendance, AttendanceRecord, InjuryRecord, getInjuries, saveInjury, deleteInjury, subscribeToGeneralData } from '../utils/storage';
import { formatEventTime } from '../utils/eventTime';

const Dashboard: React.FC = () => {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0, avgAttendance: 0 });
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const loadData = () => {
      const sessionData = getSessions();
      const eventData = getEvents().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setSessions(sessionData);
      setEvents(eventData);

      const totalSessions = sessionData.length;
      const avgAttendance = totalSessions > 0
        ? sessionData.reduce((sum, s) => sum + (s.attendance?.count || 0), 0) / totalSessions
        : 0;

      setStats({ totalSessions, avgAttendance: Math.round(avgAttendance) });
    };

    loadData();
    const unsubscribe = subscribeToGeneralData(loadData);
    return () => unsubscribe();
  }, []);

  const nextEvent = events.find((event) => !event.completed);
  const getHomeTeamName = (event: Event) => {
    if (event.participation === 'inter_school') {
      return event.homeSchool?.trim() || event.title.trim() || 'Sanawar';
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-slate-900 to-background-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white mb-2">Dashboard Overview</h1>
          <p className="text-slate-400">Welcome back to a new term, Never Give In!</p>
        </div>

        {/* Next Event Card */}
        {nextEvent && (
          <div className="mb-10 glass-panel rounded-2xl border border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 border-b border-white/5">
              <div className="text-xs font-black uppercase tracking-widest text-primary mb-2">NEXT SCHEDULED</div>
              <div className="text-sm text-slate-300">{nextEvent.sport}</div>
            </div>

            <div className="p-8 space-y-6">
              {/* Event Header - Home Team + VS + Away Team */}
              <div className="text-center space-y-3">
                {nextEvent.participation === 'inter_school' ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex-1">
                      <h2 className="text-3xl font-black text-white">{getHomeTeamName(nextEvent)}</h2>
                    </div>
                    <div className="text-3xl font-black text-slate-400">VS</div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-black text-white">{nextEvent.opponentSchool?.trim() || 'TBD'}</h2>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-3xl font-black text-white">{nextEvent.title || nextEvent.sport}</h2>
                )}
              </div>

              {/* Event Details */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-white/5 p-4 border border-white/10">
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Date</div>
                  <div className="text-lg font-bold text-white">{new Date(nextEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-4 border border-white/10">
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Time</div>
                  <div className="text-lg font-bold text-white">{formatEventTime(nextEvent.time)}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-4 border border-white/10">
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Venue</div>
                  <div className="text-lg font-bold text-white">{nextEvent.venue}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-panel rounded-xl border border-primary/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Total Sessions</p>
                <p className="text-3xl font-black text-white">{stats.totalSessions}</p>
              </div>
              <Icon name="event_note" className="text-4xl text-primary/40" />
            </div>
          </div>
          <div className="glass-panel rounded-xl border border-primary/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Avg Attendance</p>
                <p className="text-3xl font-black text-white">{stats.avgAttendance}</p>
              </div>
              <Icon name="people" className="text-4xl text-primary/40" />
            </div>
          </div>
          <div className="glass-panel rounded-xl border border-primary/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Upcoming Events</p>
                <p className="text-3xl font-black text-white">{events.filter((e) => !e.completed).length}</p>
              </div>
              <Icon name="sports_soccer" className="text-4xl text-primary/40" />
            </div>
          </div>
        </div>

        {/* Recent Results */}
        <div className="glass-panel rounded-2xl border border-primary/10 p-6">
          <h2 className="text-xl font-black text-white mb-6">Recent Results</h2>
          <div className="space-y-3">
            {events
              .filter((e) => e.completed)
              .slice(-5)
              .reverse()
              .map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex-1">
                    <p className="text-white font-semibold">{event.title || event.sport}</p>
                    <p className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{event.result || '—'}</p>
                  </div>
                </div>
              ))}
            {events.filter((e) => e.completed).length === 0 && (
              <p className="text-center text-slate-400 py-6">No completed events yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
