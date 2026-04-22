import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useToast } from '../components/ui/ToastProvider';
import { useStaffAuth } from '../components/auth/StaffAuthProvider';

const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isLoggedIn, login, logout } = useStaffAuth();
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(userId, password);
    if (!success) {
      setError('Incorrect user ID or password.');
      return;
    }

    setError('');
    setPassword('');
    showToast({
      title: 'Staff Access Enabled',
      description: 'The Manage Results controls are now visible on the Hodsons page.'
    });
    navigate('/hodsons');
  };

  const handleLogout = () => {
    logout();
    setUserId('');
    setPassword('');
    setError('');
    showToast({
      title: 'Logged Out',
      description: 'Staff-only controls are hidden again.'
    });
  };

  return (
    <div className="max-w-3xl mx-auto w-full py-12">
      <div className="glass-panel section-plaque rounded-[32px] border border-primary/15 overflow-hidden">
        <div className="p-8 border-b border-primary/10 bg-[linear-gradient(135deg,rgba(201,163,74,0.12),rgba(255,255,255,0.03))]">
          <div className="royal-kicker mb-3">Protected Access</div>
          <h1 className="text-3xl font-black text-white tracking-tight">Staff Login</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            Use the staff credentials to unlock the staff-managed controls for Hodsons results and event administration on this public website.
          </p>
        </div>

        <div className="p-8">
          {isLoggedIn ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                    <Icon name="verified_user" size="20" />
                  </div>
                  <div>
                    <div className="text-white font-black text-lg">Staff session active</div>
                    <div className="text-sm text-slate-400">Staff-only management controls are now available where applicable.</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/hodsons')}
                  className="px-5 py-3 rounded-xl royal-primary-btn font-black text-xs uppercase tracking-widest"
                >
                  Go To Hodsons
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-3 rounded-xl royal-secondary-btn font-black text-xs uppercase tracking-widest"
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">User ID</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value.toUpperCase());
                      setError('');
                    }}
                    className="w-full royal-input rounded-xl px-4 py-3 text-white font-bold tracking-[0.16em] uppercase"
                    placeholder="SNA"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full royal-input rounded-xl px-4 py-3 text-white font-bold tracking-[0.08em]"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl royal-primary-btn font-black text-xs uppercase tracking-widest"
                >
                  Log In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
