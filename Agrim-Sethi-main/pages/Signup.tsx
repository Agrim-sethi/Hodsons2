import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
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
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal/90 via-deep-charcoal/85 to-charcoal/95 backdrop-blur-[1px]"></div>
        <div className="relative z-10 w-full max-w-3xl bg-charcoal/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 shadow-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">Create Account</h1>
            <p className="text-gray-400 text-base font-light">Join the sustainable textile marketplace</p>
          </div>
          <form className="space-y-10" onSubmit={handleSignup}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="group relative border-b border-gray-600 focus-within:border-primary transition-colors duration-300">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="username">New Username</label>
                <input className="w-full bg-transparent border-none px-0 py-2 text-white placeholder-gray-700 focus:ring-0 text-lg transition-all" id="username" placeholder="Choose a unique username" type="text"/>
              </div>
              <div className="group relative border-b border-gray-600 focus-within:border-primary transition-colors duration-300">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="email">Email Address</label>
                <input className="w-full bg-transparent border-none px-0 py-2 text-white placeholder-gray-700 focus:ring-0 text-lg transition-all" id="email" placeholder="you@example.com" type="email"/>
              </div>
              <div className="group relative border-b border-gray-600 focus-within:border-primary transition-colors duration-300">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="password">New Password</label>
                <input className="w-full bg-transparent border-none px-0 py-2 text-white placeholder-gray-700 focus:ring-0 text-lg transition-all" id="password" placeholder="••••••••••••" type="password"/>
              </div>
              <div className="group relative border-b border-gray-600 focus-within:border-primary transition-colors duration-300">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="phone">Phone Number</label>
                <input className="w-full bg-transparent border-none px-0 py-2 text-white placeholder-gray-700 focus:ring-0 text-lg transition-all" id="phone" placeholder="+1 (555) 000-0000" type="tel"/>
              </div>
            </div>
            <div className="group relative border-b border-gray-600 focus-within:border-primary transition-colors duration-300">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 font-semibold" htmlFor="account-type">Account Type</label>
              <div className="relative">
                <select className="w-full bg-transparent border-none px-0 py-2 text-white focus:ring-0 text-lg appearance-none cursor-pointer" id="account-type">
                  <option className="bg-slate-900 text-white" value="buyer">Buyer For EOL Fabric</option>
                  <option className="bg-slate-900 text-white" value="supplier">Fabric Supplier</option>
                  <option className="bg-slate-900 text-white" value="recycler">Textile Recycler</option>
                  <option className="bg-slate-900 text-white" value="designer">Independent Designer</option>
                </select>
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="pt-4">
              <button className="w-full bg-white text-slate-900 font-bold py-5 rounded-xl text-lg hover:bg-gray-200 transition-all duration-300 shadow-xl" type="submit">
                Create Account
              </button>
              <div className="text-center mt-8">
                <p className="text-gray-400 text-sm">
                  Already have an account? 
                  <Link to="/login" className="text-white font-medium hover:text-primary transition-colors ml-1">Sign In</Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Signup;
