import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { IMAGES } from '../constants';

const SidebarItem = ({ to, icon, label }: { to: string; icon: string; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
        ? 'bg-[linear-gradient(135deg,rgba(201,163,74,0.18),rgba(255,255,255,0.03))] border border-primary/30 text-white shadow-lg shadow-primary/10'
        : 'text-slate-400 hover:text-[#f8f1de] hover:bg-primary/[0.06] border border-transparent hover:border-primary/10'
      }`
    }
  >
    <Icon name={icon} className="text-[20px]" />
    <span className="font-semibold text-sm tracking-[0.08em] uppercase">{label}</span>
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
      case '/staff-login': return { title: 'Staff Login', subtitle: 'Protected access to staff-only controls' };
      default: return { title: 'Sanawar Sports', subtitle: 'Analytics Dashboard' };
    }
  };

  const { title, subtitle } = getTitle();

  return (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[560px] h-[560px] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[-8%] w-[420px] h-[420px] bg-house-nilgiri/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-12%] right-[8%] w-[460px] h-[460px] bg-house-himalaya/10 rounded-full blur-[130px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(201,163,74,0.04))]"></div>
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
        className={`glass-sidebar flex-shrink-0 flex flex-col h-full fixed z-40 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'}`}
      >
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-11 rounded-xl bg-[linear-gradient(135deg,#f1d386,#c9a34a_55%,#8d6b23)] flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.35)] border border-[#f3dfaa]/30">
              <Icon name="military_tech" className="text-[#091423] text-2xl" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[#f8f1de] text-lg font-bold leading-none tracking-[0.16em] uppercase">Sanawar</h1>
              <p className="text-primary text-[10px] uppercase font-bold mt-1 tracking-[0.28em]">Sports House</p>
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
          {/* Removed other navigation items */}
          <SidebarItem to="/hodsons" icon="directions_run" label="Hodsons 2026" />
          <SidebarItem to="/staff-login" icon="lock_person" label="Staff Login" />
        </nav>

      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:pl-64' : 'pl-0'}`}>
        {/* Header */}
        <header className="h-20 flex-shrink-0 px-4 md:px-8 flex items-center justify-between border-b border-primary/10 bg-background-dark/60 backdrop-blur-sm z-20">
          <div className="flex items-center gap-4">
            <button 
              className="text-white hover:text-primary transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Icon name="menu" />
            </button>
            <span className="font-bold text-lg text-[#f8f1de] lg:hidden tracking-[0.14em] uppercase">Sanawar Sports</span>
            
            <div className="hidden lg:flex flex-col ml-4 border-l border-primary/10 pl-6">
              <span className="royal-kicker mb-1">Championship Desk</span>
              <h2 className="text-xl font-bold text-[#f8f1de] tracking-[0.08em]">{title}</h2>
              <p className="text-sm text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Avatar (Hidden as Profile is removed) */}
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
