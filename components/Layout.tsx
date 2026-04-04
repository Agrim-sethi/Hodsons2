import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { IMAGES } from '../constants';

const SidebarItem = ({ to, icon, label }: { to: string; icon: string; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
        ? 'bg-primary/20 border border-primary/20 text-white shadow-lg shadow-primary/5'
        : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`
    }
  >
    <Icon name={icon} className="text-[20px]" />
    <span className="font-medium text-sm">{label}</span>
  </NavLink>
);

const Layout: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  // Handle responsive behavior
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile after navigation
  React.useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // Determine Title based on route
  const getTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return { title: 'Dashboard Overview', subtitle: 'Welcome back to a new term, Never Give In!' };
      case '/standings': return { title: 'House Standings', subtitle: 'Live Annual Championship Tracking' };
      case '/events': return { title: 'Upcoming Fixtures', subtitle: 'Match schedules and reminders' };
      case '/archive': return { title: 'Event Archive', subtitle: 'Historical records and results' };
      case '/profile': return { title: 'User Profile', subtitle: 'Account details and preferences' };
      case '/attendance': return { title: 'Sports Attendance', subtitle: 'Individual participation tracking' };
      case '/teams': return { title: 'School Teams', subtitle: 'Competitive squads across all age groups' };
      case '/hodsons': return { title: 'Hodson\'s Run 2026', subtitle: 'Annual Cross Country Championship' };
      default: return { title: 'Sanawar Sports', subtitle: 'Analytics Dashboard' };
    }
  };

  const { title, subtitle } = getTitle();

  return (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-house-nilgiri/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-house-himalaya/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`glass-sidebar w-64 flex-shrink-0 flex flex-col h-full fixed lg:relative z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute'}`}
      >
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/50">
              <Icon name="sports_soccer" className="text-white text-2xl" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-lg font-bold leading-none tracking-tight">Sanawar</h1>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1 tracking-widest">Sports</p>
            </div>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <Icon name="close" size="24" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 flex flex-col gap-2 overflow-y-auto">
          <SidebarItem to="/dashboard" icon="dashboard" label="Overview" />
          <SidebarItem to="/standings" icon="trophy" label="Standings" />
          <SidebarItem to="/events" icon="calendar_month" label="Events" />
          <SidebarItem to="/archive" icon="history" label="Archive" />
          <SidebarItem to="/attendance" icon="analytics" label="Attendance" />
          <SidebarItem to="/teams" icon="groups" label="School Teams" />
          <SidebarItem to="/hodsons" icon="directions_run" label="Hodsons 2026" />
        </nav>

        <div className="p-4">
          <NavLink to="/profile" className="block">
            <div className="glass-panel p-4 rounded-xl flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group">
              <div
                className="size-10 rounded-full bg-cover bg-center border border-white/20 group-hover:border-primary/50 transition-colors"
                style={{ backgroundImage: `url('${IMAGES.avatar}')` }}
              ></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white group-hover:text-primary transition-colors">Coach Singh</p>
                <p className="text-xs text-slate-400 truncate">Head of Football</p>
              </div>
              <button className="text-slate-400 group-hover:text-white transition-colors">
                <Icon name="settings" className="text-sm border border-transparent group-hover:border-white/10 p-1 rounded-md" />
              </button>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full">
        {/* Header */}
        <header className="h-20 flex-shrink-0 px-4 md:px-8 flex items-center justify-between border-b border-white/5 bg-background-dark/50 backdrop-blur-sm z-20">
          <div className="flex items-center gap-4">
            <button 
              className="text-white hover:text-primary transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Icon name="menu" />
            </button>
            <span className="font-bold text-lg text-white lg:hidden">Sanawar Sports</span>
            
            <div className="hidden lg:flex flex-col ml-4 border-l border-white/10 pl-6">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-sm text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Avatar */}
            <NavLink to="/profile" className="lg:hidden size-10 rounded-full bg-cover bg-center border border-white/20" style={{ backgroundImage: `url('${IMAGES.avatar}')` }}></NavLink>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;