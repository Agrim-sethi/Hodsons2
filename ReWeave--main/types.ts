export interface Listing {
  id: string;
  title: string;
  description: string;
  uses: string;
  qty: number;
  unit: 'm' | 'kg'; // Added unit support
  pricePerUnit: number;
  location: string;
  imageUrl: string;
  material: string;
  sellerName: string;
  status: 'Available' | 'Reserved' | 'Sold';
  dateListed: string;
}

export interface User {
  companyName: string; // Renamed from username
  email: string;
  phoneNumber?: string;
  type: string;
  password?: string; // For simulation purposes only
  avatarUrl?: string;
  isProfileSetupComplete?: boolean;
}
