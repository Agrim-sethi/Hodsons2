import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="relative">
      <header className="relative min-h-screen flex flex-col justify-center items-center px-4 pt-20">
        <div className="absolute inset-0 z-0">
          <img alt="Rack of clothes showing fabric textures" className="w-full h-full object-cover opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWWxRPqKpt-BHWyT4o0tQP2PDUeu_SLyuJ6nEHxpM2HzumxgBS-WIqXyU1uMRam8tQN2Nl52pPMdxR7drZkhmtFHfBDzstlczTEBdETz1te8eNowHUYabX45JUf_C1CwLUsRX9V6R5jXLQNyzUVu1XDeufZ5dgCK9n5954iu8hXLXRjubLmIygEoIaH3bsPBsJGzjHbgsRBIfijvlTAux08ZwTtTEoDgaTFRuB1C3c1uxnwt79Mu8ZYWWL6c5WCMJX48TFime9"/>
          <div className="absolute inset-0 bg-gradient-to-b from-deep-charcoal/80 via-deep-charcoal/90 to-deep-charcoal"></div>
        </div>
        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-green/30 bg-accent-green/10 text-accent-green text-xs font-semibold tracking-wide uppercase mb-4 animate-fade-up">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
            Sustainable Textile Marketplace
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
            <span className="text-primary inline-block animate-fade-up stagger-3">Turn surplus fabric into sustainable profit.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed animate-fade-up stagger-3">
            Connect mills, designers, and makers to give textiles a second life. Fast uploads, local matches, and measurable impact.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 animate-fade-up stagger-3">
            <Link to="/seller" className="group px-8 py-4 bg-primary text-deep-charcoal font-bold text-lg rounded-full hover:bg-white hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(237,233,254,0.3)]">
              Start Weaving
              <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
            </Link>
            <Link to="/buyer" className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium text-lg rounded-full hover:bg-white/10 hover:scale-105 hover:border-white/30 transition-all backdrop-blur-sm">
              View Marketplace
            </Link>
          </div>
        </div>
      </header>

      {/* Purpose Section */}
      <section className="relative py-32 bg-deep-charcoal overflow-hidden" id="purpose">
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="sticky top-32">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">The Purpose Of <br/><span className="text-accent-pink">Building ReWeave</span></h2>
            <div className="prose prose-lg prose-invert text-gray-400 leading-relaxed">
              <p className="text-xl font-light text-white mb-6">
                The textile industry generates significant waste through end-of-line (EOL) fabric — small batches, discontinued designs, or irregular sizes left over at the end of production cycles.
              </p>
              <p>
                These surplus fabrics are typically discarded, stored indefinitely, or sold at heavily discounted rates. ReWeave closes this loop.
              </p>
            </div>
          </div>
          <div className="space-y-15">
             <FeatureCard 
               icon="recycling" 
               color="text-accent-pink" 
               bg="bg-accent-pink/20" 
               title="Circular Economy" 
               desc="ReWeave closes the loop by ensuring that every yard of fabric finds a purpose, reducing reliance on virgin materials."
             />
             <FeatureCard 
               icon="hub" 
               color="text-primary" 
               bg="bg-primary/20" 
               title="Intelligent Connection" 
               desc="Our algorithm matches surplus inventory with demand patterns in real-time, creating value where there was none."
             />
             <FeatureCard 
               icon="query_stats" 
               color="text-accent-green" 
               bg="bg-accent-green/20" 
               title="Data-Driven Impact" 
               desc="Track your sustainability metrics with precision. Understand exactly how much waste you've diverted from landfills."
             />
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string; color: string; bg: string; title: string; desc: string }> = ({ icon, color, bg, title, desc }) => (
  <div className="bg-charcoal/50 border border-white/5 rounded-3xl p-8 hover:bg-charcoal/80 transition-all duration-500 group card-lift">
    <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mb-6 group-hover:bg-opacity-60 transition-colors`}>
      <span className={`material-symbols-outlined ${color} group-hover:scale-110 transition-transform`}>{icon}</span>
    </div>
    <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
    <p className="text-gray-400">{desc}</p>
  </div>
);

export default Home;
