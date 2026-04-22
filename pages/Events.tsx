import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS, IMAGES } from '../constants';
import { getEvents, Event } from '../utils/storage';

const EventCard = ({ sport, date, h1, h2, time, location, title, subtext, color, participation, houses, school1, school2, onViewDetails }: any) => {
    // Determine which houses to show
    const houseList = houses || (h1 && h2 ? [h1, h2] : []);
    const accentMap: Record<string, string> = {
        red: '#b91c1c',
        orange: '#c97d21',
        amber: '#c9a34a',
        yellow: '#c9a34a',
        green: '#15803d',
        emerald: '#1f8b5b',
        teal: '#0f766e',
        blue: '#2f5c8f',
        indigo: '#3f4d8c',
        purple: '#6b4ea0',
        pink: '#b55f89'
    };
    const accent = accentMap[color] ?? '#c9a34a';

    return (
        <div
            className="glass-panel rounded-xl p-5 flex flex-col gap-4 border border-primary/10 transition-all group relative overflow-hidden hover:-translate-y-0.5"
            style={{ boxShadow: `inset 0 1px 0 rgba(255,244,214,0.04), 0 16px 32px rgba(0,0,0,0.18), 0 0 0 1px ${accent}22` }}
        >
            <div className="absolute inset-0 rounded-xl border border-transparent pointer-events-none transition-all duration-300" style={{ borderColor: `${accent}33` }}></div>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-1">
                    <span className="royal-kicker flex items-center gap-1">
                        <Icon name={sport.icon || sport} className="text-[14px]" /> {sport.name || sport} • {subtext}
                    </span>
                    <h3 className="text-white text-lg font-bold leading-tight">{title}</h3>
                </div>
                <div className="px-2 py-1 royal-stat-card rounded text-xs font-medium text-white text-center min-w-[40px]">
                    <span className="block text-[10px] text-slate-400 uppercase">{typeof date === 'string' ? new Date(date).toLocaleString('default', { month: 'short' }) : date.month}</span>
                    <span className="block text-sm font-bold">{typeof date === 'string' ? new Date(date).getDate() : date.day}</span>
                </div>
            </div>

            <div className="flex items-center justify-between py-4 border-y border-white/5 relative z-10">
                {participation === 'inter_school' ? (
                    <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex flex-col items-center gap-2 w-1/3">
                            <div className="size-14 rounded-full bg-background-dark p-1 ring-2 ring-primary shadow-lg flex items-center justify-center">
                                <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                    <Icon name="school" size="24" />
                                </div>
                            </div>
                            <span className="text-white text-sm font-semibold max-w-[100px] text-center line-clamp-2">{school1 || 'School 1'}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-2xl font-black text-white/20">VS</span>
                            <span className="text-xs text-slate-400 font-mono bg-background-dark px-2 py-0.5 rounded">{time}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 w-1/3">
                            <div className="size-14 rounded-full bg-background-dark p-1 ring-2 ring-primary shadow-lg flex items-center justify-center">
                                <div className="w-full h-full rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold">
                                    <Icon name="school" size="24" />
                                </div>
                            </div>
                            <span className="text-white text-sm font-semibold max-w-[100px] text-center line-clamp-2">{school2 || 'School 2'}</span>
                        </div>
                    </div>
                ) : participation === 'individual' ? (
                    <div className="flex flex-col items-center justify-center w-full gap-2">
                        <div className="flex items-center justify-center gap-4 text-white/50">
                            <Icon name="person" size="32" />
                            <Icon name="person" size="32" />
                            <Icon name="person" size="32" />
                        </div>
                        <span className="text-white text-sm font-semibold italic">Individual Event</span>
                        <span className="text-xs text-slate-400 font-mono bg-background-dark px-2 py-0.5 rounded">{time}</span>
                    </div>
                ) : (
                    <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex flex-col items-center gap-2 w-1/3">
                            <div className={`size-14 rounded-full bg-background-dark p-1 ring-2 ${houseList[0]?.config?.text.replace('text', 'ring') || 'ring-primary'} shadow-lg`}>
                                <div className={`w-full h-full rounded-full ${houseList[0]?.config?.bg || 'bg-primary'} flex items-center justify-center ${houseList[0]?.config?.hex === '#eab308' ? 'text-black' : 'text-white'} font-bold text-xl`}>
                                    {houseList[0]?.code || houseList[0]?.charAt(0) || '?'}
                                </div>
                            </div>
                            <span className="text-white text-sm font-semibold">{houseList[0]?.name || houseList[0] || 'TBD'}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-2xl font-black text-white/20">VS</span>
                            <span className="text-xs text-slate-400 font-mono bg-background-dark px-2 py-0.5 rounded">{time}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 w-1/3">
                            <div className={`size-14 rounded-full bg-background-dark p-1 ring-2 ${houseList[1]?.config?.text.replace('text', 'ring') || 'ring-white/20'} shadow-lg`}>
                                <div className={`w-full h-full rounded-full ${houseList[1]?.config?.bg || 'bg-white/10'} flex items-center justify-center ${houseList[1]?.config?.hex === '#eab308' ? 'text-black' : 'text-white'} font-bold text-xl`}>
                                    {houseList[1]?.code || houseList[1]?.charAt(0) || '?'}
                                </div>
                            </div>
                            <span className="text-white text-sm font-semibold">{houseList[1]?.name || houseList[1] || 'TBD'}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Icon name="location_on" className="text-[18px]" />
                    {location}
                </div>
                <div className="flex items-center justify-between gap-3 mt-1">
                    <button
                        onClick={onViewDetails}
                        className="w-full royal-secondary-btn text-sm font-medium py-2 rounded-lg"
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
};

const Events: React.FC = () => {
    const [userEvents, setUserEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    useEffect(() => {
        const allEvents = getEvents();
        const activeEvents = allEvents.filter(e => !e.completed);
        setUserEvents(activeEvents);
    }, []);

    const getHouseConfig = (code: string) => {
        switch (code) {
            case 'H': return { name: 'Himalaya', code: 'H', config: HOUSE_COLORS.himalaya };
            case 'N': return { name: 'Nilgiri', code: 'N', config: HOUSE_COLORS.nilgiri };
            case 'S': return { name: 'Siwalik', code: 'S', config: HOUSE_COLORS.siwalik };
            case 'V': return { name: 'Vindhya', code: 'V', config: HOUSE_COLORS.vindhya };
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto w-full py-10">
            <div className="px-4 mb-8">
                <div className="royal-kicker mb-2">Fixtures Desk</div>
                <h1 className="text-3xl font-bold text-white">Sports Events</h1>
                <p className="royal-subtitle mt-2 max-w-2xl">Upcoming fixtures, house matchups, and school contests in one cleaner view.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {/* User Added Events */}
                {userEvents.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass-panel section-plaque rounded-2xl border-2 border-dashed border-primary/10">
                        <Icon name="event_busy" className="text-5xl text-slate-700 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Events Found</h3>
                        <p className="text-slate-400">Scheduled events will appear here once they are created through the staff-managed controls.</p>
                    </div>
                ) : (
                    userEvents.map((event) => (
                        <EventCard
                            key={event.id}
                            title={event.title + (event.athleticsDetail ? ` (${event.athleticsDetail})` : '')}
                            subtext={event.subtext}
                            date={event.date}
                            time={event.time}
                            sport={{ name: event.sport, icon: event.sportIcon }}
                            location={event.venue}
                            participation={event.participation}
                            houses={event.houses?.map(h => getHouseConfig(h))}
                            school1={event.homeSchool}
                            school2={event.opponentSchool}
                            color="blue"
                            onViewDetails={() => setSelectedEvent(event)}
                        />
                    ))
                )}
            </div>

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                    <Icon name={selectedEvent.sportIcon} size="24" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Event Details</h2>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white transition-colors">
                                <Icon name="close" size="24" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{selectedEvent.title}</h3>
                                <p className="text-primary font-bold">{selectedEvent.sport} • {selectedEvent.ageCategory}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Icon name="calendar_today" size="14" /> Date
                                    </p>
                                    <p className="text-white font-medium">{new Date(selectedEvent.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Icon name="schedule" size="14" /> Time
                                    </p>
                                    <p className="text-white font-medium">{selectedEvent.time}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Icon name="location_on" size="14" /> Venue
                                    </p>
                                    <p className="text-white font-medium">{selectedEvent.venue}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                        <Icon name="person" size="14" /> In-Charge
                                    </p>
                                    <p className="text-white font-medium">{selectedEvent.teachers}</p>
                                </div>
                            </div>

                            {selectedEvent.participation === 'houses' && selectedEvent.houses && (
                                <div className="pt-6 border-t border-white/5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Competing Houses</p>
                                    <div className="flex gap-4">
                                        {selectedEvent.houses.map(houseCode => {
                                            const config = getHouseConfig(houseCode);
                                            return (
                                                <div key={houseCode} className="flex flex-col items-center gap-2">
                                                    <div className={`size-12 rounded-xl ${config?.config.bg} flex items-center justify-center text-white font-bold shadow-lg border border-white/10`}>
                                                        {houseCode}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{config?.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedEvent.participation === 'inter_school' && (
                                <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/50 overflow-hidden p-2">
                                            <Icon name="school" className="text-primary" size="32" />
                                        </div>
                                        <span className="text-xs text-white font-bold underline decoration-primary decoration-2 underline-offset-4 uppercase max-w-[120px] text-center">{selectedEvent.homeSchool || 'School 1'}</span>
                                    </div>
                                    <span className="text-2xl font-black text-white/10 italic">VS</span>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50 shadow-inner overflow-hidden p-2">
                                            <Icon name="school" className="text-red-500" size="32" />
                                        </div>
                                        <span className="text-xs text-white font-bold underline decoration-red-500 decoration-2 underline-offset-4 uppercase tracking-tighter text-center max-w-[120px] line-clamp-2">{selectedEvent.opponentSchool || 'School 2'}</span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6">
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 transition-all uppercase tracking-widest text-xs"
                                >
                                    Dismiss Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Events;
