import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <header className="relative min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 pt-24 pb-12">
        <div className="absolute inset-0 z-0">
          <img alt="Rack of clothes showing fabric textures" className="w-full h-full object-cover opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWWxRPqKpt-BHWyT4o0tQP2PDUeu_SLyuJ6nEHxpM2HzumxgBS-WIqXyU1uMRam8tQN2Nl52pPMdxR7drZkhmtFHfBDzstlczTEBdETz1te8eNowHUYabX45JUf_C1CwLUsRX9V6R5jXLQNyzUVu1XDeufZ5dgCK9n5954iu8hXLXRjubLmIygEoIaH3bsPBsJGzjHbgsRBIfijvlTAux08ZwTtTEoDgaTFRuB1C3c1uxnwt79Mu8ZYWWL6c5WCMJX48TFime9" />
          <div className="absolute inset-0 bg-gradient-to-b from-deep-charcoal/80 via-deep-charcoal/90 to-deep-charcoal"></div>
        </div>
        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-green/30 bg-accent-green/10 text-accent-green text-xs font-semibold tracking-wide uppercase mb-4 animate-fade-up">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
            Sustainable Textile Marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
            <span className="text-primary inline-block animate-fade-up stagger-3">Turn surplus fabric into sustainable profit.</span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed animate-fade-up stagger-3">
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
      <section className="py-16 sm:py-24 lg:py-32 bg-deep-charcoal relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left Column */}
            <div className="space-y-8 sm:space-y-12 reveal-on-scroll">
              <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-tight">
                The Purpose Of <br />
                <span className="text-accent-pink">Building ReWeave</span>
              </h2>

              <div className="space-y-6 sm:space-y-8 text-sm sm:text-base lg:text-lg text-gray-400 font-light leading-relaxed">
                <p>
                  The textile industry generates significant waste through end-of-line (EOL) fabric — small batches, discontinued designs, or irregular sizes left over at the end of production cycles.
                </p>
                <p>
                  These surplus fabrics are typically discarded, stored indefinitely (leading to mounting costs), or sold at heavily discounted rates, resulting in financial and environmental losses. Meanwhile, small designers, artisans, and independent creators often lack access to affordable, high-quality fabrics in small quantities.
                </p>
              </div>

              <div className="flex flex-wrap gap-6 sm:gap-8 lg:gap-12 pt-4">
                <div className="flex-1 min-w-[120px]">
                  <span className="block text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2">10%</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">EOL Textiles<br />Dumped</span>
                </div>
                <div className="hidden sm:block w-px bg-white/10 h-16"></div>
                <div className="flex-1 min-w-[120px]">
                  <span className="block text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2">65%</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">EOL Textiles sold at<br />ultra-heavy discounts</span>
                </div>
                <div className="hidden sm:block w-px bg-white/10 h-16"></div>
                <div className="flex-1 min-w-[120px]">
                  <span className="block text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2">25%</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">EOL Textiles stored indefinitely<br />due to lack of buyer access</span>
                </div>
              </div>
            </div>

            {/* Right Column - Cards */}
            <div className="space-y-6">
              {/* Card 1 */}
              <div className="bg-[#161b22] border border-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] hover:bg-[#1c242e] hover:border-accent-pink/20 transition-all duration-500 reveal-on-scroll delay-100 group">
                <div className="w-12 h-12 rounded-full bg-accent-pink/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-accent-pink text-2xl">recycling</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Circular Economy</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  ReWeave closes the loop by ensuring that every yard of fabric finds a purpose, reducing reliance on virgin materials.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-[#161b22] border border-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] hover:bg-[#1c242e] hover:border-accent-blue/20 transition-all duration-500 reveal-on-scroll delay-200 group">
                <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-accent-blue text-2xl">hub</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Intelligent Connection</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  Our algorithm matches surplus inventory with demand patterns in real-time, creating value where there was none.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-[#161b22] border border-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] hover:bg-[#1c242e] hover:border-accent-green/20 transition-all duration-500 reveal-on-scroll delay-300 group">
                <div className="w-12 h-12 rounded-full bg-accent-green/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-accent-green text-2xl">trending_up</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Data-Driven Impact</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                  We provide actionable insights to help businesses understand their waste footprint and optimize procurement.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Impact Planned Section */}
      <section className="relative py-16 sm:py-24 lg:py-32 bg-deep-charcoal overflow-hidden" id="purpose">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="mb-12 sm:mb-16 lg:mb-20 reveal-on-scroll">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-accent-pink text-3xl">all_inclusive</span>
              <span className="font-bold text-white tracking-widest uppercase text-sm">Our Mission</span>
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white mb-4 sm:mb-6">Impact <span className="text-accent-green">Planned</span></h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 font-light max-w-2xl">Measurable outcomes for every participant in the ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sellers Card */}
            <div className="reveal-on-scroll delay-100 bg-[#0f172a] border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 hover:border-accent-green/30 transition-all duration-500 group">
              <span className="text-accent-green text-xs font-bold uppercase tracking-widest mb-4 block">01. Sellers</span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">For Textile Businesses</h3>
              <ul className="space-y-6 sm:space-y-8">
                <ImpactItem
                  icon="monetization_on"
                  title="Revenue Recovery"
                  desc="Monetize leftover stock that would otherwise be discarded."
                />
                <ImpactItem
                  icon="warehouse"
                  title="Storage Cost Reduction"
                  desc="Reduce holding time and associated costs by up to 60%."
                />
                <ImpactItem
                  icon="public"
                  title="Sustainability Branding"
                  desc="Enhance CSR efforts by dramatically reducing textile waste."
                />
              </ul>
            </div>

            {/* Buyers Card */}
            <div className="reveal-on-scroll delay-200 bg-[#0f172a] border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 hover:border-accent-blue/30 transition-all duration-500 group">
              <span className="text-accent-blue text-xs font-bold uppercase tracking-widest mb-4 block">02. Buyers</span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">For Small Buyers</h3>
              <ul className="space-y-6 sm:space-y-8">
                <ImpactItem
                  icon="shopping_bag"
                  title="Affordable Access"
                  desc="Purchase high-quality fabrics in small lots at competitive prices."
                />
                <ImpactItem
                  icon="palette"
                  title="Design Flexibility"
                  desc="Work with unique, limited-edition materials unavailable elsewhere."
                />
              </ul>
            </div>

            {/* Planet Card */}
            <div className="reveal-on-scroll delay-300 bg-[#0f172a] border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 hover:border-accent-pink/30 transition-all duration-500 group">
              <span className="text-accent-pink text-xs font-bold uppercase tracking-widest mb-4 block">03. Planet</span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">For The Planet</h3>
              <ul className="space-y-6 sm:space-y-8">
                <ImpactItem
                  icon="water_drop"
                  title="Water Preservation"
                  desc="Saved 2,000L of water per kg of fabric reused vs produced."
                />
                <ImpactItem
                  icon="co2"
                  title="Carbon Reduction"
                  desc="Significant reduction in CO2 footprint from avoidance."
                />
                <ImpactItem
                  icon="delete_forever"
                  title="Landfill Diversion"
                  desc="Keeping non-biodegradable synthetics out of our earth."
                />
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const ImpactItem: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <li className="flex gap-3 sm:gap-4 items-start">
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-1">
      <span className="material-symbols-outlined text-gray-400 text-lg sm:text-xl">{icon}</span>
    </div>
    <div>
      <h4 className="font-bold text-white text-base sm:text-lg mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-light">{desc}</p>
    </div>
  </li>
);

export default Home;
