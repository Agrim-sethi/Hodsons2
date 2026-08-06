export const ACCOUNT_TYPE_OPTIONS = [
  'Fabric Supplier',
  'Textile Recycler',
  'Wholesale Trader',
  'Artisan/Craftsman',
  'Fashion Designer',
  'Garment Manufacturer',
  'Boutique Owner',
  'Export House',
  'Home Furnishing Maker',
  'Upcycling Studio'
] as const;

export type AccountType = typeof ACCOUNT_TYPE_OPTIONS[number];

const LEGACY_ACCOUNT_TYPE_MAP: Record<string, AccountType> = {
  Buyer: 'Wholesale Trader',
  Seller: 'Fabric Supplier',
  Supplier: 'Fabric Supplier',
  Recycler: 'Textile Recycler',
  Designer: 'Fashion Designer'
};

export const DEFAULT_ACCOUNT_TYPE: AccountType = ACCOUNT_TYPE_OPTIONS[0];

export const normalizeAccountType = (value?: string | null): AccountType => {
  if (!value) return DEFAULT_ACCOUNT_TYPE;

  const exactMatch = ACCOUNT_TYPE_OPTIONS.find((option) => option === value);
  if (exactMatch) return exactMatch;

  return LEGACY_ACCOUNT_TYPE_MAP[value] || DEFAULT_ACCOUNT_TYPE;
};
