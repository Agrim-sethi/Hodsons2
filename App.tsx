import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Standings from './pages/Standings';
import Events from './pages/Events';
import Archive from './pages/Archive';
import Profile from './pages/Profile';
import Attendance from './pages/Attendance';
import SchoolTeams from './pages/SchoolTeams';
import Hodsons from './pages/Hodsons';
import { ToastProvider } from './components/ui/ToastProvider';
import { StaffAuthProvider } from './components/auth/StaffAuthProvider';
import StaffLogin from './pages/StaffLogin';

export default function App() {
  return (
    <ToastProvider>
      <StaffAuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/hodsons" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="standings" element={<Standings />} />
              <Route path="events" element={<Events />} />
              <Route path="archive" element={<Archive />} />
              <Route path="profile" element={<Profile />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="teams" element={<SchoolTeams />} />
              <Route path="hodsons" element={<Hodsons />} />
              <Route path="staff-login" element={<StaffLogin />} />
            </Route>
          </Routes>
        </HashRouter>
      </StaffAuthProvider>
    </ToastProvider>
  );
}
