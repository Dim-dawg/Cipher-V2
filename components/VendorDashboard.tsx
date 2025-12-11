

import React, { useState, useEffect } from 'react';
import { fetchVendorContext, addProduct, deleteProduct, requestDelivery } from '../services/supabaseService';
import { VendorContext, Product, Order, Delivery } from '../types';
import { Plus, Trash2, Package, ShoppingBag, Store, LogOut, Loader2, Sparkles, ExternalLink, Truck, Bike, MapPin, CheckSquare } from 'lucide-react';

interface VendorDashboardProps {
  userId: number;
  onLogout: () => void;
  onPreviewStore: () => void;
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({ userId, onLogout, onPreviewStore }) => {
  const [context, setContext] = useState<VendorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Home & Living');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchVendorContext(userId);
    setContext(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context || !context.store) return;
    
    await addProduct(
        context.store.id, 
        newName, 
        newDesc, 
        parseFloat(newPrice), 
        newCategory
    );
    
    // Reset and reload
    setNewName('');
    setNewDesc('');
    setNewPrice('');
    setIsAdding(false);
    loadData();
  };

  const handleDelete = async (productId: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
        await deleteProduct(productId);
        loadData();
    }
  };

  const handleRequestRunMan = async (order: Order) => {
      if (!context?.store) return;
      if (confirm(`Request a Run Man for Order #${order.id}?`)) {
          // Pickup is Store Location, Dropoff is User Shipping Address
          await requestDelivery(order.id, context.store.location, order.shipping_address);
          loadData();
      }
  };

  const getDeliveryStatus = (orderId: number) => {
      if (!context?.deliveries) return null;
      return context.deliveries.find(d => d.order_id === orderId);
  };

  const renderDeliveryBadge = (delivery: Delivery) => {
      switch(delivery.status) {
          case 'searching': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full animate-pulse">Searching for Driver...</span>;
          case 'assigned': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">Driver Assigned</span>;
          case 'picked_up': return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">On The Way</span>;
          case 'delivered': return (
              <div className="flex flex-col gap-1">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold w-fit">Delivered</span>
                  {delivery.proof_of_delivery && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <CheckSquare size={10} /> Signed: {delivery.proof_of_delivery}
                      </span>
                  )}
              </div>
          );
      }
  };

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
          </div>
      );
  }

  if (!context) {
      return <div className="p-8 text-center">Store not found. Please contact support.</div>;
  }

  return (
    <div className="bg-gray-50 flex flex-col font-sans min-h-screen">
      {/* Internal Dashboard Header (Nav is above this now) */}
      <div className="bg-gray-900 text-white px-8 py-6 shadow-md">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Store size={24} />
                </div>
                <div>
                    <h1 className="font-bold text-2xl">{context.store.name}</h1>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Partner Portal</p>
                </div>
            </div>
            
            <div className="flex gap-3">
                 <button 
                   onClick={onPreviewStore}
                   className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                 >
                     <ExternalLink size={16} /> View Live Store
                 </button>
            </div>
         </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2 text-belize-teal">
                    <Package size={24} />
                    <h3 className="font-bold text-gray-900">Total Products</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">{context.products.length}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2 text-belize-coral">
                    <ShoppingBag size={24} />
                    <h3 className="font-bold text-gray-900">Total Sales</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">${context.totalSales.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Lifetime Revenue</p>
            </div>

            <div className="bg-gradient-to-br from-belize-teal to-belize-jungle p-6 rounded-2xl shadow-lg text-white">
                <h3 className="font-bold mb-2 flex items-center gap-2"><Sparkles size={18} /> AI Business Assistant</h3>
                <p className="text-sm opacity-90 mb-3">
                   Cipher is ready to help you write descriptions, analyze your catalog, or suggest new products.
                </p>
                <div className="text-xs bg-white/20 inline-block px-2 py-1 rounded">
                    Open chat below ↓
                </div>
            </div>
         </div>

         {/* --- ORDERS & LOGISTICS SECTION --- */}
         <div className="mb-10">
             <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Orders</h2>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                         <tr>
                             <th className="p-4">Order ID</th>
                             <th className="p-4">Date</th>
                             <th className="p-4">Customer</th>
                             <th className="p-4">Amount</th>
                             <th className="p-4">Logistics</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {context.orders.length === 0 ? (
                             <tr><td colSpan={5} className="p-8 text-center text-gray-500">No orders yet.</td></tr>
                         ) : (
                             context.orders.map(order => {
                                 const delivery = getDeliveryStatus(order.id);
                                 return (
                                     <tr key={order.id} className="hover:bg-gray-50">
                                         <td className="p-4 font-mono text-sm">#{order.id}</td>
                                         <td className="p-4 text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                                         <td className="p-4 text-sm">
                                             <div className="font-bold text-gray-900">User #{order.user_id}</div>
                                             <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> {order.shipping_address}</div>
                                         </td>
                                         <td className="p-4 font-bold text-gray-900">${order.total_amount.toFixed(2)}</td>
                                         <td className="p-4">
                                             {delivery ? (
                                                 <div className="flex flex-col gap-1 items-start">
                                                     {renderDeliveryBadge(delivery)}
                                                     {delivery.run_man_id && (
                                                         <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                             <Bike size={10} /> Run Man #{delivery.run_man_id}
                                                         </span>
                                                     )}
                                                 </div>
                                             ) : (
                                                 <button 
                                                    onClick={() => handleRequestRunMan(order)}
                                                    className="bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                                                 >
                                                     <Truck size={12} /> Request Run Man
                                                 </button>
                                             )}
                                         </td>
                                     </tr>
                                 );
                             })
                         )}
                     </tbody>
                 </table>
             </div>
         </div>

         <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
            <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
            >
                <Plus size={18} /> {isAdding ? 'Cancel' : 'Add Product'}
            </button>
         </div>

         {/* Add Product Form */}
         {isAdding && (
             <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 mb-8 animate-in slide-in-from-top-4">
                 <h3 className="font-bold text-gray-800 mb-4">Add New Item</h3>
                 <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                         <input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-belize-teal/20 outline-none" placeholder="e.g. Handmade Vase" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                         <input required type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-belize-teal/20 outline-none" placeholder="0.00" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                         <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-belize-teal/20 outline-none">
                             <option>Food & Snacks</option>
                             <option>Home & Living</option>
                             <option>Apparel</option>
                             <option>Music</option>
                             <option>Art</option>
                         </select>
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                         <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 h-20 focus:ring-2 focus:ring-belize-teal/20 outline-none" placeholder="Describe your authentic product..." />
                     </div>
                     <div className="md:col-span-2 flex justify-end">
                         <button type="submit" className="bg-belize-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-belize-jungle transition-colors">Save Product</button>
                     </div>
                 </form>
             </div>
         )}

         {/* Product List */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="w-full text-left border-collapse">
                 <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                     <tr>
                         <th className="p-4 font-semibold">Product</th>
                         <th className="p-4 font-semibold">Category</th>
                         <th className="p-4 font-semibold">Price</th>
                         <th className="p-4 font-semibold text-right">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {context.products.length === 0 ? (
                         <tr><td colSpan={4} className="p-8 text-center text-gray-500">No products found. Add your first item!</td></tr>
                     ) : (
                         context.products.map(p => (
                             <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="p-4">
                                     <div className="font-bold text-gray-900">{p.name}</div>
                                     <div className="text-xs text-gray-500 truncate max-w-xs">{p.description}</div>
                                 </td>
                                 <td className="p-4 text-sm text-gray-600">
                                     <span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">{p.category}</span>
                                 </td>
                                 <td className="p-4 font-medium text-gray-900">${p.price.toFixed(2)}</td>
                                 <td className="p-4 text-right">
                                     <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                         <Trash2 size={18} />
                                     </button>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </main>
    </div>
  );
};

export default VendorDashboard;