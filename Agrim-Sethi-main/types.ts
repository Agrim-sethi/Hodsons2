export interface Listing {
  id: string;
  title: string;
  description: string;
  uses: string;
  qty: number;
  pricePerUnit: number;
  location: string;
  imageUrl: string;
  material: string;
  sellerName: string;
  status: 'Available' | 'Pending' | 'Sold';
  dateListed: string;
}

export interface User {
  username: string;
  email: string;
  type: 'Buyer' | 'Seller' | 'Admin';
  avatarUrl?: string;
}
