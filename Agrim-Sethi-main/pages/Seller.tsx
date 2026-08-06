import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { analyzeFabricImage } from '../services/geminiService';
import { Listing } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

const Seller: React.FC = () => {
  const { listings, addListing, updateListing, currentUser, showNotification } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    uses: '',
    qty: '',
    price: '',
    location: '',
    material: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for edit request from other pages
  useEffect(() => {
    if (location.state && location.state.editListing) {
      handleStartEdit(location.state.editListing);
      // Clear state so it doesn't persist on refresh in a weird way
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleStartEdit = (listing: Listing) => {
    setFormData({
      title: listing.title,
      description: listing.description,
      uses: listing.uses,
      qty: