

import React, { useState } from 'react';
import { X, Mail, Lock, Loader2, ArrowRight, User, Store, Briefcase, Bike } from 'lucide-react';
import { registerUser } from '../services/supabaseService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password?: string, role?: 'customer' | 'owner' | 'run_man') => Promise<boolean>;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // Vendor specific
  const [storeName, setStoreName] = useState('');
  
  // Run Man specific
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<'customer' | 'owner' | 'run_man'>('customer');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Clean inputs
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    
    try {
        if (isSignUp) {
            // Register Logic
            if (role === 'owner' && !storeName) {
                throw new Error("Store Name is required for business accounts.");
            }
            if (role === 'run_man' && (!vehiclePlate || !phone)) {
                throw new Error("Vehicle Plate and Phone are required for Run Men.");
            }

            const runManDetails = role === 'run_man' ? {
                vehicleType,
                vehiclePlate,
                phone
            } : undefined;

            await registerUser(cleanEmail, cleanPassword, username, role, storeName, runManDetails);
            
            // Auto login after register
            const success = await onLogin(cleanEmail, cleanPassword, role);
            if (success) onClose();
            else setError("Registration successful but failed to log in automatically.");
        } else {
            // Login Logic
            const success = await onLogin(cleanEmail, cleanPassword, role);
            if (success) onClose();
            else setError("Invalid email or password.");
        }
    } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
    } finally {
        setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsSignUp(!isSignUp);
      setError(null);
  }

  const getRoleIcon = () => {
      if (role === 'owner') return <Store size={32} />;
      if (role === 'run_man') return <Bike size={32} />;
      return <Lock size={32} />;
  };

  const getRoleColor = (active: boolean) => {
    if (!active) return 'text-gray-500 hover:text-gray-700';
    if (role === 'owner') return 'bg-belize-teal text-white shadow-sm';
    if (role === 'run_man') return 'bg-orange-500 text-white shadow-sm';
    return 'bg-white text-gray-900 shadow-sm';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          {/* Role Toggles */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
                onClick={() => setRole('customer')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${role === 'customer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <User size={14} /> Shopper
            </button>
            <button 
                onClick={() => setRole('owner')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${role === 'owner' ? 'bg-belize-teal text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Briefcase size={14} /> Business
            </button>
            <button 
                onClick={() => setRole('run_man')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${role === 'run_man' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Bike size={14} /> Run Man
            </button>
          </div>

          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                role === 'owner' ? 'bg-belize-teal/10 text-belize-teal' : 
                role === 'run_man' ? 'bg-orange-100 text-orange-500' : 
                'bg-gray-100 text-gray-600'}`}>
                {getRoleIcon()}
            </div>
            <h2 className="text-2xl font-serif font-bold text-gray-900">
              {isSignUp 
                 ? (role === 'owner' ? 'Start Your Business' : role === 'run_man' ? 'Join the Fleet' : 'Join Sneak Peek')
                 : 'Welcome Back'
              }
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              {role === 'owner' 
                ? (isSignUp ? 'Launch your authentic Belizean store today.' : 'Manage your storefront and orders.')
                : role === 'run_man'
                ? (isSignUp ? 'Earn money delivering packages in your town.' : 'Access your delivery dashboard.')
                : (isSignUp ? 'Create an account to access premium features.' : 'Sign in to access your orders and wishlist.')
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{role === 'owner' ? 'Owner Name' : 'Full Name'}</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                        type="text" 
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-belize-teal/50 transition-all"
                        />
                    </div>
                  </div>

                  {role === 'owner' && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input 
                            type="text" 
                            required
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="My Authentic Shop"
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-belize-teal/50 transition-all"
                            />
                        </div>
                     </div>
                  )}

                  {role === 'run_man' && (
                     <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                            <select 
                                value={vehicleType}
                                onChange={(e) => setVehicleType(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            >
                                <option value="motorcycle">Motorcycle</option>
                                <option value="car">Car</option>
                                <option value="van">Van/Truck</option>
                                <option value="bicycle">Bicycle</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                                <input 
                                type="text" 
                                required
                                value={vehiclePlate}
                                onChange={(e) => setVehiclePlate(e.target.value)}
                                placeholder="C-1234"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input 
                                type="tel" 
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="600-1234"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>
                        </div>
                     </div>
                  )}
                </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-belize-teal/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-belize-teal/50 transition-all"
                />
              </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                    {error}
                </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                ${role === 'owner' ? 'bg-gray-900 hover:bg-gray-800 shadow-gray-900/20' : 
                  role === 'run_man' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' :
                  'bg-belize-teal hover:bg-belize-jungle shadow-belize-teal/20'}
              `}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isSignUp ? (role === 'owner' ? 'Launch Store' : role === 'run_man' ? 'Register as Driver' : 'Create Account') : 'Sign In'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isSignUp ? "Already have an account?" : "Don't have an account yet?"}
              <button 
                onClick={toggleMode}
                className={`ml-1 font-bold hover:underline ${role === 'run_man' ? 'text-orange-500' : 'text-belize-teal'}`}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer decoration */}
        <div className={`h-2 bg-gradient-to-r ${
            role === 'owner' ? 'from-gray-700 via-gray-800 to-black' : 
            role === 'run_man' ? 'from-orange-400 via-orange-500 to-red-500' :
            'from-belize-teal via-belize-blue to-belize-coral'}`} 
        />
      </div>
    </div>
  );
};

export default AuthModal;
