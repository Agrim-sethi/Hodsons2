import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  // Simplified nav for auth pages
  if (path === '/login' || path === '/signup') {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
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
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center glass-nav border border-white/10 rounded-full px-6 py-3 shadow-lg">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <span className="material-symbols-outlined text-accent-pink text-3xl transition-transform group-hover:rotate-12">gesture</span>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-xl tracking-tight text-white">ReWeave</span>
            {path.includes('seller') && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Seller Hub</span>}
            {path.includes('buyer') && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Marketplace</span>}
            {path.includes('profile') && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Business Hub</span>}
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <NavLink to="/" label="Home" active={path === '/'} />
          <NavLink to="/seller" label="Seller" active={path === '/seller'} />
          <NavLink to="/buyer" label="Buyer" active={path === '/buyer'} />
          <NavLink to="/analytics" label="Analytics" active={path === '/analytics'} />
        </div>

        <div className="flex items-center gap-4">
          <Link to="/profile" className="flex items-center gap-3 bg-white/5 pr-4 pl-1 py-1 rounded-full border border-white/10 hover:bg-white/10 transition-all">
            <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center text-deep-charcoal font-bold text-xs">JD</div>
            <span className="text-sm font-medium hidden sm:block text-white">John Doe</span>
            <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
          </Link>
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
