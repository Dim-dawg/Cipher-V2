import React, { useState } from 'react';
import { Loader2, ArrowRight, ShoppingBag, Trash2, Plus, Minus, Mail, Star, Heart, CheckCircle, ShoppingCart, Globe, Shield, Menu, Zap, Utensils, Shirt, Home as HomeIcon, Smartphone, Sparkles, Store, MapPin, Tag, User, Calendar, Briefcase, Bike } from 'lucide-react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatWidget from './components/ChatWidget';
import StoreProductCard from './components/StoreProductCard';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import VendorDashboard from './components/VendorDashboard';
import RunManDashboard from './components/RunManDashboard';

// --- Static Placeholder Data ---

const placeholderProducts = [
    { id: 1, name: 'Hand-carved Mahogany Bowl', description: 'A beautiful bowl made from local mahogany wood.', price: 120.00, category: 'Home', image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200' },
    { id: 2, name: 'Marie Sharp\'s Hot Sauce', description: 'The classic fiery habanero hot sauce from Belize.', price: 8.50, category: 'Food', image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200' },
    { id: 3, name: 'Woven Jipijapa Basket', description: 'A small, intricately woven basket perfect for decoration.', price: 45.00, category: 'Home', image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200' },
];

const placeholderStorefronts = [
    { id: 1, name: 'The Belizean Artistry', description: 'Handcrafted wooden goods from the heart of the jungle.', user_id: '1', banner_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200', logo_url: 'https://placehold.co/200x200/007f8b/ffffff?text=Store', location: 'San Ignacio', owner_name: 'John Doe', founded_year: 2020, tags: 'Woodwork|Handmade' },
];

const App: React.FC = () => {
  // Application State
  const [view, setView] = useState<'home' | 'shop' | 'cart' | 'wishlist' | 'artisans' | 'store_profile' | 'vendor_dashboard' | 'run_man_dashboard'>('home');
  const [loading, setLoading] = useState(false);
  
  // Data State - now using placeholders
  const [products] = useState(placeholderProducts);
  const [storefronts] = useState(placeholderStorefronts);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [storeProducts] = useState(placeholderProducts);
  
  const [cart, setCart] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [context, setContext] = useState<any>({ profile: null });
  const [vendorContext] = useState<any | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // All database-related useEffects and functions are removed.
  
  const handleLogin = async (): Promise<boolean> => {
    console.log("Login attempt (database functionality removed).");
    // Simulate a successful login for UI purposes
    setContext({ profile: { id: '1', username: 'Test User', email: 'test@example.com', roles: ['customer'] } });
    setIsAuthOpen(false);
    return true;
  };

  const handleLogout = async () => {
    console.log("Logout (database functionality removed).");
    setContext({ profile: null });
    setView('home');
  };

  const handleViewStore = async (storeId: number) => {
      const store = storefronts.find(s => s.id === storeId);
      if (store) {
          setSelectedStore(store);
          setView('store_profile');
      }
  };
  
  const handlePreviewOwnStore = async () => {};
  
  const addToCart = (product: any) => {
    setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
            return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { ...product, cartId: Math.random().toString(36), quantity: 1 }];
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.cartId === cartId) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
        }
        return item;
    }));
  };

  const toggleWishlist = async (product: any) => {
    console.log("Toggled wishlist (database functionality removed).");
    setWishlistIds(prev => {
        if (prev.includes(product.id)) {
            return prev.filter(id => id !== product.id);
        } else {
            return [...prev, product.id];
        }
    });
  };
  
  const handleCheckoutClick = () => {
      if (!context.profile) {
          setIsAuthOpen(true);
      } else {
          setIsCheckoutOpen(true);
      }
  };

  const handleConfirmOrder = async (address: string, paymentMethod: any) => {
      console.log("Order confirmed (database functionality removed).", { address, paymentMethod });
      setCart([]);
      setIsCheckoutOpen(false);
  };
  
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const tax = cartTotal * 0.125;
  const shipping = 15.00;
  const finalTotal = cartTotal + shipping + tax;

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-belize-teal animate-spin" />
            <p className="text-gray-500 font-medium animate-pulse tracking-widest uppercase text-xs">Loading Sneak Peek...</p>
        </div>
      </div>
    );
  }

  const showSidebar = view !== 'vendor_dashboard' && view !== 'run_man_dashboard';
  const showChat = view !== 'run_man_dashboard';

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">
      {showSidebar && (
        <Sidebar 
            context={context} 
            isConnected={true} 
            onNavigate={setView}
        />
      )}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Navbar 
          onNavigate={setView} 
          cartCount={cartCount} 
          currentView={view as any} 
          context={context}
          onSignIn={() => setIsAuthOpen(true)}
          onSignOut={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-white scroll-smooth">
          <div className={(view === 'vendor_dashboard' || view === 'run_man_dashboard') ? '' : 'pb-20'}>
            {view === 'home' && (
               <div className="animate-in fade-in duration-500">
                 <div className="grid md:grid-cols-2 min-h-[600px] bg-gray-50">
                    <div className="flex flex-col justify-center px-10 md:px-16 py-12 order-2 md:order-1">
                        <div className="inline-flex items-center gap-2 text-belize-teal font-bold uppercase tracking-widest text-xs mb-6">
                            <span className="w-8 h-px bg-belize-teal"></span>
                            Est. 2024
                        </div>
                        <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                            Tradition Meets <br/>
                            <span className="text-belize-coral">Tomorrow.</span>
                        </h1>
                        <p className="text-lg text-gray-600 mb-8 max-w-md leading-relaxed">
                            A curated marketplace connecting Belize's finest artisans directly to your doorstep.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setView('shop')} className="px-8 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-belize-teal transition-colors">Shop All</button>
                            <button onClick={() => setView('artisans')} className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors">Meet Artisans</button>
                        </div>
                    </div>
                    <div className="relative h-64 md:h-auto order-1 md:order-2 overflow-hidden">
                         <img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200" alt="Belize Artisan Market" className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-1000"/>
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-gray-50/20"></div>
                    </div>
                 </div>
               </div>
            )}
          </div>
        </main>
      </div>
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        subtotal={cartTotal}
        total={finalTotal}
        user={context.profile}
        onConfirmOrder={handleConfirmOrder}
      />
      {showChat && (
        <ChatWidget 
            context={context} 
            vendorContext={vendorContext}
            isConnected={true} 
            allProducts={products} 
            currentView={view}
            currentCartItems={view === 'cart' ? cart : undefined}
            currentWishlistIds={view === 'wishlist' ? wishlistIds : undefined}
            currentlyDisplayedProducts={
              view === 'shop' ? products :
              view === 'store_profile' ? storeProducts :
              undefined
            }
            currentSelectedStore={view === 'store_profile' ? selectedStore : undefined}
        />
      )}
    </div>
  );
};

export default App;