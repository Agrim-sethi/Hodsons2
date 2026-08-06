import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { storageService } from '../services/storageService';
import { auth } from '../config/firebase';
import AccountTypeSelect from './AccountTypeSelect';
import { DEFAULT_ACCOUNT_TYPE, normalizeAccountType } from '../constants/accountTypes';

const ProfileSetupModal: React.FC = () => {
    const { currentUser, setCurrentUser, showProfileSetup, setShowProfileSetup, showNotification, listings } = useAppContext();
    const [companyName, setCompanyName] = useState('');
    const [accountType, setAccountType] = useState(DEFAULT_ACCOUNT_TYPE);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setCompanyName(currentUser.companyName || '');
            setAccountType(normalizeAccountType(currentUser.type));
            setPhoneNumber(currentUser.phoneNumber || '');
        }
    }, [currentUser]);

    if (!showProfileSetup || !currentUser) return null;

    const handleConfirm = async () => {
        if (!auth.currentUser || !currentUser) return;
        if (!companyName.trim()) {
            showNotification("Company name is required.", "error");
            return;
        }

        const cleanedPhone = phoneNumber.replace(/\D/g, '');
        if (!cleanedPhone) {
            showNotification("Phone number is required.", "error");
            return;
        }
        if (cleanedPhone.length !== 10) {
            showNotification("Phone number must be exactly 10 digits.", "error");
            return;
        }

        setIsSaving(true);
        try {
            const oldCompanyName = currentUser.companyName;
            const updates = {
                companyName: companyName.trim(),
                type: accountType,
                phoneNumber: phoneNumber.trim(),
                isProfileSetupComplete: true
            };

            await storageService.updateUserProfile(auth.currentUser.uid, updates);

            // Coordinated update for listings if company name changed
            if (oldCompanyName && oldCompanyName !== companyName.trim()) {
                const userListings = listings.filter(l => l.sellerName === oldCompanyName || l.sellerName === 'You');
                for (const listing of userListings) {
                    await storageService.updateListing({
                        ...listing,
                        sellerName: companyName.trim()
                    });
                }
            }

            await setCurrentUser({
                ...currentUser,
                ...updates
            });

            setShowProfileSetup(false);
            showNotification("Profile details confirmed!", "success");
        } catch (error) {
            console.error('Error in profile setup:', error);
            showNotification("Failed to save profile details.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-deep-charcoal/80 backdrop-blur-md"
                onClick={() => !isSaving && setShowProfileSetup(false)}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-lg bg-charcoal border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-pink/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-green/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <header className="text-center mb-8">
                        <div className="w-16 h-16 bg-accent-pink/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-accent-pink text-3xl font-bold">person_check</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-white mb-2">Welcome!</h2>
                        <p className="text-gray-400 text-sm">Please confirm your profile details to continue.</p>
                    </header>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold ml-1">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-pink transition-colors"
                                placeholder="Enter your company name"
                                disabled={isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold ml-1">Account Type</label>
                            <div className="relative">
                                <AccountTypeSelect
                                    value={accountType}
                                    onChange={setAccountType}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-pink appearance-none cursor-pointer"
                                    disabled={isSaving}
                                />
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold ml-1">Phone Number</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-pink transition-colors"
                                placeholder="e.g. 9876543210"
                                disabled={isSaving}
                            />
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={isSaving}
                            className="w-full mt-4 bg-accent-pink text-deep-charcoal font-black py-4 rounded-xl text-lg hover:bg-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <span className="animate-spin material-symbols-outlined">sync</span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    Confirm & Continue
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetupModal;
