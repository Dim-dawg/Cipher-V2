

import React, { useState } from 'react';
import { ShoppingCart, Menu, UserCircle, X, Home, ShoppingBag, Settings, Heart, Store, LayoutDashboard, Bike, DollarSign } from 'lucide-react';
import { CustomerContext } from '../types';

interface NavbarProps {
  onNavigate: (view: 'home' | 'shop' | 'cart' | 'wishlist' | 'artisans' | 'vendor_dashboard' | 'run_man_dashboard') => void;
  cartCount: number;
  currentView: 'home' | 'shop' | 'cart' | 'wishlist' | 'artisans' | 'store_profile' | 'vendor_dashboard' | 'run_man_dashboard';
  context: CustomerContext;
  onSignIn: () => void;
  onSignOut: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onNavigate, 
  cartCount, 
  currentView, 
  context, 
  onSignIn, 
  onSignOut
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // If Run Man, simplify navbar significantly
  if (context.profile?.role === 'run_man') {
      return (
          <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30 px-6 py-4 shadow-sm text-white">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                       <Bike className="text-orange-500" />
                       <span className="font-bold">Run Man Portal</span>
                  </div>
                  <button onClick={onSignOut} className="text-xs text-gray-400 hover:text-white">Sign Out</button>
              </div>
          </nav>
      );
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        
        {/* Mobile Menu Button */}
        <button className="lg:hidden text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
           {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo (Mobile Only) */}
        <div className="lg:hidden flex items-center gap-2" onClick={() => onNavigate('home')}>
             <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
               <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#007f8b" />
                      <stop offset="100%" stopColor="#1e3f8a" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="48" fill="url(#eyeGradient)" />
                  <path d="M10 50 Q 50 10 90 50" fill="none" stroke="#f4e4bc" strokeWidth="8" strokeLinecap="round" />
                  <path d="M10 50 Q 50 90 90 50" fill="none" stroke="#ff7f50" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="20" fill="#1e3f8a" stroke="white" strokeWidth="2" />
                  <circle cx="56" cy="44" r="6" fill="white" />
               </svg>
             </div>
             <span className="font-serif font-bold text-gray-900">Sneak Peek</span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button 
                onClick={() => onNavigate('home')} 
                className={`hover:text-belize-teal transition-colors ${currentView === 'home' ? 'text-belize-teal font-bold' : ''}`}
            >
                Home
            </button>
            <button 
                onClick={() => onNavigate('shop')} 
                className={`hover:text-belize-teal transition-colors ${currentView === 'shop' ? 'text-belize-teal font-bold' : ''}`}
            >
                Shop
            </button>
            <button 
                onClick={() => onNavigate('artisans')} 
                className={`hover:text-belize-teal transition-colors flex items-center gap-1 ${currentView === 'artisans' || currentView === 'store_profile' ? 'text-belize-teal font-bold' : ''}`}
            >
                <Store size={16} /> Artisans
            </button>
            
            {/* Vendor Link */}
            {context.profile?.role === 'owner' && (
                <button 
                    onClick={() => onNavigate('vendor_dashboard')} 
                    className={`hover:text-belize-teal transition-colors flex items-center gap-1 ${currentView === 'vendor_dashboard' ? 'text-belize-teal font-bold' : ''}`}
                >
                    <LayoutDashboard size={16} /> My Dashboard
                </button>
            )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Wishlist Mobile/Desktop */}
          <button 
             onClick={() => onNavigate('wishlist')}
             className={`p-2 transition-colors ${currentView === 'wishlist' ? 'text-belize-coral fill-current' : 'text-gray-400 hover:text-belize-coral'}`}
          >
             <Heart size={20} className={currentView === 'wishlist' ? 'fill-current' : ''} />
          </button>

          {/* Cart */}
          <button 
             onClick={() => onNavigate('cart')}
             className={`relative p-2 transition-colors ${currentView === 'cart' ? 'text-belize-teal' : 'text-gray-400 hover:text-belize-teal'}`}
          >
             <ShoppingCart size={20} />
             {cartCount > 0 && (
               <span className="absolute top-0 right-0 bg-belize-coral text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                 {cartCount}
               </span>
             )}
          </button>

          {/* User Auth */}
          <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
          
          {context.profile ? (
             <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{context.profile.username}</span>
                {context.profile.role === 'owner' && <span className="text-[10px] bg-belize-teal text-white px-1.5 py-0.5 rounded-sm uppercase font-bold tracking-wider">Owner</span>}
                <button onClick={onSignOut} className="text-xs text-red-400 hover:text-red-500 font-medium ml-1">Sign Out</button>
             </div>
          ) : (
             <button 
               onClick={onSignIn}
               className="hidden sm:flex px-4 py-2 rounded-lg text-sm font-bold text-white bg-gray-900 hover:bg-belize-teal transition-colors"
             >
               Sign In
             </button>
          )}
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 lg:hidden">
            <button onClick={() => { onNavigate('home'); setIsMenuOpen(false); }} className="block w-full text-left px-2 py-2 font-medium text-gray-700 hover:bg-gray-50 rounded">Home</button>
            <button onClick={() => { onNavigate('shop'); setIsMenuOpen(false); }} className="block w-full text-left px-2 py-2 font-medium text-gray-700 hover:bg-gray-50 rounded">Shop</button>
            <button onClick={() => { onNavigate('artisans'); setIsMenuOpen(false); }} className="block w-full text-left px-2 py-2 font-medium text-gray-700 hover:bg-gray-50 rounded">Artisans</button>
            {context.profile?.role === 'owner' && (
                 <button onClick={() => { onNavigate('vendor_dashboard'); setIsMenuOpen(false); }} className="block w-full text-left px-2 py-2 font-bold text-belize-teal hover:bg-gray-50 rounded">My Dashboard</button>
            )}
            {!context.profile && (
               <button onClick={() => { onSignIn(); setIsMenuOpen(false); }} className="block w-full text-left px-2 py-2 font-bold text-belize-teal hover:bg-gray-50 rounded">Sign In</button>
            )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;