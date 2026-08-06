import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const { currentUser } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [path]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simplified nav for auth pages
  if (path === '/login' || path === '/signup') {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
        <Link to="/" className="text-white font-bold text-2xl tracking-tighter">ReWeave</Link>
        <div className="flex items-center space-x-8">
          <Link to="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            {path === '/login' ? 'Sign Up' : 'Log In'}
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center glass-nav border border-white/10 rounded-full px-5 py-3 shadow-lg relative">

        {/* Left: Logo / Menu Trigger */}
        <div className="relative" ref={menuRef}>
          {/* Mobile Menu Trigger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex items-center gap-2 group cursor-pointer focus:outline-none select-none text-left"
          >
            <span className="material-symbols-outlined text-accent-pink text-3xl transition-transform group-hover:rotate-12">gesture</span>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xl tracking-tight text-white">ReWeave</span>
                <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </div>
              {/* Mobile Page Indicator */}
              <span className="text-[10px] text-accent-green uppercase tracking-widest font-bold pl-0.5">
                {path === '/' ? 'Home' : path === '/seller' ? 'Seller Hub' : path === '/buyer' ? 'Marketplace' : path === '/analytics' ? 'Stats' : path.substring(1)}
              </span>
            </div>
          </button>

          {/* Desktop Logo Link */}
          <Link to="/" className="hidden md:flex items-center gap-2 group cursor-pointer">
            <span className="material-symbols-outlined text-accent-pink text-3xl transition-transform group-hover:rotate-12">gesture</span>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-xl tracking-tight text-white">ReWeave</span>
              {path.includes('seller') && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Seller Hub</span>}
              {path.includes('buyer') && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Marketplace</span>}
              {path.includes('analytics') && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Market Insights</span>}
              {path.includes('profile') && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Business Hub</span>}
            </div>
          </Link>

          {/* Mobile Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-4 w-64 bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 flex flex-col gap-1 animate-fade-up z-[60] overflow-hidden">
              <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-gray-500 border-b border-white/5 mb-1">Navigate</div>
              <MobileMenuItem to="/" icon="home" label="Home" active={path === '/'} />
              <MobileMenuItem to="/seller" icon="storefront" label="Seller Studio" active={path === '/seller'} />
              <MobileMenuItem to="/buyer" icon="shopping_bag" label="Marketplace" active={path === '/buyer'} />
              <MobileMenuItem to="/analytics" icon="bar_chart" label="Analytics" active={path === '/analytics'} />
            </div>
          )}
        </div>

        {/* Desktop Menu Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <NavLink to="/" label="Home" active={path === '/'} />
          <NavLink to="/seller" label="Seller" active={path === '/seller'} />
          <NavLink to="/buyer" label="Buyer" active={path === '/buyer'} />
          <NavLink to="/analytics" label="Analytics" active={path === '/analytics'} />
        </div>

        {/* User Profile / Login - Visible on Mobile now */}
        <div className="flex items-center gap-4">
          {currentUser ? (
            <Link to="/profile" className="flex items-center gap-3 bg-white/5 pr-1 md:pr-4 pl-1 py-1 rounded-full border border-white/10 hover:bg-white/10 transition-all group">
              <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center text-deep-charcoal font-bold text-xs uppercase group-hover:scale-110 transition-transform">
                {currentUser.companyName ? currentUser.companyName.substring(0, 2) : currentUser.email ? currentUser.email.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <span className="text-sm font-medium hidden md:block text-white max-w-[100px] truncate">{currentUser.companyName || currentUser.email || 'User'}</span>
              <span className="material-symbols-outlined text-gray-400 text-lg group-hover:text-white transition-colors hidden md:block">expand_more</span>
            </Link>
          ) : (
            <Link to="/login" className="px-4 md:px-5 py-2 rounded-full bg-white text-deep-charcoal font-bold text-xs md:text-sm hover:bg-gray-200 transition-colors shadow-lg">
              Log In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link
    to={to}
    className={`relative transition-colors ${active ? 'text-white' : 'hover:text-white'} ${active ? 'border-b-2 border-accent-pink pb-1' : ''}`}
  >
    {label}
  </Link>
);

const MobileMenuItem: React.FC<{ to: string; icon: string; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        ${active ? 'bg-accent-pink text-deep-charcoal font-bold' : 'text-gray-300 hover:bg-white/5'}
      `}
  >
    <span className={`material-symbols-outlined ${active ? 'text-deep-charcoal' : 'text-accent-pink'}`}>{icon}</span>
    <span className="text-sm">{label}</span>
    {active && <span className="material-symbols-outlined text-sm ml-auto">check</span>}
  </Link>
);
