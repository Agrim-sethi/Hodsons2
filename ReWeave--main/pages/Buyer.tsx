import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { User, Listing } from '../types';
import { mlService, ListingRecommendation } from '../services/mlService';

const MaterialTagCard: React.FC<{ material: string }> = ({ material }) => {
  const getFabricStyles = (mat: string) => {
    const m = mat.toLowerCase();
    if (m.includes('cotton')) return 'bg-accent-green text-deep-charcoal border-accent-green/30';
    if (m.includes('silk')) return 'bg-accent-pink text-white border-accent-pink/30';
    if (m.includes('linen')) return 'bg-accent-blue text-white border-accent-blue/30';
    if (m.includes('wool')) return 'bg-orange-500 text-white border-orange-500/30';
    if (m.includes('denim')) return 'bg-blue-600 text-white border-blue-600/30';
    return 'bg-white/10 text-gray-300 border-white/20';
  };

  const styles = getFabricStyles(material);

  return (
    <div className={`absolute -top-3 left-8 px-4 py-2 rounded-t-xl border-t border-x font-black text-[10px] uppercase tracking-[0.2em] transform transition-transform duration-500 group-hover:-translate-y-2 z-0 ${styles}`}>
      {material}
    </div>
  );
};

const Buyer: React.FC = () => {
  const { listings, currentUser, showNotification, getUser, addInterest, interestedListingIds } = useAppContext();
  const navigate = useNavigate();
  // Applied Filter State (what actually filters the list)
  const [appliedFilterType, setAppliedFilterType] = useState<string>('All');
  const [appliedPriceRange, setAppliedPriceRange] = useState<number>(750);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');

  // Draft Filter State (internal to the filter UI until confirmed)
  const [draftFilterType, setDraftFilterType] = useState<string>('All');
  const [draftPriceRange, setDraftPriceRange] = useState<number>(750);
  const [draftSearchTerm, setDraftSearchTerm] = useState('');

  // Local state for UI feedback only (popup modal)
  const [showConfPopup, setShowConfPopup] = useState(false);
  const [contactModalUser, setContactModalUser] = useState<User | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // ML Recommendations state
  const [recommendations, setRecommendations] = useState<ListingRecommendation[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Get ML-powered recommendations
  useEffect(() => {
    if (listings.length > 0 && currentUser) {
      const recs = mlService.getRecommendations(currentUser, interestedListingIds, listings, 6);
      setRecommendations(recs);
    }
  }, [listings, interestedListingIds, currentUser]);

  // Derive available materials from actual listings for dynamic filtering
  const availableMaterials = useMemo(() => {
    const materials = new Set(listings.map(l => l.material));
    return ['All', ...Array.from(materials)];
  }, [listings]);

  const filteredListings = listings.filter(l => {
    const matchesType = appliedFilterType === 'All' || l.material === appliedFilterType;
    const matchesPrice = l.pricePerUnit <= appliedPriceRange;
    const matchesSearch = l.location.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      l.title.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      l.material.toLowerCase().includes(appliedSearchTerm.toLowerCase());
    return matchesType && matchesPrice && matchesSearch;
  });

  const handleApplyFilters = () => {
    setAppliedFilterType(draftFilterType);
    setAppliedPriceRange(draftPriceRange);
    setAppliedSearchTerm(draftSearchTerm);
    showNotification("Marketplace filters updated!", "success");
  };

  const handleClearFilters = () => {
    setDraftFilterType('All');
    setDraftPriceRange(750);
    setDraftSearchTerm('');
    setAppliedFilterType('All');
    setAppliedPriceRange(750);
    setAppliedSearchTerm('');
    showNotification("All filters cleared", "info");
  };

  const handleExpressInterest = (listingId: string) => {
    if (!currentUser) {
      showNotification("You must be logged in to express interest.", "error");
      navigate('/login');
      return;
    }

    // Add to global context state
    addInterest(listingId);

    // Show Confirmation Popup
    setShowConfPopup(true);
    setTimeout(() => setShowConfPopup(false), 2500);
  };

  const handleViewContact = (sellerName: string) => {
    // If seller is "You" (simulated legacy), try current user or fallback
    let seller: User | undefined;

    if (sellerName === 'You') {
      if (currentUser) {
        seller = currentUser;
      } else {
        seller = { companyName: 'You', email: 'demo@reweave.com', type: 'Seller', phoneNumber: '555-0199' };
      }
    } else {
      seller = getUser(sellerName);
    }

    if (seller) {
      setContactModalUser(seller);
    } else {
      // Fallback if seller not found in DB
      setContactModalUser({
        companyName: sellerName,
        email: `${sellerName.toLowerCase().replace(/\s/g, '')}@reweave.com`,
        phoneNumber: '+1 (555) 000-0000',
        type: 'Seller'
      });
    }
  };

  return (
    <main className="pt-28 relative">
      {/* Interest Confirmation Popup */}
      {showConfPopup && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-fade-up">
          <div className="bg-accent-green text-deep-charcoal px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
            <div>
              <h4 className="font-black text-lg leading-none">Interest Confirmed!</h4>
              <p className="text-sm font-medium opacity-80">You can now view the seller's contact info.</p>
            </div>
          </div>
        </div>
      )}

      {/* Listing Details Modal */}
      {selectedListing && (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-up"
          onClick={() => setSelectedListing(null)}
        >
          <div
            className="bg-charcoal border border-white/10 rounded-[2rem] max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 max-h-[90vh] overflow-y-auto">
              <div className="relative min-h-[280px] lg:min-h-full bg-gray-900">
                <img
                  alt={selectedListing.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={selectedListing.imageUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                <div className="absolute left-6 top-6 flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-accent-green text-deep-charcoal text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    {selectedListing.status}
                  </span>
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">
                    {selectedListing.material}
                  </span>
                </div>
              </div>

              <div className="relative p-6 sm:p-8 lg:p-10">
                <button
                  aria-label="Close fabric details"
                  onClick={() => setSelectedListing(null)}
                  className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>

                <div className="pr-10">
                  <p className="text-xs text-accent-green uppercase tracking-[0.25em] font-black mb-3">Fabric Details</p>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
                    {selectedListing.title}
                  </h2>
                  <p className="mt-4 text-gray-300 leading-relaxed">{selectedListing.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Material</p>
                    <p className="text-white font-bold mt-1">{selectedListing.material}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Cost</p>
                    <p className="text-accent-green font-black mt-1">
                      Rs. {selectedListing.pricePerUnit}
                      <span className="text-xs text-gray-400 font-bold">/{selectedListing.unit || 'm'}</span>
                    </p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Available</p>
                    <p className="text-white font-bold mt-1">{selectedListing.qty} {selectedListing.unit || 'm'}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Location</p>
                    <p className="text-white font-bold mt-1">{selectedListing.location}</p>
                  </div>
                </div>

                <div className="mt-6 bg-black/30 p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Usage</p>
                  <p className="text-gray-200 leading-relaxed">{selectedListing.uses || 'Usage details not provided.'}</p>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4 pt-6 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Seller</p>
                    <p className="text-white font-bold">{selectedListing.sellerName}</p>
                    <p className="text-xs text-gray-500">Listed {selectedListing.dateListed}</p>
                  </div>

                  {interestedListingIds.includes(selectedListing.id) ? (
                    <button
                      onClick={() => handleViewContact(selectedListing.sellerName)}
                      className="bg-accent-blue text-deep-charcoal px-5 py-3 rounded-xl font-black text-xs hover:bg-white transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">contact_phone</span>
                      View Contact
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExpressInterest(selectedListing.id)}
                      className="bg-white text-deep-charcoal px-5 py-3 rounded-xl font-black text-xs hover:bg-accent-green transition-all"
                    >
                      Express Interest
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info Modal */}
      {contactModalUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up">
          <div className="bg-charcoal border border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setContactModalUser(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-accent-pink/20 text-accent-pink flex items-center justify-center mx-auto mb-4 text-3xl font-bold uppercase">
                {contactModalUser.companyName.substring(0, 2)}
              </div>
              <h3 className="text-2xl font-black text-white">{contactModalUser.companyName}</h3>
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-widest mt-2 inline-block">Seller</span>
            </div>

            <div className="space-y-4">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400">mail</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Email Address</p>
                  <p className="text-white font-medium truncate">{contactModalUser.email}</p>
                </div>
              </div>
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400">call</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Phone Number</p>
                  <p className="text-white font-medium">{contactModalUser.phoneNumber || "Not Provided"}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setContactModalUser(null)}
              className="w-full mt-8 bg-white text-deep-charcoal font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Close Contact Info
            </button>
          </div>
        </div>
      )}

      <section className="pt-16 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-none">Buyer<br /><span className="text-accent-pink">Marketplace</span></h1>
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
                  {availableMaterials.length > 1 ? availableMaterials.map(type => (
                    <button
                      key={type}
                      onClick={() => setDraftFilterType(type)}
                      className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${draftFilterType === type ? 'bg-white text-deep-charcoal font-bold' : 'bg-white/5 border border-white/10 hover:border-white/30'}`}
                    >
                      {type}
                    </button>
                  )) : (
                    <div className="text-gray-500 text-sm italic p-2">Add listings to see filters</div>
                  )}
                </div>
              </div>

              {/* Price Filter */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-400">MAX PRICE (₹)</label>
                  <span className="text-accent-green font-mono font-bold">₹0 - ₹{draftPriceRange} /unit</span>
                </div>
                <div className="pt-4">
                  <input
                    className="w-full cursor-pointer accent-accent-green"
                    max="750"
                    min="0"
                    step="50"
                    type="range"
                    value={draftPriceRange}
                    onChange={(e) => setDraftPriceRange(parseInt(e.target.value))}
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                    <span>₹0</span>
                    <span>₹750+</span>
                  </div>
                </div>
              </div>

              {/* Search Filter */}
              <div className="lg:col-span-4 space-y-4">
                <label className="text-sm font-bold uppercase tracking-wider text-gray-400">Search</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
                  <input
                    className="w-full bg-input-bg border border-white/10 rounded-2xl pl-12 pr-6 py-3 focus:ring-2 focus:ring-accent-green focus:border-transparent transition-all outline-none text-white placeholder:text-gray-700"
                    placeholder="City, Title, or Material..."
                    type="text"
                    value={draftSearchTerm}
                    onChange={(e) => setDraftSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleApplyFilters}
                className="w-full sm:w-auto px-10 py-4 bg-white text-deep-charcoal font-black rounded-xl hover:bg-accent-green transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">done_all</span>
                Confirm Filters
              </button>
              <button
                onClick={handleClearFilters}
                className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">filter_alt_off</span>
                Remove Filters
              </button>
              <div className="sm:ml-auto text-xs text-gray-500 font-bold uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full border border-white/5">
                Current: {appliedFilterType} • ₹{appliedPriceRange} • "{appliedSearchTerm || 'None'}"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Recommendations Section */}
      {recommendations.length > 0 && showRecommendations && (
        <section className="max-w-7xl mx-auto px-6 pb-12">
          <div className="bg-gradient-to-br from-accent-pink/10 via-transparent to-accent-green/10 border border-accent-pink/30 rounded-[2.5rem] p-8 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent-pink/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-accent-pink text-2xl">auto_awesome</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black">AI Recommendations</h2>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Personalized picks based on your preferences</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.listing.id}
                  className="relative pt-3 group"
                >
                  <MaterialTagCard material={rec.listing.material} />
                  <div
                    onClick={() => setSelectedListing(rec.listing)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedListing(rec.listing);
                    }}
                    className="relative z-10 bg-black/30 border border-white/10 rounded-2xl overflow-hidden group-hover:border-accent-pink/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-pink"
                  >
                    {/* Match Score Badge */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                      <span className="material-symbols-outlined text-accent-pink text-[10px] sm:text-sm">star</span>
                      <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">{rec.matchScore}% Match</span>
                    </div>

                    <div className="aspect-[3/2] relative overflow-hidden">
                      <img
                        alt={rec.listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        src={rec.listing.imageUrl}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                    </div>

                    <div className="p-5">
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">{rec.listing.title}</h3>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{rec.reason}</p>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Price</p>
                          <p className="text-lg font-bold text-accent-green">₹{rec.listing.pricePerUnit}<span className="text-xs text-gray-400">/{rec.listing.unit || 'm'}</span></p>
                        </div>
                        {interestedListingIds.includes(rec.listing.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewContact(rec.listing.sellerName);
                            }}
                            className="px-4 py-2 bg-accent-blue text-deep-charcoal rounded-xl text-xs font-bold hover:bg-white transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">contact_phone</span>
                            Contact
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpressInterest(rec.listing.id);
                            }}
                            className="px-4 py-2 bg-accent-pink text-deep-charcoal rounded-xl text-xs font-bold hover:bg-white transition-colors"
                          >
                            Express Interest
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map(listing => (
            <div key={listing.id} className="relative pt-3 group">
              <MaterialTagCard material={listing.material} />
              <div
                onClick={() => setSelectedListing(listing)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedListing(listing);
                }}
                className="relative z-10 bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:border-white/20 transition-all duration-300 flex flex-col h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-green"
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-gray-900">
                  <img alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={listing.imageUrl} />
                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1 bg-accent-green text-deep-charcoal text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">{listing.status}</span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <div className="mb-6 flex-grow">
                    <h3 className="text-2xl font-black mb-2 leading-tight">{listing.title}</h3>
                    <p className="text-gray-400 text-sm">{listing.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Available</p>
                      <p className="text-lg font-bold">{listing.qty} {listing.unit || 'm'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Price per unit</p>
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

                    {interestedListingIds.includes(listing.id) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContact(listing.sellerName);
                        }}
                        className="bg-accent-blue text-deep-charcoal px-6 py-3 rounded-xl font-black text-xs hover:bg-white transition-all transform active:scale-95 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">contact_phone</span>
                        View Contact Info
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpressInterest(listing.id);
                        }}
                        className="bg-white text-deep-charcoal px-6 py-3 rounded-xl font-black text-sm hover:bg-accent-green transition-all transform active:scale-95"
                      >
                        Express Interest
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <span className="material-symbols-outlined text-4xl mb-4">search_off</span>
            <p>No listings match your criteria.</p>
            {listings.length === 0 && <p className="text-sm mt-2">The marketplace is currently empty. Be the first to list!</p>}
          </div>
        )}
      </section>
    </main>
  );
};

export default Buyer;
