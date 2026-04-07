import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import ModalHeader from '../components/ui/ModalHeader';
import { useToast } from '../components/ui/ToastProvider';
import { IMAGES, HOUSE_COLORS } from '../constants';
import { saveEvent, Event, getEvents, updateEvent, deleteEvent, getUserProfile, saveUserProfile, UserProfile } from '../utils/storage';

const SPORTS = [
    { name: 'Football', icon: 'sports_soccer' },
    { name: 'Basketball', icon: 'sports_basketball' },
    { name: 'Cricket', icon: 'sports_cricket' },
    { name: 'Hockey', icon: 'sports_hockey' },
    { name: 'Athletics', icon: 'sprint' },
];

const HOUSES = [
    { name: 'Himalaya', code: 'H', config: HOUSE_COLORS.himalaya },
    { name: 'Nilgiri', code: 'N', config: HOUSE_COLORS.nilgiri },
    { name: 'Siwalik', code: 'S', config: HOUSE_COLORS.siwalik },
    { name: 'Vindhya', code: 'V', config: HOUSE_COLORS.vindhya },
];

const Profile: React.FC = () => {
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [userEvents, setUserEvents] = useState<Event[]>([]);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile>({
        name: 'Coach Singh',
        role: 'Faculty Coach',
        department: 'Head of Football Department',
        email: 'coach.singh@sanawar.edu.in',
        phone: '+91 98765 43210',
        avatar: IMAGES.avatar
    });

    const [profileFormData, setProfileFormData] = useState<UserProfile>(userProfile);

    const initialFormState = {
        sport: 'Football',
        participation: 'houses',
        selectedHouses: [] as string[],
        homeSchool: '',
        opponentSchool: '',
        ageCategory: 'Seniors',
        time: '14:00',
        date: new Date().toISOString().split('T')[0],
        venue: 'Peacestead',
        teachers: '',
        title: 'Inter-House Match',
        athleticsDetail: '',
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        setUserEvents(getEvents());
        const storedProfile = getUserProfile();
        if (storedProfile) {
            setUserProfile(storedProfile);
            setProfileFormData(storedProfile);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const sportIcon = SPORTS.find(s => s.name === formData.sport)?.icon || 'sports';

        const eventData: Event = {
            id: editingId || Date.now().toString(),
            sport: formData.sport,
            sportIcon,
            participation: formData.participation as any,
            houses: formData.selectedHouses,
            homeSchool: formData.homeSchool,
            opponentSchool: formData.opponentSchool,
            ageCategory: formData.ageCategory,
            time: formData.time,
            date: formData.date,
            venue: formData.venue,
            teachers: formData.teachers,
            title: formData.title,
            subtext: formData.ageCategory,
            athleticsDetail: formData.sport === 'Athletics' ? formData.athleticsDetail : undefined
        };

        if (editingId) {
            updateEvent(eventData);
        } else {
            saveEvent(eventData);
        }

        showToast({
            title: editingId ? 'Event Updated' : 'Event Created',
            description: `${eventData.title} has been saved to your schedule.`
        });

        setShowModal(false);
        setEditingId(null);
        setFormData(initialFormState);
        setUserEvents(getEvents());
    };

    const handleEdit = (event: Event) => {
        setEditingId(event.id);
        setFormData({
            ...initialFormState,
            sport: event.sport,
            participation: event.participation,
            selectedHouses: event.houses || [],
            homeSchool: event.homeSchool || '',
            opponentSchool: event.opponentSchool || '',
            ageCategory: event.ageCategory,
            time: event.time,
            date: event.date,
            venue: event.venue,
            teachers: event.teachers,
            title: event.title,
            athleticsDetail: event.athleticsDetail || '',
        });
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            deleteEvent(id);
            setUserEvents(getEvents());
        }
    };

    const toggleHouse = (code: string) => {
        setFormData(prev => ({
            ...prev,
            selectedHouses: prev.selectedHouses.includes(code)
                ? prev.selectedHouses.filter(c => c !== code)
                : [...prev.selectedHouses, code]
        }));
    };

    const [showResultModal, setShowResultModal] = useState(false);
    const [resultEventId, setResultEventId] = useState<string | null>(null);
    const [resultDetails, setResultDetails] = useState({
        winner: '',
        score: '',
        points: '',
        scorers: '',
        mvp: '',
        comments: ''
    });

    const handleAddResult = (id: string) => {
        const event = userEvents.find(e => e.id === id);
        setResultEventId(id);
        if (event?.resultDetails) {
            setResultDetails({
                winner: event.resultDetails.winner || '',
                score: event.resultDetails.score || '',
                points: event.resultDetails.points || '',
                scorers: event.resultDetails.scorers || '',
                mvp: event.resultDetails.mvp || '',
                comments: event.resultDetails.comments || ''
            });
        } else {
            setResultDetails({
                winner: '',
                score: '',
                points: '',
                scorers: '',
                mvp: '',
                comments: ''
            });
        }
        setShowResultModal(true);
    };

    const submitResult = () => {
        if (resultEventId) {
            const event = userEvents.find(e => e.id === resultEventId);
            if (event) {
                // Construct a summary string for backward compatibility or simple view
                const summary = `${resultDetails.winner} won ${resultDetails.score}`;
                const updatedEvent = {
                    ...event,
                    completed: true,
                    result: summary,
                    resultDetails: resultDetails
                };
                updateEvent(updatedEvent);
                setUserEvents(getEvents());
                setShowResultModal(false);
                setResultEventId(null);
                showToast({
                    title: 'Result Saved',
                    description: `${event.title} now reflects the updated match result.`
                });
            }
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveUserProfile(profileFormData);
        setUserProfile(profileFormData);
        setShowProfileModal(false);
        showToast({
            title: 'Profile Saved',
            description: 'Your staff profile details were updated successfully.'
        });
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileFormData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Profile Header */}
            <div className="glass-panel rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="size-32 rounded-full p-1 border-2 border-primary/50">
                    <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${userProfile.avatar}')` }}></div>
                </div>
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-white">{userProfile.name}</h1>
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/20 uppercase tracking-wider">{userProfile.role}</span>
                    </div>
                    <p className="text-lg text-slate-300 mb-4">{userProfile.department}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-colors flex items-center gap-2">
                            <Icon name="mail" className="text-lg" /> {userProfile.email}
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-colors flex items-center gap-2">
                            <Icon name="call" className="text-lg" /> {userProfile.phone}
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => {
                            setProfileFormData(userProfile);
                            setShowProfileModal(true);
                        }}
                        className="px-6 py-3 rounded-lg royal-primary-btn font-bold flex items-center justify-center gap-2"
                    >
                        <Icon name="edit" /> Edit Profile
                    </button>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData(initialFormState);
                            setShowModal(true);
                        }}
                        className="px-6 py-3 rounded-lg royal-secondary-btn font-bold flex items-center justify-center gap-2"
                    >
                        <Icon name="add_circle" /> Add Event
                    </button>
                </div>
            </div>

            {/* Managed Events List */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Managed Events</h2>
                    <span className="text-xs text-slate-400 font-medium">{userEvents.length} events listed</span>
                </div>

                <div className="space-y-4">
                    {userEvents.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-xl">
                            <Icon name="event_busy" className="text-4xl text-slate-600 mb-2" />
                            <p className="text-slate-400">No events created yet. Click "Add Event" to get started.</p>
                        </div>
                    ) : (
                        userEvents.map((event) => (
                            <div key={event.id} className={`bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all ${event.completed ? 'opacity-70' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`size-12 rounded-lg ${event.completed ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'} flex items-center justify-center`}>
                                        <Icon name={event.completed ? 'check_circle' : event.sportIcon} size="24" />
                                    </div>
                                    <div>
                                        <h4 className={`text-white font-bold ${event.completed ? 'line-through decoration-slate-500' : ''}`}>{event.title} {event.athleticsDetail ? `(${event.athleticsDetail})` : ''}</h4>
                                        <p className="text-xs text-slate-400 flex items-center gap-2">
                                            {event.completed ? (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <span className="text-green-400 font-bold text-sm">{event.result}</span>
                                                    {event?.resultDetails && (
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-white/5 p-2 rounded-md mt-1 border border-white/5">
                                                            {event.resultDetails.points && <span><span className="text-slate-500">Points:</span> <span className="text-white">{event.resultDetails.points}</span></span>}
                                                            {event.resultDetails.mvp && <span><span className="text-slate-500">MVP:</span> <span className="text-white">{event.resultDetails.mvp}</span></span>}
                                                            {event.resultDetails.scorers && <span className="col-span-2"><span className="text-slate-500">Scorers:</span> <span className="text-white">{event.resultDetails.scorers}</span></span>}
                                                            {event.resultDetails.comments && <span className="col-span-2 italic text-slate-500 mt-1 border-t border-white/5 pt-1">"{event.resultDetails.comments}"</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <span>{event.sport}</span> •
                                                    <span>{new Date(event.date).toLocaleDateString()}</span> •
                                                    <span>{event.venue}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!event.completed && (
                                        <button
                                            onClick={() => handleAddResult(event.id)}
                                            className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold transition-colors mr-2 border border-green-500/20"
                                        >
                                            Add Result
                                        </button>
                                    )}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => event.completed ? handleAddResult(event.id) : handleEdit(event)}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                                            title={event.completed ? "Edit Result" : "Edit Event Info"}
                                        >
                                            <Icon name="edit" size="20" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(event.id)}
                                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                            title="Delete Event"
                                        >
                                            <Icon name="delete" size="20" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
                        <ModalHeader
                            kicker={editingId ? 'Edit Fixture' : 'Event Planner'}
                            icon={editingId ? 'edit_calendar' : 'event_available'}
                            title={editingId ? 'Update Event' : 'Add New Event'}
                            subtitle="Capture fixtures, timings, venues, and participant details in one place."
                            onClose={() => setShowModal(false)}
                        />

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Sport</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={formData.sport}
                                        onChange={e => setFormData({ ...formData, sport: e.target.value })}
                                    >
                                        {SPORTS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                {formData.sport === 'Athletics' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-sm font-medium text-slate-400">Athletics Event Type</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={formData.athleticsDetail}
                                            onChange={e => setFormData({ ...formData, athleticsDetail: e.target.value })}
                                            placeholder="e.g. 100m, 200m, High Jump"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Event Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Inter-House Final"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Age Category</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={formData.ageCategory}
                                        onChange={e => setFormData({ ...formData, ageCategory: e.target.value })}
                                        placeholder="e.g. Seniors / U-17"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Participation</label>
                                    <div className="flex flex-wrap gap-4">
                                        <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="participation"
                                                value="houses"
                                                checked={formData.participation === 'houses'}
                                                onChange={e => setFormData({ ...formData, participation: e.target.value })}
                                                className="accent-primary"
                                            /> Inter-House
                                        </label>
                                        <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="participation"
                                                value="inter_school"
                                                checked={formData.participation === 'inter_school'}
                                                onChange={e => setFormData({ ...formData, participation: e.target.value })}
                                                className="accent-primary"
                                            /> Inter-School
                                        </label>
                                        <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="participation"
                                                value="individual"
                                                checked={formData.participation === 'individual'}
                                                onChange={e => setFormData({ ...formData, participation: e.target.value })}
                                                className="accent-primary"
                                            /> Individual
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {formData.participation === 'houses' && (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-400">Select Competing Houses</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {HOUSES.map(house => (
                                            <button
                                                key={house.code}
                                                type="button"
                                                onClick={() => toggleHouse(house.code)}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.selectedHouses.includes(house.code)
                                                    ? `${house.config.bg} border-white/50 text-white shadow-lg`
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${formData.selectedHouses.includes(house.code) ? 'bg-white/20' : house.config.bg
                                                    }`}>
                                                    {house.code}
                                                </div>
                                                <span className="text-xs font-bold">{house.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.participation === 'inter_school' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">School 1</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={(formData as any).homeSchool || ''}
                                            onChange={e => setFormData({ ...formData, homeSchool: e.target.value } as any)}
                                            placeholder="e.g. Sanawar"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">School 2</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={(formData as any).opponentSchool || ''}
                                            onChange={e => setFormData({ ...formData, opponentSchool: e.target.value } as any)}
                                            placeholder="e.g. BCS, Lawrence School"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary accent-primary"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary accent-primary"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Venue</label>
                                    <select
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={formData.venue}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                    >
                                        <option value="" disabled>Select Venue</option>
                                        {/* Football */}
                                        {(formData.sport === 'Football' || formData.sport === 'Hockey' || formData.sport === 'Cricket') && (
                                            <>
                                                <option value="Peacestead">Peacestead</option>
                                                <option value="New Field">New Field</option>
                                                <option value="Barne Field">Barne Field</option>
                                            </>
                                        )}
                                        {/* Basketball */}
                                        {formData.sport === 'Basketball' && (
                                            <>
                                                <option value="Peacestead Basketball Courts">Peacestead Basketball Courts</option>
                                                <option value="Honoria Court">Honoria Court</option>
                                                <option value="Trafford Court">Trafford Court</option>
                                            </>
                                        )}
                                        {/* Other Specifics */}
                                        {formData.sport === 'Athletics' && <option value="Peacestead">Peacestead</option>}
                                        {/* Generic Options if sport doesn't match above or as fallbacks */}
                                        <option value="Shooting Hall">Shooting Hall</option>
                                        <option value="Squash Courts">Squash Courts</option>
                                        <option value="SSC">SSC (Badminton)</option>
                                        <option value="Swimming (SSC)">Swimming (SSC)</option>
                                        <option value="Staff Courts">Staff Courts (Tennis)</option>
                                        <option value="Gaskel Hall">Gaskel Hall</option>
                                        <option value="Peacestead">Peacestead (General)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Teacher(s) in Charge</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={formData.teachers}
                                    onChange={e => setFormData({ ...formData, teachers: e.target.value })}
                                    placeholder="e.g. Coach Smith, Mr. Khanna"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                className="flex-1 px-6 py-3 rounded-lg royal-secondary-btn font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-3 rounded-lg royal-primary-btn font-bold"
                                >
                                    Create Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {showResultModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
                        <ModalHeader
                            compact
                            kicker="Results Ledger"
                            icon="emoji_events"
                            title="Add Game Result"
                            subtitle="Record the winner, scoreline, points, and standout performers."
                            onClose={() => setShowResultModal(false)}
                        />
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {(() => {
                                const currentEvent = userEvents.find(e => e.id === resultEventId);
                                return (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-400 mb-2 block">Winner</label>
                                            {currentEvent?.participation === 'houses' ? (
                                                <select
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                                    value={resultDetails.winner}
                                                    onChange={(e) => setResultDetails({ ...resultDetails, winner: e.target.value })}
                                                >
                                                    <option value="" className="bg-slate-900 text-slate-500 italic">Select House</option>
                                                    {HOUSES.map(h => <option key={h.name} value={h.name} className="bg-slate-900 text-white">{h.name}</option>)}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="e.g. Himalaya"
                                                    value={resultDetails.winner}
                                                    onChange={(e) => setResultDetails({ ...resultDetails, winner: e.target.value })}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-400 mb-2 block">Result</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="e.g. 2 - 1"
                                                value={resultDetails.score}
                                                onChange={(e) => setResultDetails({ ...resultDetails, score: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">House Points</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="e.g. 4"
                                        value={resultDetails.points}
                                        onChange={(e) => setResultDetails({ ...resultDetails, points: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-400 mb-2 block">Key Performers / Scorers</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g. Amit (2 goals), Rahul (1 assist)"
                                    value={resultDetails.scorers}
                                    onChange={(e) => setResultDetails({ ...resultDetails, scorers: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-400 mb-2 block">MVP</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g. Karan (H)"
                                    value={resultDetails.mvp}
                                    onChange={(e) => setResultDetails({ ...resultDetails, mvp: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-400 mb-2 block">Match Comments</label>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                                    placeholder="Brief summary regarding the match..."
                                    value={resultDetails.comments}
                                    onChange={(e) => setResultDetails({ ...resultDetails, comments: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowResultModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg royal-secondary-btn font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitResult}
                                    className="flex-1 px-4 py-2 rounded-lg royal-primary-btn font-bold"
                                >
                                    Save Result
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <ModalHeader
                            compact
                            kicker="Staff Profile"
                            icon="badge"
                            title="Edit Profile"
                            subtitle="Keep contact details and display identity current for the dashboard."
                            onClose={() => setShowProfileModal(false)}
                        />
                        <form onSubmit={handleProfileSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={profileFormData.name}
                                        onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">Role</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={profileFormData.role}
                                        onChange={(e) => setProfileFormData({ ...profileFormData, role: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">Department</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={profileFormData.department}
                                        onChange={(e) => setProfileFormData({ ...profileFormData, department: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={profileFormData.email}
                                        onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">Phone Number</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={profileFormData.phone}
                                        onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block text-center">Profile Picture</label>
                                    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                                        <div className="size-24 rounded-full border-2 border-primary/50 overflow-hidden">
                                            <div
                                                className="w-full h-full bg-cover bg-center"
                                                style={{ backgroundImage: `url('${profileFormData.avatar}')` }}
                                            ></div>
                                        </div>
                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                        />
                                        <label
                                            htmlFor="avatar-upload"
                                            className="px-4 py-2 rounded-lg royal-secondary-btn text-sm font-bold cursor-pointer flex items-center gap-2"
                                        >
                                            <Icon name="upload" size="18" /> Upload New Photo
                                        </label>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Recommended: Square image, max 2MB</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-white/5 bg-background-dark/50 shrink-0 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl royal-secondary-btn font-bold flex items-center justify-center gap-2"
                                >
                                    <Icon name="close" size="20" /> Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-4 py-3 rounded-xl royal-primary-btn font-bold flex items-center justify-center gap-2"
                                >
                                    <Icon name="save" size="20" /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Optional: Add recent events by this user here */}
            </div>
        </div>
    );
};

export default Profile;
