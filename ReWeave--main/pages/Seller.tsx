import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { analyzeFabricImage } from '../services/geminiService';
import { mlService, PriceRecommendation, DemandPrediction } from '../services/mlService';
import { Listing } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

const MATERIAL_OPTIONS = [
  "Cotton",
  "Polyester",
  "Silk",
  "Wool",
  "Linen",
  "Nylon",
  "Rayon",
  "Denim",
  "Velvet",
  "Blend",
  "Recycled",
  "Hemp",
  "Leather",
  "Other"
];

const Seller: React.FC = () => {
  const { addListing, updateListing, deleteListing, listings, currentUser, showNotification } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priceRecommendation, setPriceRecommendation] = useState<PriceRecommendation | null>(null);
  const [demandPrediction, setDemandPrediction] = useState<DemandPrediction | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  // Filter listings for current seller
  const myListings = listings.filter(l => l.sellerName === 'You' || (currentUser && l.sellerName === currentUser.companyName));

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    uses: '',
    qty: '',
    unit: 'm' as 'm' | 'kg',
    price: '',
    location: '',
    material: ''
  });

  const [isManualLocation, setIsManualLocation] = useState(false);

  // Check for edit request from other pages
  useEffect(() => {
    if (location.state && location.state.editListing) {
      handleStartEdit(location.state.editListing);
      // Clear state so it doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      uses: '',
      qty: '',
      unit: 'm',
      price: '',
      location: '',
      material: ''
    });
    setIsManualLocation(false);
    setImagePreview(null);
    setEditingId(null);
    setPriceRecommendation(null);
    setDemandPrediction(null);
    setShowInsights(false);
  };

  // Update ML predictions when relevant form fields change
  useEffect(() => {
    if (formData.material && formData.qty && formData.location) {
      const prediction = mlService.predictPrice(
        formData.material,
        parseFloat(formData.qty) || 0,
        formData.unit,
        formData.location,
        listings
      );
      setPriceRecommendation(prediction);

      const demand = mlService.predictDemand(
        formData.material,
        formData.location,
        listings
      );
      setDemandPrediction(demand);
      setShowInsights(true);
    } else {
      setPriceRecommendation(null);
      setDemandPrediction(null);
      setShowInsights(false);
    }
  }, [formData.material, formData.qty, formData.location, formData.unit, listings]);

  const handleStartEdit = (listing: Listing) => {
    const isCustom = listing.location !== 'Panipat';
    setIsManualLocation(isCustom);

    setFormData({
      title: listing.title,
      description: listing.description,
      uses: listing.uses,
      qty: listing.qty.toString(),
      unit: listing.unit || 'm',
      price: listing.pricePerUnit.toString(),
      location: listing.location,
      material: listing.material
    });
    setImagePreview(listing.imageUrl);
    setEditingId(listing.id);

    // Scroll to form
    formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this listing? This cannot be undone.")) {
      deleteListing(id);
      showNotification("Listing removed successfully.", "info");
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const handleStatusChange = (listing: Listing, newStatus: string) => {
    updateListing({ ...listing, status: newStatus as any });
    showNotification(`Listing marked as ${newStatus}`);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Use 0.7 quality to keep file size small for Firestore
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      // Compress image before setting it (crucial for mobile/Firestore limits)
      const compressedBase64 = await compressImage(base64String);
      setImagePreview(compressedBase64);

      // Auto-analyze with Gemini
      analyzeImage(compressedBase64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Image: string) => {
    setAnalyzing(true);
    showNotification("AI is analyzing your fabric...", "info");

    // Extract base64 data only (remove data:image/jpeg;base64, prefix)
    const base64Data = base64Image.split(',')[1];

    try {
      const analysis = await analyzeFabricImage(base64Data);

      if (analysis) {
        // Try to match AI material to our dropdown options
        let matchedMaterial = "Other";
        const aiMat = analysis.material.toLowerCase();
        for (const opt of MATERIAL_OPTIONS) {
          if (aiMat.includes(opt.toLowerCase())) {
            matchedMaterial = opt;
            break;
          }
        }

        setFormData(prev => ({
          ...prev,
          title: analysis.title,
          description: analysis.description,
          uses: analysis.uses,
          material: matchedMaterial,
          price: analysis.estimatedPrice.toString()
        }));
        showNotification("Fabric details auto-filled by AI!", "success");
      } else {
        showNotification("Could not analyze image. Please fill details manually.", "error");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      showNotification("AI analysis failed. Please fill details manually.", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Panipat') {
      setIsManualLocation(false);
      setFormData(prev => ({ ...prev, location: 'Panipat' }));
    } else if (val === 'Manual') {
      setIsManualLocation(true);
      setFormData(prev => ({ ...prev, location: '' }));
    } else {
      // Should not happen as 'Choose location' is disabled, but good fallback
      setIsManualLocation(false);
      setFormData(prev => ({ ...prev, location: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      showNotification("You must be logged in to post a listing.", "error");
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      if (!imagePreview) {
        showNotification("Please upload an image of the fabric.", "error");
        setLoading(false);
        return;
      }

      if (!formData.location) {
        showNotification("Please provide a location.", "error");
        setLoading(false);
        return;
      }

      const newListing: Listing = {
        id: editingId || Date.now().toString(),
        title: formData.title,
        description: formData.description,
        uses: formData.uses,
        qty: parseFloat(formData.qty),
        unit: formData.unit,
        pricePerUnit: parseFloat(formData.price),
        location: formData.location,
        imageUrl: imagePreview,
        material: formData.material || "Other",
        sellerName: currentUser.companyName,
        status: 'Available',
        dateListed: new Date().toISOString().split('T')[0]
      };

      if (editingId) {
        await updateListing(newListing);
        showNotification("Listing updated successfully!");
      } else {
        await addListing(newListing);
        showNotification("Fabric listed successfully!");
      }

      resetForm();
    } catch (error: any) {
      console.error("Submit error:", error);
      let errorMsg = "Failed to save listing. Please try again.";
      if (error.code === 'permission-denied') {
        errorMsg = "You don't have permission to save this listing.";
      } else if (error.message?.includes('too large') || error.code === 'invalid-argument') {
        errorMsg = "The image is too large even after compression. Try a smaller photo.";
      }
      showNotification(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto" ref={formTopRef}>
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-4">Seller <span className="text-accent-pink">Studio</span></h1>
            <p className="text-gray-400 text-base sm:text-lg">Upload your surplus fabric. Our AI helps you list it in seconds.</p>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 text-sm font-bold uppercase tracking-widest transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
          {/* Image Upload Section */}
          <div className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                aspect-square rounded-[2.5rem] border-2 border-dashed border-white/20 
                flex flex-col items-center justify-center cursor-pointer 
                hover:border-accent-green hover:bg-white/5 transition-all relative overflow-hidden group
                ${analyzing ? 'animate-pulse border-accent-pink' : ''}
              `}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined">edit</span> Change Image
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-4xl text-accent-green">add_a_photo</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Upload Fabric Image</h3>
                  <p className="text-gray-500 text-sm max-w-[200px] text-center">Click to upload or drag and drop your fabric photo here</p>
                </>
              )}

              {analyzing && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                  <div className="w-12 h-12 border-4 border-accent-pink border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-accent-pink font-bold animate-pulse">AI Analyzing...</p>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-accent-green">auto_awesome</span>
                <h4 className="font-bold text-sm uppercase tracking-widest text-white">AI Powered</h4>
              </div>
              <p className="text-sm text-gray-400">
                ReWeave uses Gemini Nano to analyze your fabric's texture, weave, and composition instantly. Just upload a photo and watch the details fill in.
              </p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 p-1 rounded-2xl mb-2 inline-flex">
              <span className="px-4 py-1 text-xs font-bold uppercase tracking-widest text-accent-green">
                {editingId ? 'Editing Listing' : 'New Listing'}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Listing Title</label>
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Vintage Floral Silk"
                className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Description</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the texture, weight, and feel..."
                className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Material</label>
                <div className="relative">
                  <select
                    required
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Material</option>
                    {MATERIAL_OPTIONS.map(opt => (
                      <option key={opt} value={opt} className="bg-deep-charcoal">{opt}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Suggested Uses</label>
                <input
                  required
                  value={formData.uses}
                  onChange={(e) => setFormData({ ...formData, uses: e.target.value })}
                  placeholder="e.g. Shirts, Dresses"
                  className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all"
                />
              </div>
            </div>

            {/* Unit Selection */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Selling Unit</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    value="m"
                    checked={formData.unit === 'm'}
                    onChange={() => setFormData({ ...formData, unit: 'm' })}
                    className="text-accent-green focus:ring-accent-green bg-input-bg border-gray-600"
                  />
                  <span className="text-sm font-bold text-white">Meters (m)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    value="kg"
                    checked={formData.unit === 'kg'}
                    onChange={() => setFormData({ ...formData, unit: 'kg' })}
                    className="text-accent-pink focus:ring-accent-pink bg-input-bg border-gray-600"
                  />
                  <span className="text-sm font-bold text-white">Kilograms (kg)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Quantity ({formData.unit})</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                  placeholder="0.0"
                  className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Price per {formData.unit === 'm' ? 'Meter' : 'Kg'} (₹)</label>
                <input
                  required
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all"
                />
              </div>
            </div>

            {/* ML-Powered Price & Demand Insights */}
            {showInsights && priceRecommendation && (
              <div className="bg-gradient-to-br from-accent-green/10 to-accent-pink/10 border border-accent-green/30 rounded-2xl p-5 space-y-4 animate-fade-up">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-accent-green">insights</span>
                  <h4 className="font-bold text-sm uppercase tracking-widest text-white">AI Price Insights</h4>
                  <span className="ml-auto text-xs bg-accent-green/20 text-accent-green px-2 py-1 rounded-full font-bold">
                    {Math.round(priceRecommendation.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="bg-black/20 rounded-xl p-2 sm:p-3 text-center">
                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Min</p>
                    <p className="text-sm sm:text-lg font-bold text-white">₹{priceRecommendation.minPrice}</p>
                  </div>
                  <div className="bg-accent-green/20 rounded-xl p-2 sm:p-3 text-center border border-accent-green/30">
                    <p className="text-[10px] sm:text-xs text-accent-green uppercase tracking-wider mb-1">Suggested</p>
                    <p className="text-base sm:text-xl font-black text-accent-green">₹{priceRecommendation.suggestedPrice}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2 sm:p-3 text-center">
                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Max</p>
                    <p className="text-sm sm:text-lg font-bold text-white">₹{priceRecommendation.maxPrice}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, price: priceRecommendation.suggestedPrice.toString() })}
                  className="w-full py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                  Apply Suggested Price
                </button>

                <p className="text-sm text-gray-400 italic">{priceRecommendation.insight}</p>

                {/* Price Factors */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  {priceRecommendation.factors.map((factor, idx) => (
                    <span
                      key={idx}
                      className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${factor.impact === 'positive' ? 'bg-green-500/20 text-green-400' :
                        factor.impact === 'negative' ? 'bg-red-500/20 text-red-400' :
                          factor.impact === 'discount' ? 'bg-blue-500/20 text-blue-400' :
                            factor.impact === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-white/10 text-gray-400'
                        }`}
                    >
                      {factor.name}: {factor.impact === 'primary' ? `₹${factor.value}` :
                        factor.impact === 'discount' ? `-${factor.value}%` :
                          factor.impact === 'premium' ? `+${factor.value}%` :
                            factor.value > 0 ? `+${factor.value}%` : `${factor.value}%`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Demand Prediction */}
            {showInsights && demandPrediction && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent-pink">trending_up</span>
                  <h4 className="font-bold text-sm uppercase tracking-widest text-white">Market Demand</h4>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Demand Score</span>
                      <span className={`font-bold ${demandPrediction.demandScore >= 70 ? 'text-green-400' :
                        demandPrediction.demandScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{demandPrediction.demandScore}/100</span>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${demandPrediction.demandScore >= 70 ? 'bg-green-500' :
                          demandPrediction.demandScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        style={{ width: `${demandPrediction.demandScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center px-4 border-l border-white/10">
                    <span className="text-[10px] text-gray-500 uppercase">Trend</span>
                    <span className={`flex items-center gap-1 font-bold text-sm ${demandPrediction.trend === 'rising' ? 'text-green-400' :
                      demandPrediction.trend === 'declining' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                      <span className="material-symbols-outlined text-sm">
                        {demandPrediction.trend === 'rising' ? 'trending_up' :
                          demandPrediction.trend === 'declining' ? 'trending_down' : 'trending_flat'}
                      </span>
                      {demandPrediction.trend}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Best Time to Sell</p>
                    <p className="text-sm font-bold text-accent-green">{demandPrediction.bestTimeToSell}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Competition</p>
                    <p className={`text-sm font-bold ${demandPrediction.competitionLevel === 'low' ? 'text-green-400' :
                      demandPrediction.competitionLevel === 'high' ? 'text-red-400' : 'text-yellow-400'
                      }`}>{demandPrediction.competitionLevel.charAt(0).toUpperCase() + demandPrediction.competitionLevel.slice(1)}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 italic pt-2">{demandPrediction.insight}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Location</label>
              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={isManualLocation ? 'Manual' : (formData.location === 'Panipat' ? 'Panipat' : '')}
                    onChange={handleLocationSelect}
                    className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Choose location</option>
                    <option value="Panipat" className="bg-deep-charcoal">Panipat</option>
                    <option value="Manual" className="bg-deep-charcoal">Manual Input (Other)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                </div>

                {isManualLocation && (
                  <div className="relative animate-fade-up">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">edit_location</span>
                    <input
                      required={isManualLocation}
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Enter City"
                      className="w-full bg-input-bg border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={loading || analyzing}
                className="flex-1 bg-white text-deep-charcoal font-black text-lg py-4 rounded-xl hover:bg-accent-green transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Saving...' : (editingId ? 'Update Listing' : 'Publish Listing')}
                {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 rounded-xl border border-white/10 hover:bg-white/10 font-bold transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Inventory Management Section */}
        <section className="pt-12 border-t border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black tracking-tight">Your Active <span className="text-accent-blue">Inventory</span></h2>
            <div className="text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 text-gray-400">
              {myListings.length} Items Listed
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.length > 0 ? myListings.map(listing => (
              <div key={listing.id} className={`bg-[#161b22] border ${editingId === listing.id ? 'border-accent-green ring-1 ring-accent-green' : 'border-white/5'} rounded-3xl p-4 transition-all hover:border-white/20 flex flex-col`}>
                <div className="flex gap-4 mb-4">
                  <div className="w-20 h-20 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                    <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0 overflow-hidden">
                    <h4 className="font-bold text-white truncate break-words">{listing.title}</h4>
                    <p className="text-xs text-gray-400 mt-1 truncate break-words">{listing.material}</p>
                    <p className="text-sm font-bold text-accent-green mt-1">₹{listing.pricePerUnit} <span className="text-gray-600 font-normal">/{listing.unit || 'm'}</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Stock</span>
                    <span className="text-sm font-bold text-white">{listing.qty}{listing.unit || 'm'}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={listing.status}
                      onChange={(e) => handleStatusChange(listing, e.target.value)}
                      className="bg-black/30 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white rounded-lg px-2 py-1 outline-none focus:border-accent-green cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <option value="Available" className="bg-deep-charcoal">Available</option>
                      <option value="Reserved" className="bg-deep-charcoal">Reserved</option>
                      <option value="Sold" className="bg-deep-charcoal">Sold</option>
                    </select>
                    <button
                      onClick={() => handleStartEdit(listing)}
                      disabled={editingId === listing.id}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Edit Listing"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete Listing"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                <p className="text-gray-500 font-medium">You haven't listed any fabrics yet.</p>
                <p className="text-sm text-gray-600 mt-1">Use the form above to get started.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Seller;
