import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ProfileSetupModal from './components/ProfileSetupModal';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NotificationBanner } from './components/NotificationBanner';
import Home from './pages/Home';
import Seller from './pages/Seller';
import Buyer from './pages/Buyer';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-deep-charcoal text-white font-body relative">
          <NotificationBanner />
          <ProfileSetupModal />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/seller" element={<Seller />} />
            <Route path="/buyer" element={<Buyer />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AppProvider>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-black/20 border-t border-white/10 pt-20 pb-10 mt-auto">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-accent-pink text-3xl">gesture</span>
            <span className="font-bold text-2xl tracking-tighter">ReWeave</span>
          </div>
          <p className="text-gray-400 max-w-sm mb-6">Weaving a sustainable future for the textile industry through intelligent redistribution.</p>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="material-symbols-outlined text-sm">mail</span>
            <span>Contact <a href="mailto:agrimsethi09@gmail.com" className="text-white hover:text-accent-pink transition-colors">agrimsethi09@gmail.com</a> for support/business feedback.</span>
          </div>
        </div>

        <div className="lg:col-span-5 border-l border-white/5 pl-0 lg:pl-12">
          <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest text-accent-blue">Feedback</h4>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            We just launched recently and thus, we would be grateful to let us know your opinion about this platform and concept.
          </p>
          <a
            href="https://forms.gle/ycBjjTVjJkPcMg9X7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 hover:border-white/30 transition-all group"
          >
            Share Your Feedback
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">open_in_new</span>
          </a>
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 gap-8 lg:text-right">
          <div>
            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest text-accent-green">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><span className="hover:text-white transition-colors cursor-default">Browse Fabric</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">List Inventory</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">Analytics</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest text-accent-pink">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><span className="hover:text-white transition-colors cursor-default">Help Center</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">Terms of Use</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5">
        <p className="text-xs text-gray-500">© 2026 ReWeave. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <span className="text-gray-500 hover:text-white transition-colors cursor-default"><span className="material-symbols-outlined text-xl">settings</span></span>
          <span className="text-gray-500 hover:text-white transition-colors cursor-default"><span className="material-symbols-outlined text-xl">help</span></span>
        </div>
      </div>
    </div>
  </footer>
);

export default App;
