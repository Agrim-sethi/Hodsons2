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

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="standings" element={<Standings />} />
          <Route path="events" element={<Events />} />
          <Route path="archive" element={<Archive />} />
          <Route path="profile" element={<Profile />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="teams" element={<SchoolTeams />} />
          <Route path="hodsons" element={<Hodsons />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}