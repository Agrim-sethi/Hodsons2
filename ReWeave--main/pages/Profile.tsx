import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { storageService } from '../services/storageService';
import { auth } from '../config/firebase';
import AccountTypeSelect from '../components/AccountTypeSelect';
import { DEFAULT_ACCOUNT_TYPE, normalizeAccountType } from '../constants/accountTypes';

const Profile: React.FC = () => {
  const { listings, deleteListing, logout, currentUser, setCurrentUser, showNotification, interestedListingIds, updateListing } = useAppContext();
  const navigate = useNavigate();
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [companyName, setCompanyName] = useState(currentUser?.companyName || '');
  const [accountType, setAccountType] = useState(normalizeAccountType(currentUser?.type || DEFAULT_ACCOUNT_TYPE));
  const [isSaving, setIsSaving] = useState(false);

  // If no user is logged in, redirect to login
  React.useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  // Filter listings for current user
  const myListings = listings.filter(l => l.sellerName === 'You' || l.sellerName === currentUser.companyName);

  // Filter listings user is interested in
  const interestedListings = listings.filter(l => interestedListingIds.includes(l.id));

  const handleEdit = (listing: any) => {
    navigate('/seller', { state: { editListing: listing } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      deleteListing(id);
      showNotification("Listing deleted successfully", "info");
    }
  };

  const handleStatusChange = (listing: Listing, newStatus: string) => {
    updateListing({ ...listing, status: newStatus as any });
    showNotification(`Listing marked as ${newStatus}`);
  };

  const handleDownloadData = () => {
    // 1. Define Headers
    const headers = "Category,Title,Material,Quantity,Unit,PricePerUnit,Status,DateListed,Location\n";

    // 2. Format 'My Listings' Rows
    const myListingsRows = myListings.map(l =>
      `My Listing,"${l.title.replace(/"/g, '""')}",${l.material},${l.qty},${l.unit || 'm'},${l.pricePerUnit},${l.status},${l.dateListed},"${l.location}"`
    ).join("\n");

    // 3. Format 'Interested Listings' Rows
    const interestedRows = interestedListings.map(l =>
      `Interested In,"${l.title.replace(/"/g, '""')}",${l.material},${l.qty},${l.unit || 'm'},${l.pricePerUnit},${l.status},${l.dateListed},"${l.location}"`
    ).join("\n");

    // 4. Combine
    const csvContent = headers + (myListingsRows ? myListingsRows + "\n" : "") + interestedRows;

    // 5. Create Blob and Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentUser.companyName.replace(/\s+/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("Data downloaded successfully!");
  };

  const handleUpdatePhone = async () => {
    if (!auth.currentUser) return;

    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      showNotification("Phone number must be exactly 10 digits.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await storageService.updateUserProfile(auth.currentUser.uid, {
        phoneNumber: phoneNumber
      });

      // Update local user state
      if (currentUser) {
        await setCurrentUser({
          ...currentUser,
          phoneNumber: phoneNumber
        });
      }

      setIsEditingPhone(false);
      showNotification("Phone number updated successfully!", "success");
    } catch (error) {
      console.error('Error updating phone:', error);
      showNotification("Failed to update phone number", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!auth.currentUser || !currentUser) return;
    if (!companyName.trim()) {
      showNotification("Company name cannot be empty.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const oldCompanyName = currentUser.companyName;
      await storageService.updateUserProfile(auth.currentUser.uid, {
        companyName: companyName.trim()
      });

      // Also update all listings that belong to this user
      const userListings = listings.filter(l => l.sellerName === oldCompanyName || l.sellerName === 'You');
      for (const listing of userListings) {
        await storageService.updateListing({
          ...listing,
          sellerName: companyName.trim()
        });
      }

      await setCurrentUser({
        ...currentUser,
        companyName: companyName.trim()
      });

      setIsEditingCompany(false);
      showNotification("Company name updated successfully!", "success");
    } catch (error) {
      console.error('Error updating company name:', error);
      showNotification("Failed to update company name", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateType = async () => {
    if (!auth.currentUser || !currentUser) return;

    setIsSaving(true);
    try {
      await storageService.updateUserProfile(auth.currentUser.uid, {
        type: accountType
      });

      await setCurrentUser({
        ...currentUser,
        type: accountType
      });

      setIsEditingType(false);
      showNotification("Account type updated successfully!", "success");
    } catch (error) {
      console.error('Error updating account type:', error);
      showNotification("Failed to update account type", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelTypeEdit = () => {
    setAccountType(normalizeAccountType(currentUser?.type || DEFAULT_ACCOUNT_TYPE));
    setIsEditingType(false);
  };

  const handleCancelCompanyEdit = () => {
    setCompanyName(currentUser?.companyName || '');
    setIsEditingCompany(false);
  };

  const handleCancelEdit = () => {
    setPhoneNumber(currentUser?.phoneNumber || '');
    setIsEditingPhone(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    showNotification("Logged out successfully");
  };

  return (
    <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl sm:text-7xl font-black tracking-tighter mb-4">{currentUser.type} <span className="text-accent-pink">Profile</span></h1>
        <div className="flex flex-wrap gap-8 items-center mt-8 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
          <div className="flex flex-col flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Company Name</span>
              {!isEditingCompany && (
                <button
                  onClick={() => setIsEditingCompany(true)}
                  className="text-accent-green hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit
                </button>
              )}
            </div>
            {isEditingCompany ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-black/30 border border-white/20 rounded-xl px-4 py-2 text-white text-lg font-bold focus:outline-none focus:border-accent-green transition-colors flex-1"
                  disabled={isSaving}
                  autoFocus
                />
                <button
                  onClick={handleUpdateCompany}
                  disabled={isSaving}
                  className="px-4 py-2 bg-accent-green text-deep-charcoal rounded-xl font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  {isSaving ? '...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelCompanyEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <span className="text-2xl font-black text-white tracking-tight">{currentUser.companyName}</span>
            )}
          </div>
          <div className="h-12 w-px bg-white/10 hidden md:block"></div>
          <div className="flex flex-col flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Account Type</span>
              {!isEditingType && (
                <button
                  onClick={() => setIsEditingType(true)}
                  className="text-accent-green hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit
                </button>
              )}
            </div>
            {isEditingType ? (
              <div className="flex items-center gap-3">
                <AccountTypeSelect
                  value={accountType}
                  onChange={setAccountType}
                  className="bg-black/30 border border-white/20 rounded-xl px-4 py-2 text-white text-lg font-bold focus:outline-none focus:border-accent-green transition-colors flex-1"
                  disabled={isSaving}
                />
                <button
                  onClick={handleUpdateType}
                  disabled={isSaving}
                  className="px-4 py-2 bg-accent-green text-deep-charcoal rounded-xl font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  {isSaving ? '...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelTypeEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <span className="text-2xl font-black text-white tracking-tight">{currentUser.type}</span>
            )}
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tighter mb-6">Account <span className="text-accent-pink">Info</span></h2>
          <div className="flex flex-wrap gap-8 items-center bg-white/5 border border-white/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem]">
            <div className="flex flex-col flex-1 min-w-[200px] overflow-hidden">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Email Address</span>
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight break-all">{currentUser.email}</span>
            </div>
            <div className="h-12 w-px bg-white/10 hidden md:block"></div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Phone Number</span>
                {!isEditingPhone && (
                  <button
                    onClick={() => setIsEditingPhone(true)}
                    className="text-accent-green hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                  </button>
                )}
              </div>
              {isEditingPhone ? (
                <div className="flex items-center gap-3">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhoneNumber(val);
                    }}
                    maxLength={10}
                    placeholder="Enter 10 digit number"
                    className="bg-black/30 border border-white/20 rounded-xl px-4 py-2 text-white text-lg font-bold focus:outline-none focus:border-accent-green transition-colors flex-1"
                    disabled={isSaving}
                  />
                  <button
                    onClick={handleUpdatePhone}
                    disabled={isSaving}
                    className="px-4 py-2 bg-accent-green text-deep-charcoal rounded-xl font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span className="text-2xl font-black text-white tracking-tight">{currentUser.phoneNumber || "Not Provided"}</span>
              )}
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
              <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center relative">
                <img alt={listing.title} className="w-full h-full object-cover" src={listing.imageUrl} />
              </div>
              <div className="flex-grow space-y-1 text-center md:text-left">
                <h3 className="text-xl font-bold">{listing.title}</h3>
                <p className="text-sm text-gray-400">{listing.material} • {listing.qty}{listing.unit || 'm'} • ₹{listing.pricePerUnit}/{listing.unit || 'm'}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                  <select
                    value={listing.status}
                    onChange={(e) => handleStatusChange(listing, e.target.value)}
                    className="bg-black/30 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-accent-green rounded-lg px-2 py-1 outline-none focus:border-accent-green cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <option value="Available" className="bg-deep-charcoal text-white">Available</option>
                    <option value="Reserved" className="bg-deep-charcoal text-white">Reserved</option>
                    <option value="Sold" className="bg-deep-charcoal text-white">Sold</option>
                  </select>
                  <span className="px-3 py-1 bg-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10">
                    Listed: {new Date(listing.dateListed).toLocaleDateString()}
                  </span>
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
                  onClick={() => handleDelete(listing.id)}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all"
                  title="Delete Listing"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          )) : (
            <div className="text-gray-500 text-center py-10 bg-white/5 rounded-[2rem] border border-white/5 border-dashed">
              <p className="mb-4">You have no active listings.</p>
              <button onClick={() => navigate('/seller')} className="text-accent-green font-bold hover:underline">Create one now</button>
            </div>
          )}
        </div>
      </section>

      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-black tracking-tighter">Your <span className="text-accent-pink">Interest Warehouse</span></h2>
        </div>
        {interestedListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interestedListings.map(listing => (
              <div key={listing.id} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col group hover:bg-white/10 transition-colors">
                <div className="aspect-video relative overflow-hidden bg-gray-900">
                  <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <p className="text-white font-bold text-lg">{listing.title}</p>
                    <p className="text-accent-green text-sm font-medium">₹{listing.pricePerUnit}/{listing.unit || 'm'}</p>
                  </div>
                </div>
                <div className="p-6 flex-grow flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold uppercase">Seller</span>
                      <span className="text-sm text-white">{listing.sellerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold uppercase">Location</span>
                      <span className="text-sm text-white">{listing.location}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/buyer')}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white text-white hover:text-deep-charcoal font-bold text-sm transition-all border border-white/10"
                  >
                    View in Marketplace
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem]">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-gray-600">inventory_2</span>
            </div>
            <p className="text-xl font-bold text-gray-500">No interest in fabrics shown as of yet</p>
            <p className="text-sm text-gray-600 mt-2">Saved materials and inquiries will appear here.</p>
          </div>
        )}
      </section>

      <section className="flex flex-col md:flex-row gap-4 justify-between items-center py-10 border-t border-white/10">
        <button
          onClick={handleDownloadData}
          className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all text-sm uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Download My Data
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-8 py-4 bg-red-600/10 border border-red-600/20 text-red-500 rounded-2xl font-black hover:bg-red-600 hover:text-white transition-all text-sm uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Logout
        </button>
      </section>
    </main>
  );
};

export default Profile;
