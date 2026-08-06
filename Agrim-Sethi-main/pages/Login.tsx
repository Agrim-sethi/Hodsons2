import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
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
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal/90 via-deep-charcoal/85 to-charcoal/95 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full max-w-2xl bg-charcoal/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 md:p-20 shadow-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">Login</h1>
            <p className="text-gray-400 text-base font-light">Join the sustainable textile marketplace</p>
          </div>
          <form className="space-y-12" onSubmit={handleLogin}>
            <div className="space-y-10">
              <div className="group relative border-b border-gray-600 focus-within:border-white transition-colors duration-300">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="username">Username / Email</label>
                <input className="w-full bg-transparent border-none px-0 py-3 text-white placeholder-gray-700 focus:ring-0 text-lg transition-all" id="username" placeholder="Enter your credentials" type="text"/>
              </div>
              <div className="group relative border-b border-gray-600 focus-within:border-white transition-colors duration-300">
                <div className="flex justify-between items-end">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="password">Password</label>
                  <a className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-1" href="#">Forgot?</a>
                </div>
                <input className="w-full bg-transparent border-none px-0 py-3 text-white placeholder-gray-700 focus:ring-0 text-lg transition-all" id="password" placeholder="••••••••••••" type="password"/>
              </div>
            </div>
            <div className="pt-6">
              <button className="w-full bg-white text-slate-900 font-bold py-5 rounded-xl text-lg hover:bg-gray-200 transition-all duration-300 shadow-xl" type="submit">
                Login
              </button>
              <div className="text-center mt-10">
                <p className="text-gray-400 text-sm">
                  Don't have an account? 
                  <Link to="/signup" className="text-white font-medium hover:text-primary transition-colors ml-1">Sign Up</Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;
