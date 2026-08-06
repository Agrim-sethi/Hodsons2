import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/authService';
import AccountTypeSelect from '../components/AccountTypeSelect';
import { DEFAULT_ACCOUNT_TYPE } from '../constants/accountTypes';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser, showNotification, setShowProfileSetup } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState(DEFAULT_ACCOUNT_TYPE);

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    try {
      const result = await authService.signInWithGoogle(userType);

      if (result.success && result.user) {
        await setCurrentUser(result.user);
        setShowProfileSetup(true);
        showNotification("Account created successfully!", "success");
        navigate('/');
      } else {
        showNotification(result.error || "Google sign-up failed", "error");
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
      showNotification("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex items-center justify-center px-4 pt-28 pb-20 relative min-h-screen"
        style={{
          backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuAExjVBNTAU34dcReSW8zqqd_uUq_5bWmdixQnygpdTUY8uCJ6_uYoR8oK32laM8lR56WK0DGxS4CBb48JhjyziPKOwlSGaTVlTHKtswzebnmwYf_LfTyM5H2EkAam_6swIOk8Zbi-p-AhYkYZjlyGiZMboWfirdOyg13Ma89PI9JF5goCNbbogE8rhaxPaL9vYYE_VG2-F_yyvJN0ESik1RSrEwOcvSWevL3Fh_rLVzbaMovpvqPk25QVKEtyePE9jnB134ecb)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal/90 via-deep-charcoal/85 to-charcoal/95 backdrop-blur-[1px]"></div>
        <div className="relative z-10 w-full max-w-xl bg-charcoal/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 shadow-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">Create Account</h1>
            <p className="text-gray-400 text-base font-light">Join the sustainable textile marketplace</p>
          </div>

          <div className="space-y-10">
            <div className="group relative border-b border-gray-600 focus-within:border-primary transition-colors duration-300">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="type">Account Type</label>
              <div className="relative">
                <AccountTypeSelect
                  value={userType}
                  onChange={setUserType}
                  className="w-full bg-transparent border-none px-0 py-2 text-white focus:ring-0 text-lg appearance-none cursor-pointer"
                  disabled={isLoading}
                />
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full bg-white text-slate-900 font-bold py-5 rounded-xl text-lg hover:bg-gray-200 transition-all duration-300 shadow-xl flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="animate-pulse">Connecting...</span>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign up with Google
                  </>
                )}
              </button>

              <div className="text-center mt-12">
                <p className="text-gray-400 text-sm">
                  Already have an account?
                  <Link to="/login" className="text-white font-medium hover:text-primary transition-colors ml-1">Sign In</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Signup;
