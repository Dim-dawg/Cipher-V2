

import React, { useState, useEffect } from 'react';
import { fetchRunManContext, acceptDelivery, updateDeliveryStatus, toggleRunManStatus, withdrawEarnings } from '../services/supabaseService';
import { RunManContext, Delivery } from '../types';
import { Loader2, Bike, Navigation, CheckCircle, Package, RefreshCw, Power, DollarSign, Wallet, PenTool, ToggleLeft, ToggleRight } from 'lucide-react';

interface RunManDashboardProps {
  userId: number;
  onLogout: () => void;
}

const RunManDashboard: React.FC<RunManDashboardProps> = ({ userId, onLogout }) => {
  const [context, setContext] = useState<RunManContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'active' | 'wallet'>('available');
  const [refreshing, setRefreshing] = useState(false);
  const [signature, setSignature] = useState('');

  const loadData = async () => {
    const data = await fetchRunManContext(userId);
    setContext(data);
    
    // Auto-switch to active tab if there is an active job, unless we are on wallet
    if (data && data.activeDelivery && tab !== 'wallet') {
        setTab('active');
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    // Simple polling for new jobs every 15s
    const interval = setInterval(() => {
        loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleRefresh = () => {
      setRefreshing(true);
      loadData();
  };

  const handleAccept = async (id: number) => {
      setLoading(true);
      await acceptDelivery(id, userId);
      await loadData(); // Reload to update state
  };

  const handleUpdateStatus = async (id: number, status: 'picked_up' | 'delivered') => {
      if (status === 'delivered' && !signature) {
          alert("Please ask the customer to sign or enter their name.");
          return;
      }

      setLoading(true);
      await updateDeliveryStatus(id, status, signature);
      setSignature('');
      await loadData();
  };

  const handleToggleOnline = async () => {
      if (!context) return;
      const newStatus = !context.runManProfile.is_online;
      await toggleRunManStatus(userId, !!newStatus);
      await loadData();
  };

  const handleCashOut = async () => {
      if (confirm("Transfer earnings to your linked bank account?")) {
          setLoading(true);
          await withdrawEarnings(userId);
          await loadData();
          alert("Funds transferred successfully!");
      }
  };

  if (loading && !context) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          </div>
      );
  }

  if (!context) return null;

  const isOnline = !!context.runManProfile.is_online;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans pb-20">
      {/* Mobile Header */}
      <div className="bg-gray-800 p-4 shadow-lg sticky top-0 z-20 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${isOnline ? 'bg-orange-500 shadow-orange-500/20' : 'bg-gray-600'}`}>
                  <Bike size={20} />
              </div>
              <div>
                  <h1 className="font-bold text-lg leading-none">Run Man</h1>
                  <div 
                    onClick={handleToggleOnline}
                    className="flex items-center gap-1 cursor-pointer mt-1"
                  >
                      {isOnline ? <ToggleRight className="text-green-400" size={20} /> : <ToggleLeft className="text-gray-500" size={20} />}
                      <span className={`text-xs font-bold ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                      </span>
                  </div>
              </div>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-400 hover:text-white">
              <Power size={20} />
          </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 p-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase">Wallet</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                  ${context.runManProfile.wallet_balance.toFixed(2)}
              </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase">Completed Jobs</p>
              <p className="text-2xl font-bold text-white mt-1">{context.completedDeliveries.length}</p>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 mb-4 gap-2">
          <button 
            onClick={() => setTab('available')}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${tab === 'available' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
              Jobs
          </button>
          <button 
             onClick={() => setTab('active')}
             className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors relative ${tab === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
              Active
              {context.activeDelivery && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              )}
          </button>
          <button 
             onClick={() => setTab('wallet')}
             className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${tab === 'wallet' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
              Wallet
          </button>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4">
          
          {tab === 'available' && (
              <>
                {!isOnline && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-center mb-4">
                        <p className="text-red-400 text-sm font-bold">You are currently Offline.</p>
                        <p className="text-xs text-red-300">Go Online to receive new delivery requests.</p>
                    </div>
                )}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Nearby Requests</h3>
                    <button onClick={handleRefresh} disabled={refreshing} className="text-orange-500 p-1">
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {context.availableDeliveries.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <p>{isOnline ? "No jobs in your area right now." : "You are offline."}</p>
                    </div>
                ) : (
                    context.availableDeliveries.map(del => (
                        <div key={del.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-1 rounded font-bold uppercase">New Request</span>
                                    <p className="text-2xl font-bold text-white mt-2">${del.earnings.toFixed(2)}</p>
                                </div>
                                <span className="text-xs text-gray-500">{new Date(del.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            
                            <div className="space-y-3 mb-6 relative">
                                <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gray-700"></div>
                                <div className="flex items-start gap-3 relative z-10">
                                    <div className="w-3 h-3 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                                    <div>
                                        <p className="text-xs text-gray-400">Pick Up</p>
                                        <p className="text-sm text-gray-200">{del.pickup_location}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 relative z-10">
                                    <div className="w-3 h-3 rounded-full bg-green-400 mt-1.5 shrink-0"></div>
                                    <div>
                                        <p className="text-xs text-gray-400">Drop Off</p>
                                        <p className="text-sm text-gray-200">{del.dropoff_location}</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleAccept(del.id)}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                Accept Job
                            </button>
                        </div>
                    ))
                )}
              </>
          )}

          {tab === 'active' && (
             <>
                {!context.activeDelivery ? (
                    <div className="text-center py-10 text-gray-500 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <p>You have no active deliveries.</p>
                        <button onClick={() => setTab('available')} className="text-orange-500 font-bold mt-2 hover:underline">Find a Job</button>
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-xl p-1 border border-orange-500/50 shadow-lg overflow-hidden">
                        {/* Map Placeholder */}
                        <div className="h-40 bg-gray-700 relative flex items-center justify-center">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/OpenStreetMap_Logo_2011.svg')] bg-cover bg-center grayscale"></div>
                            <p className="relative z-10 bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur-sm">Map Navigation View</p>
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-orange-400 font-bold text-lg">In Progress</span>
                                <span className="font-mono text-gray-400">ID: #{context.activeDelivery.id}</span>
                            </div>

                            <div className="space-y-6 mb-8">
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${context.activeDelivery.status === 'assigned' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-500'}`}>
                                            1
                                        </div>
                                        <div className="h-full w-0.5 bg-gray-700 my-1"></div>
                                    </div>
                                    <div className="pb-4">
                                        <h4 className="font-bold text-white">Pick Up</h4>
                                        <p className="text-gray-400 text-sm mb-2">{context.activeDelivery.pickup_location}</p>
                                        {context.activeDelivery.status === 'assigned' && (
                                            <button 
                                                onClick={() => context.activeDelivery && handleUpdateStatus(context.activeDelivery.id, 'picked_up')}
                                                className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded flex items-center gap-2 transition-colors"
                                            >
                                                <Package size={14} /> Confirm Pick Up
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${context.activeDelivery.status === 'picked_up' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-500'}`}>
                                            2
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">Drop Off</h4>
                                        <p className="text-gray-400 text-sm mb-2">{context.activeDelivery.dropoff_location}</p>
                                        
                                        {context.activeDelivery.status === 'picked_up' && (
                                            <div className="mt-4 bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                                                <label className="block text-xs font-bold text-gray-300 mb-2">PROOF OF DELIVERY</label>
                                                <div className="flex items-center gap-2 bg-gray-800 rounded-lg border border-gray-600 px-3 py-2 mb-3">
                                                    <PenTool size={16} className="text-gray-400" />
                                                    <input 
                                                        type="text" 
                                                        value={signature}
                                                        onChange={(e) => setSignature(e.target.value)}
                                                        placeholder="Customer Signature / Name"
                                                        className="bg-transparent border-none outline-none text-white text-sm w-full"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => context.activeDelivery && handleUpdateStatus(context.activeDelivery.id, 'delivered')}
                                                    disabled={!signature}
                                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 w-full"
                                                >
                                                    <CheckCircle size={18} /> Complete Delivery
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(context.activeDelivery.status === 'assigned' ? context.activeDelivery.pickup_location : context.activeDelivery.dropoff_location)}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-full border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Navigation size={18} /> Open in Maps
                            </a>
                        </div>
                    </div>
                )}
             </>
          )}

          {tab === 'wallet' && (
             <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-2xl shadow-xl">
                    <h2 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Current Balance</h2>
                    <div className="flex items-center gap-1 text-4xl font-bold text-green-400 mb-6">
                        <span>$</span>
                        <span>{context.runManProfile.wallet_balance.toFixed(2)}</span>
                        <span className="text-sm text-gray-500 font-normal mt-3 ml-2">BZD</span>
                    </div>

                    <button 
                        onClick={handleCashOut}
                        disabled={context.runManProfile.wallet_balance <= 0}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:bg-gray-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
                    >
                        <Wallet size={20} /> Cash Out
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-3">Transfers typically arrive within 24 hours.</p>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 font-bold">Earnings History</div>
                    <div className="divide-y divide-gray-700">
                        {context.completedDeliveries.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">No completed jobs yet.</div>
                        ) : (
                            context.completedDeliveries.map(del => (
                                <div key={del.id} className="p-4 flex justify-between items-center hover:bg-gray-700/50 transition-colors">
                                    <div>
                                        <div className="font-bold text-white text-sm">Delivery #{del.id}</div>
                                        <div className="text-xs text-gray-500">{new Date(del.updated_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-green-400 font-bold">+${del.earnings.toFixed(2)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
             </div>
          )}
      </div>
    </div>
  );
};

export default RunManDashboard;