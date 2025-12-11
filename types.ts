

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'customer' | 'owner' | 'run_man';
}

export interface Address {
  id: number;
  user_id: number;
  label: string | null;
  address_line: string;
  city: string;
  region: string;
  country: string;
  postal_code: string;
}

export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'cod';

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: PaymentMethod;
  shipping_address: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
  product_name?: string; // For display convenience
}

export interface Storefront {
  id: number;
  name: string;
  description: string;
  banner_url: string;
  logo_url: string;
  location: string;
  owner_name: string;
  owner_id?: number; // Linked User ID
  founded_year: number;
  tags: string; // Stored as pipe-separated string "Tag1|Tag2"
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  stock_status?: string;
  variants?: ProductVariant[];
  storefront_id?: number;
  store_name?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  additional_price: number;
  stock_quantity: number;
}

export interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  added_at: string;
}

export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  comment: string;
  created_at: string;
}

// --- Run Man / Logistics Types ---

export interface RunManProfile {
  user_id: number;
  vehicle_type: 'motorcycle' | 'car' | 'van' | 'bicycle';
  vehicle_plate: string;
  phone: string;
  status: 'active' | 'inactive' | 'busy';
  is_online: number; // 0 or 1 for SQLite boolean
  wallet_balance: number;
  current_lat?: number;
  current_lng?: number;
}

export interface Delivery {
  id: number;
  order_id: number;
  run_man_id?: number | null;
  status: 'searching' | 'assigned' | 'picked_up' | 'delivered';
  pickup_location: string;
  dropoff_location: string;
  earnings: number;
  proof_of_delivery?: string;
  created_at: string;
  updated_at: string;
}

// --- Contexts ---

export interface CustomerContext {
  profile: User | null;
  addresses: Address[];
  orders: Order[];
  recentItems: Product[];
  wishlist: WishlistItem[];
  reviews: Review[];
}

export interface VendorContext {
  profile: User;
  store: Storefront;
  products: Product[];
  orders: Order[]; // Orders containing their products
  totalSales: number;
  deliveries?: Delivery[]; // Associated deliveries
}

export interface RunManContext {
  profile: User;
  runManProfile: RunManProfile;
  activeDelivery: Delivery | null;
  availableDeliveries: Delivery[];
  completedDeliveries: Delivery[];
}

export interface CartItem extends Product {
  cartId: string;
  quantity: number;
}



export interface FinancialSummary {
  isConnected: boolean;
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  safeToSpend: number;
  recentTransactions: {
    id: string;
    date: string;
    merchant: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
  }[];
}

declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}