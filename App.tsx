

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, ShoppingBag, Trash2, Plus, Minus, Mail, Star, Heart, CheckCircle, ShoppingCart, Globe, Shield, Menu, Zap, Utensils, Shirt, Home as HomeIcon, Smartphone, Sparkles, Store, MapPin, Tag, User, Calendar } from 'lucide-react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatWidget from './components/ChatWidget';
import StoreProductCard from './components/StoreProductCard';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';

import VendorDashboard from './components/VendorDashboard';
import RunManDashboard from './components/RunManDashboard';
import { fetchCustomerContext, getAllProducts, loginUser, updateWishlistInDb, getAllStorefronts, getStorefrontDetails, fetchVendorContext, createOrder } from './services/supabaseService';
import { initializeGemini } from './services/geminiService';
import { CustomerContext, Product, CartItem, WishlistItem, Storefront, VendorContext, PaymentMethod } from './types';

const App: React.FC = () => {
  // Application State
  const [view, setView] = useState<'home' | 'shop' | 'cart' | 'wishlist' | 'artisans' | 'store_profile' | 'vendor_dashboard' | 'run_man_dashboard'>('home');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);
  const [selectedStore, setSelectedStore] = useState<Storefront | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [context, setContext] = useState<CustomerContext>({ profile: null, addresses: [], orders: [], recentItems: [], wishlist: [], reviews: [] });
  const [vendorContext, setVendorContext] = useState<VendorContext | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  

  // Initialization
  useEffect(() => {
    // TODO: Replace with a securely fetched API key (e.g., from a Netlify Function)
    const geminiApiKey = "YOUR_GEMINI_API_KEY"; // THIS IS A PLACEHOLDER. DO NOT COMMIT REAL KEY.
    initializeGemini(geminiApiKey);
    refreshSystemState(null);
  }, []);



  useEffect(() => {
    setContext(prev => {
        const wishlistItems: WishlistItem[] = wishlistIds.map(id => ({
            id: Math.random(),
            user_id: prev.profile?.id || 0,
            product_id: id,
            added_at: new Date().toISOString()
        }));

        return {
            ...prev,
            wishlist: wishlistItems
        };
    });
  }, [wishlistIds]);

  const refreshSystemState = async (userId: number | null) => {
    try {
        const customerContext = await fetchCustomerContext(userId);
        setContext(customerContext);

        // If user is an owner, fetch their vendor details too
        if (customerContext.profile?.role === 'owner') {
             const vContext = await fetchVendorContext(customerContext.profile.id);
             setVendorContext(vContext);
        } else {
             setVendorContext(null);
        }

        if (customerContext.wishlist.length > 0) {
            setWishlistIds(customerContext.wishlist.map(w => w.product_id));
        } else {
            setWishlistIds([]);
        }

        // Always fetch fresh data to capture new stores/products added during session or by other users
        const allProducts = await getAllProducts();
        setProducts(allProducts);

        const allStores = await getAllStorefronts();
        setStorefronts(allStores);
        
        // Redirect logic based on role
        if (customerContext.profile?.role === 'owner' && view !== 'vendor_dashboard') {
            setView('vendor_dashboard');
        } else if (customerContext.profile?.role === 'run_man' && view !== 'run_man_dashboard') {
            setView('run_man_dashboard');
        }

    } catch (e: any) {
        console.error("Init error", e);
    } finally {
        setLoading(false);
    }
  };

  const handleLogin = async (email: string, password?: string, role: 'customer' | 'owner' | 'run_man' = 'customer'): Promise<boolean> => {
    const user = await loginUser(email, password, role);
    if (user) {
        await refreshSystemState(user.id);
        return true;
    }
    return false;
  };

  const handleLogout = async () => {
    setContext(prev => ({ ...prev, profile: null, orders: [], wishlist: [] }));
    setVendorContext(null);
    setWishlistIds([]);
    await refreshSystemState(null);
    setView('home');
  };



  const handleViewStore = async (storeId: number) => {
      setLoading(true);
      const details = await getStorefrontDetails(storeId);
      if (details.store) {
          setSelectedStore(details.store);
          setStoreProducts(details.products);
          setView('store_profile');
      }
      setLoading(false);
  };

  const handlePreviewOwnStore = async () => {
      if (vendorContext?.store) {
          handleViewStore(vendorContext.store.id);
      }
  };

  const addToCart = (product: Product) => {
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

  const toggleWishlist = async (product: Product) => {
    setWishlistIds(prev => {
        if (prev.includes(product.id)) {
            return prev.filter(id => id !== product.id);
        } else {
            return [...prev, product.id];
        }
    });

    if (context.profile) {
        const isRemoving = wishlistIds.includes(product.id);
        await updateWishlistInDb(context.profile.id, product.id, isRemoving);
    }
  };

  const handleCheckoutClick = () => {
      if (!context.profile) {
          setIsAuthOpen(true);
      } else {
          setIsCheckoutOpen(true);
      }
  };

  const handleConfirmOrder = async (address: string, paymentMethod: PaymentMethod) => {
      if (!context.profile) return;
      
      const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const finalTotal = cartTotal + 15 + (cartTotal * 0.125); // Shipping + Tax
      
      await createOrder(context.profile.id, cart, finalTotal, paymentMethod, address);
      
      setCart([]);
      await refreshSystemState(context.profile.id);
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

  // Determine if sidebar should be shown (Not on vendor/runman dashboard)
  const showSidebar = view !== 'vendor_dashboard' && view !== 'run_man_dashboard';
  const showChat = view !== 'run_man_dashboard';

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">
      {/* Sidebar - Desktop (Hidden on Specific Dashboards) */}
      {showSidebar && (
        <Sidebar 
            context={context} 
            isConnected={true} 
            onNavigate={setView}
        />
      )}

      {/* Main Content Area */}
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
            
            {/* RUN MAN DASHBOARD */}
            {view === 'run_man_dashboard' && context.profile?.role === 'run_man' && (
                <RunManDashboard 
                    userId={context.profile.id}
                    onLogout={handleLogout}
                />
            )}

            {/* VENDOR DASHBOARD VIEW */}
            {view === 'vendor_dashboard' && context.profile?.role === 'owner' && (
                <VendorDashboard 
                    userId={context.profile.id} 
                    onLogout={handleLogout}
                    onPreviewStore={handlePreviewOwnStore}
                />
            )}

            {/* SHOPPER VIEWS */}
            {view === 'home' && (
               <div className="animate-in fade-in duration-500">
                 
                 {/* 1. Split Hero Section */}
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
                            <button 
                                onClick={() => setView('shop')}
                                className="px-8 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-belize-teal transition-colors"
                            >
                                Shop All
                            </button>
                            <button 
                                onClick={() => setView('artisans')}
                                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                            >
                                Meet Artisans
                            </button>
                        </div>
                    </div>
                    <div className="relative h-64 md:h-auto order-1 md:order-2 overflow-hidden">
                         <img 
                            src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200" 
                            alt="Belize Artisan Market" 
                            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-gray-50/20"></div>
                    </div>
                 </div>

                 {/* 2. Category Discovery */}
                 <div className="max-w-7xl mx-auto px-6 py-20">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8 text-center">Explore by Category</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div onClick={() => setView('shop')} className="cursor-pointer bg-white p-6 border border-gray-100 rounded-xl hover:shadow-lg hover:border-belize-teal/20 transition-all text-center group">
                            <Utensils className="w-10 h-10 mx-auto text-gray-400 group-hover:text-belize-teal mb-3 transition-colors" />
                            <h3 className="font-bold text-gray-800">Pantry</h3>
                        </div>
                        <div onClick={() => setView('shop')} className="cursor-pointer bg-white p-6 border border-gray-100 rounded-xl hover:shadow-lg hover:border-belize-coral/20 transition-all text-center group">
                            <HomeIcon className="w-10 h-10 mx-auto text-gray-400 group-hover:text-belize-coral mb-3 transition-colors" />
                            <h3 className="font-bold text-gray-800">Decor</h3>
                        </div>
                        <div onClick={() => setView('shop')} className="cursor-pointer bg-white p-6 border border-gray-100 rounded-xl hover:shadow-lg hover:border-belize-blue/20 transition-all text-center group">
                            <Shirt className="w-10 h-10 mx-auto text-gray-400 group-hover:text-belize-blue mb-3 transition-colors" />
                            <h3 className="font-bold text-gray-800">Style</h3>
                        </div>
                        <div onClick={() => setView('shop')} className="cursor-pointer bg-white p-6 border border-gray-100 rounded-xl hover:shadow-lg hover:border-purple-500/20 transition-all text-center group">
                            <Sparkles className="w-10 h-10 mx-auto text-gray-400 group-hover:text-purple-500 mb-3 transition-colors" />
                            <h3 className="font-bold text-gray-800">Gifts</h3>
                        </div>
                    </div>
                 </div>

                 {/* 3. Featured Artisans Preview */}
                 <div className="bg-belize-sand/10 py-20">
                     <div className="max-w-7xl mx-auto px-6">
                        <div className="flex justify-between items-end mb-10">
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Our Artisans</h2>
                                <p className="text-gray-600">The hands and hearts behind the products.</p>
                            </div>
                            <button onClick={() => setView('artisans')} className="text-belize-teal font-bold hover:underline flex items-center gap-1">
                                View All <ArrowRight size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {storefronts.slice(0, 3).map(store => (
                                <div key={store.id} onClick={() => handleViewStore(store.id)} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow cursor-pointer group">
                                    <div className="h-32 overflow-hidden">
                                        <img src={store.banner_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <div className="p-6 relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden absolute -top-8 left-6 shadow-md">
                                            <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="mt-8">
                                            <h3 className="font-bold text-lg text-gray-900">{store.name}</h3>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 mb-2">
                                              <MapPin size={12} />
                                              <span>{store.location || 'Belize'}</span>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-2">{store.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                 </div>

               </div>
            )}

            {view === 'artisans' && (
                <div className="animate-in fade-in duration-500 max-w-7xl mx-auto px-6 py-10">
                    <div className="mb-10 text-center">
                        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-3">Artisan Directory</h1>
                        <p className="text-gray-500 max-w-2xl mx-auto">Support local Belizean businesses directly. Every purchase helps sustain traditional craftsmanship.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {storefronts.map(store => (
                            <div key={store.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
                                <div className="h-48 overflow-hidden relative">
                                    <img src={store.banner_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-black/20"></div>
                                    
                                    {/* Location Badge */}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                                      <MapPin size={12} className="text-belize-teal" />
                                      {store.location || 'Belize'}
                                    </div>
                                </div>
                                
                                <div className="p-6 flex-1 flex flex-col -mt-12 relative z-10">
                                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden mb-4 bg-white">
                                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                                    </div>
                                    
                                    <div className="mb-4">
                                      <h3 className="text-2xl font-serif font-bold text-gray-900 mb-1">{store.name}</h3>
                                      <p className="text-xs text-belize-teal font-medium uppercase tracking-wider mb-2">Owner: {store.owner_name || 'The Team'}</p>
                                      <p className="text-gray-600 text-sm leading-relaxed">{store.description}</p>
                                    </div>

                                    {/* Tags */}
                                    {store.tags && (
                                      <div className="flex flex-wrap gap-2 mb-6">
                                        {store.tags.split('|').map(tag => (
                                          <span key={tag} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    <div className="mt-auto">
                                      <button 
                                          onClick={() => handleViewStore(store.id)}
                                          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-belize-teal transition-colors w-full flex items-center justify-center gap-2 group-hover:shadow-lg"
                                      >
                                          Visit Shop <ArrowRight size={16} />
                                      </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'store_profile' && selectedStore && (
                <div className="animate-in fade-in duration-500">
                    {/* Immersive Store Hero */}
                    <div className="relative h-[400px]">
                        <img src={selectedStore.banner_url} alt={selectedStore.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                           <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-8">
                              <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white shrink-0 mb-4 md:mb-0">
                                  <img src={selectedStore.logo_url} alt={selectedStore.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 text-white mb-4">
                                  <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h1 className="text-4xl md:text-5xl font-serif font-bold">{selectedStore.name}</h1>
                                    <CheckCircle size={24} className="text-belize-teal fill-white" />
                                    {/* Show "Edit" badge if looking at own store */}
                                    {context.profile?.id === selectedStore.owner_id && (
                                        <span onClick={() => setView('vendor_dashboard')} className="cursor-pointer text-xs bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50">
                                            Manage Store
                                        </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-6 text-sm md:text-base text-gray-200">
                                      <span className="flex items-center gap-2"><MapPin size={16} /> {selectedStore.location || 'Belize'}</span>
                                      <span className="flex items-center gap-2"><User size={16} /> {selectedStore.owner_name || 'Artisan Team'}</span>
                                  </div>
                              </div>
                           </div>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="border-b border-gray-200 bg-white">
                      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-8 text-sm">
                          <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-belize-teal" />
                              <span className="text-gray-500">Member since</span>
                              <span className="font-bold text-gray-900">{selectedStore.founded_year || 2024}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <Star size={16} className="text-belize-coral" />
                              <span className="text-gray-500">Rating</span>
                              <span className="font-bold text-gray-900">4.9/5.0</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <Store size={16} className="text-belize-blue" />
                              <span className="text-gray-500">Products</span>
                              <span className="font-bold text-gray-900">{storeProducts.length} Active</span>
                          </div>
                      </div>
                    </div>

                    {/* Store Content */}
                    <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
                        {/* Sidebar Info */}
                        <div className="lg:col-span-1 space-y-8">
                            <div>
                              <h3 className="font-bold text-gray-900 mb-4 text-lg">About the Artisan</h3>
                              <p className="text-gray-600 leading-relaxed text-sm">{selectedStore.description}</p>
                            </div>

                            {selectedStore.tags && (
                              <div>
                                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Specialties</h3>
                                <div className="flex flex-wrap gap-2">
                                  {selectedStore.tags.split('|').map(tag => (
                                    <span key={tag} className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <button onClick={() => setView('artisans')} className="text-belize-teal text-sm font-bold hover:underline flex items-center gap-2">
                               <ArrowRight size={16} className="rotate-180" /> Back to Directory
                            </button>
                        </div>

                        {/* Product Grid */}
                        <div className="lg:col-span-3">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop Collection</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {storeProducts.map(product => (
                                    <StoreProductCard 
                                        key={product.id} 
                                        product={product} 
                                        onAddToCart={addToCart} 
                                        isWishlisted={wishlistIds.includes(product.id)}
                                        onToggleWishlist={() => toggleWishlist(product)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'shop' && (
              <div className="animate-in fade-in duration-500 max-w-7xl mx-auto px-6 py-10">
                 <div className="mb-10 text-center">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 mb-3">Shop Collection</h1>
                    <p className="text-gray-500 max-w-2xl mx-auto">Explore our full range of authentic goods.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map(product => (
                      <StoreProductCard 
                        key={product.id} 
                        product={product} 
                        onAddToCart={addToCart} 
                        isWishlisted={wishlistIds.includes(product.id)}
                        onToggleWishlist={() => toggleWishlist(product)}
                      />
                    ))}
                 </div>
              </div>
            )}

            {view === 'wishlist' && (
               <div className="animate-in fade-in duration-500 max-w-7xl mx-auto px-6 py-12 min-h-[60vh]">
                  <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8 flex items-center gap-3">
                     <Heart className="text-belize-coral fill-belize-coral" />
                     My Wishlist
                  </h1>

                  {wishlistIds.length === 0 ? (
                     <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <Heart size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-6">Your wishlist is empty.</p>
                        <button 
                          onClick={() => setView('shop')}
                          className="px-6 py-3 bg-belize-teal text-white rounded-full font-bold hover:bg-belize-jungle transition-colors"
                        >
                          Browse Products
                        </button>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {products.filter(p => wishlistIds.includes(p.id)).map(product => (
                           <StoreProductCard 
                              key={product.id} 
                              product={product} 
                              onAddToCart={addToCart}
                              isWishlisted={true}
                              onToggleWishlist={() => toggleWishlist(product)}
                           />
                        ))}
                     </div>
                  )}
               </div>
            )}

            {view === 'cart' && (
              <div className="animate-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto px-6 py-12">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Shopping Bag</h1>
                
                {cart.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                     <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                     <p className="text-gray-500 mb-6">Your bag is empty.</p>
                     <button 
                       onClick={() => setView('shop')}
                       className="px-6 py-3 bg-belize-teal text-white rounded-full font-bold hover:bg-belize-jungle transition-colors"
                     >
                       Start Shopping
                     </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-6">
                      {cart.map(item => (
                        <div key={item.cartId} className="flex gap-6 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                           <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                 <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                                 <p className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                              <p className="text-sm text-gray-500 mb-4">{item.category}</p>
                              
                              <div className="flex items-center gap-4">
                                 <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                                    <button 
                                      onClick={() => updateQuantity(item.cartId, -1)}
                                      className="p-2 hover:bg-gray-100 text-gray-600 rounded-l-lg"
                                    >
                                       <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateQuantity(item.cartId, 1)}
                                      className="p-2 hover:bg-gray-100 text-gray-600 rounded-r-lg"
                                    >
                                       <Plus size={14} />
                                    </button>
                                 </div>
                                 <button 
                                   onClick={() => removeFromCart(item.cartId)}
                                   className="text-red-400 hover:text-red-600 p-2"
                                 >
                                   <Trash2 size={18} />
                                 </button>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="lg:col-span-1">
                       <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200 sticky top-24">
                          <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>
                          
                          <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                             <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>${cartTotal.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-gray-600">
                                <span>Shipping</span>
                                <span>${shipping.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-gray-600">
                                <span>Tax (12.5%)</span>
                                <span>${tax.toFixed(2)}</span>
                             </div>
                          </div>

                          <div className="flex justify-between text-xl font-bold text-gray-900 mb-8">
                             <span>Total</span>
                             <span>${finalTotal.toFixed(2)}</span>
                          </div>

                          <button 
                             onClick={handleCheckoutClick}
                             className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-belize-teal transition-colors shadow-lg flex justify-center"
                          >
                             Checkout
                          </button>
                          <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-2">
                             <Shield size={12} /> Secure Checkout
                          </p>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLogin={handleLogin}
      />

      {/* New Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        subtotal={cartTotal}
        total={finalTotal}
        user={context.profile}
        onConfirmOrder={handleConfirmOrder}
      />



      {/* Persistent Chat Widget - HIDDEN for Run Men to reduce distraction */}
      {showChat && (
        <ChatWidget 
            context={context} 
            vendorContext={vendorContext}
            isConnected={true} 
            products={products}
            currentView={view as any}

        />
      )}

      {/* Hidden Footer (rendered inside main scroll area but logically here) */}
    </div>
  );
};

export default App;