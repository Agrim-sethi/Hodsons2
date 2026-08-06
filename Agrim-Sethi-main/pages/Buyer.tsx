import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const Buyer: React.FC = () => {
  const { listings } = useAppContext();
  const [filterType, setFilterType] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<number>(5000);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredListings = listings.filter(l => {
    const matchesType = filterType === 'All' || l.material.includes(filterType) || l.title.includes(filterType);
    const matchesPrice = l.pricePerUnit <= priceRange;
    const matchesSearch = l.location.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesPrice && matchesSearch;
  });

  return (
    <main className="pt-28">
      <section className="pt-16 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">Buyer<br/><span className="text-accent-pink">Marketplace</span></h1>
            <div className="hidden lg:flex flex-col items-end text-right">
              <span className="text-accent-green font-mono text-xl">{filteredListings.length}</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest">Matching Listings</span>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-10">
            <div className="flex items-center gap-2 mb-8">
              <span className="material-symbols-outlined text-accent-green">tune</span>
              <h2 className="text-xl font-bold">Filter Listings</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Fabric Type Filter */}
              <div className="lg:col-span-4 space-y-4">
                <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Fabric Type</label>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Cotton', 'Silk', 'Linen', 'Wool', 'Denim'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${filterType === type ? 'bg-white text-deep-charcoal font-bold' : 'bg-white/5 border border-white/10 hover:border-white/30'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Price Filter */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-400">MAX PRICE (₹)</label>
                  <span className="text-accent-green font-mono font-bold">₹0 - ₹{priceRange} /m</span>
                </div>
                <div className="pt-4">
                  <input 
                    className="w-full cursor-pointer" 
                    max="10000" 
                    min="0" 
                    step="100" 
                    type="range" 
                    value={priceRange}
                    onChange={(e) => setPriceRange(parseInt(e.target.value))}
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                    <span>₹0</span>
                    <span>₹10,000+</span>
                  </div>
                </div>
              </div>
              
              {/* Location Filter */}
              <div className="lg:col-span-4 space-y-4">
                <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Search</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
                  <input 
                    className="w-full bg-input-bg border border-white/10 rounded-2xl pl-12 pr-6 py-3 focus:ring-2 focus:ring-accent-green focus:border-transparent transition-all outline-none text-white placeholder:text-gray-700" 
                    placeholder="City, Title, or Material..." 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map(listing => (
            <div key={listing.id} className="group bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:border-white/20 transition-all duration-300 flex flex-col h-full">
              <div className="aspect-[4/3] relative overflow-hidden bg-gray-900">
                <img alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={listing.imageUrl}/>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-accent-green text-deep-charcoal text-[10px] font-black uppercase tracking-widest rounded-full">{listing.status}</span>
                </div>
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <div className="mb-6 flex-grow">
                  <h3 className="text-2xl font-black mb-2 leading-tight">{listing.title}</h3>
                  <p className="text-gray-400 text-sm">{listing.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Qty Available</p>
                    <p className="text-lg font-bold">{listing.qty} meters</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Price per meter</p>
                    <p className="text-lg font-bold text-accent-green">₹{listing.pricePerUnit}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-gray-400">person</span>
                    </div>
                    <span className="text-xs font-bold text-gray-300">{listing.sellerName}</span>
                  </div>
                  <button className="bg-white text-deep-charcoal px-6 py-3 rounded-xl font-black text-sm hover:bg-accent-green transition-all transform active:scale-95">
                    Express Interest
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredListings.length === 0 && (
           <div className="text-center py-20 text-gray-500">
             <span className="material-symbols-outlined text-4xl mb-4">search_off</span>
             <p>No listings match your criteria.</p>
           </div>
        )}
      </section>
    </main>
  );
};

export default Buyer;