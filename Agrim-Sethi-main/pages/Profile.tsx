import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { listings } = useAppContext();
  const navigate = useNavigate();
  const myListings = listings.filter(l => l.sellerName === 'You');

  const handleEdit = (listing: any) => {
    navigate('/seller', { state: { editListing: listing } });
  };

  return (
    <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">Business <span className="text-accent-pink">Profile</span></h1>
        <div className="flex flex-wrap gap-8 items-center mt-8 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Username</span>
            <span className="text-2xl font-black text-white tracking-tight">John Doe</span>
          </div>
          <div className="h-12 w-px bg-white/10 hidden md:block"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Account Type</span>
            <span className="text-2xl font-black text-white tracking-tight">Seller For EOL Fabric</span>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-6">Account <span className="text-accent-pink">Info</span></h2>
          <div className="flex flex-wrap gap-8 items-center bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Email Address</span>
              <span className="text-2xl font-black text-white tracking-tight">john@reweave.business</span>
            </div>
            <div className="h-12 w-px bg-white/10 hidden md:block"></div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Phone Number</span>
              <span className="text-2xl font-black text-white tracking-tight">+91 98765 43210</span>
            </div>
          </div>
        </div>
      </header>
      
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-black tracking-tighter">My <span className="text-accent-green">Listings</span></h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {myListings.length > 0 ? myListings.map(listing => (
            <div key={listing.id} className="group bg-charcoal/30 border border-white/5 rounded-3xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-charcoal/50 hover:border-white/20 transition-all">
              <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                <img alt={listing.title} className="w-full h-full object-cover" src={listing.imageUrl}/>
              </div>
              <div className="flex-grow space-y-1 text-center md:text-left">
                <h3 className="text-xl font-bold">{listing.title}</h3>
                <p className="text-sm text-gray-400">{listing.material} • {listing.qty}m • ₹{listing.pricePerUnit}/m</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                  <span className="px-3 py-1 bg-accent-green/10 text-accent-green text-[10px] font-bold uppercase tracking-widest rounded-full border border-accent-green/20">Available</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(listing)}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white text-deep-charcoal transition-all"
                  title="Edit Listing"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button 
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500 transition-all"
                  title="Delete Listing"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 text-center py-10">You have no active listings.</p>
          )}
        </div>
      </section>

      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-black tracking-tighter">Your <span className="text-accent-pink">Interest Warehouse</span></h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem]">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-gray-600">inventory_2</span>
          </div>
          <p className="text-xl font-bold text-gray-500">No interest in fabrics shown as of yet</p>
          <p className="text-sm text-gray-600 mt-2">Saved materials and inquiries will appear here.</p>
        </div>
      </section>

      <section className="flex flex-col md:flex-row gap-4 justify-between items-center py-10 border-t border-white/10">
        <button className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all text-sm uppercase tracking-widest">
          <span className="material-symbols-outlined text-lg">download</span>
          Download My Data
        </button>
        <button className="flex items-center gap-2 px-8 py-4 bg-red-600/10 border border-red-600/20 text-red-500 rounded-2xl font-black hover:bg-red-600 hover:text-white transition-all text-sm uppercase tracking-widest">
          <span className="material-symbols-outlined text-lg">logout</span>
          Logout
        </button>
      </section>
    </main>
  );
};

export default Profile;
