import React from 'react';
import { ShoppingBag, MapPin, UserCircle, Package, Heart } from 'lucide-react';

interface SidebarProps {
  context: any; // Simplified context
  isConnected: boolean;
  onNavigate?: (view: 'home' | 'shop' | 'cart' | 'wishlist') => void;
}

const placeholderContext = {
    profile: { username: 'Guest User', email: 'guest@example.com' },
    addresses: [{ city: 'Belize', country: 'Belize' }],
    orders: [
        { id: 1, status: 'delivered', created_at: new Date().toISOString(), total_amount: 150.00 },
    ],
    wishlist: [1, 2],
};

const Sidebar: React.FC<SidebarProps> = ({ context, isConnected, onNavigate }) => {
  const displayContext = context.profile ? context : placeholderContext;

  return (
    <div className="hidden lg:flex flex-col w-80 h-full bg-belize-sand/30 border-r border-belize-teal/20 p-6 overflow-y-auto">
      <div className="mb-8 text-center cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>
        <h1 className="text-2xl font-bold text-belize-teal font-serif">Sneak Peek</h1>
        <h2 className="text-sm font-medium text-belize-coral uppercase tracking-widest mt-1">Premium</h2>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer Profile</h3>
        
        {displayContext.profile ? (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-belize-teal/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-belize-coral/20 text-belize-coral flex items-center justify-center">
                <UserCircle size={24} />
              </div>
              <div>
                <p className="font-bold text-gray-800">{displayContext.profile.username}</p>
                <p className="text-xs text-gray-500 truncate max-w-[150px]">{displayContext.profile.email}</p>
              </div>
            </div>

            {displayContext.addresses.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                <MapPin size={16} className="mt-0.5 text-belize-teal" />
                <span>{displayContext.addresses[0].city}, {displayContext.addresses[0].country}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package size={16} className="text-belize-teal" />
              <span>{displayContext.orders.length} Past Orders</span>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
            Guest User Mode
          </div>
        )}
      </div>

      <div className="mb-6">
         <div 
           onClick={() => onNavigate && onNavigate('wishlist')}
           className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-belize-coral/50 transition-colors group"
         >
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-belize-coral flex items-center justify-center group-hover:bg-belize-coral group-hover:text-white transition-colors">
                    <Heart size={20} />
                </div>
                <span className="font-medium text-gray-800">My Wishlist</span>
             </div>
             <span className="text-sm font-bold bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">
                {displayContext.wishlist.length}
             </span>
         </div>
      </div>

      {displayContext.orders.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {displayContext.orders.slice(0, 3).map((order: any) => (
              <div key={order.id} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-belize-teal">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-800">Order #{order.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  <span className="font-semibold text-gray-700">${order.total_amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6 border-t border-belize-teal/10 text-center">
        <div className="flex justify-center items-center gap-2 text-belize-teal font-medium mb-2">
            <ShoppingBag size={18} />
            <span>New Arrivals</span>
        </div>
        <p className="text-xs text-gray-600">
            Ask Cipher about our new premium collection!
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
