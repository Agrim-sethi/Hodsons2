import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
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
      <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-accent-pink text-3xl">gesture</span>
            <span className="font-bold text-2xl tracking-tighter">ReWeave</span>
          </div>
          <p className="text-gray-400 max-w-sm">Weaving a sustainable future for the textile industry through intelligent redistribution.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          <div>
            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest text-accent-green">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a className="hover:text-white transition-colors" href="#">Browse Fabric</a></li>
              <li><a className="hover:text-white transition-colors" href="#">List Inventory</a></li>
              <li><a className="hover:text-white transition-colors" href="#">Analytics</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-widest text-accent-pink">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a className="hover:text-white transition-colors" href="#">Help Center</a></li>
              <li><a className="hover:text-white transition-colors" href="#">Terms of Use</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5">
        <p className="text-xs text-gray-500">© 2024 ReWeave. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a className="text-gray-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-xl">settings</span></a>
          <a className="text-gray-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-xl">help</span></a>
        </div>
      </div>
    </div>
  </footer>
);

export default App;