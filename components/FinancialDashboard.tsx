
import React, { useState, useEffect } from 'react';
import { getFinancialSummary } from '../services/internalFinancialService';
import { FinancialSummary } from '../types';
import { Loader2, DollarSign, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';



const FinancialDashboard: React.FC = () => {
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const summary = await getFinancialSummary();
      setData(summary);
      setLoading(false);
    };
    loadData();
  }, [endpoint, apiKey]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-belize-teal animate-spin" />
      </div>
    );
  }



  // Connected State
  return (
    <div className="max-w-6xl mx-auto py-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 flex items-center gap-3">
               <span className="bg-belize-teal/10 p-2 rounded-lg text-belize-teal"><Wallet size={28} /></span>
               Financial Health
            </h1>
            <p className="text-gray-500 mt-2">Real-time overview from your Dim Dawg dashboard.</p>
         </div>
         <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border border-green-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            System Connected
         </div>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         {/* Balance Card */}
         <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <DollarSign size={80} />
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Total Balance</p>
            <h2 className="text-4xl font-bold mb-4">${data.currentBalance.toFixed(2)}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-300">
               <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-belize-teal h-full w-[75%]"></div>
               </div>
               <span>Healthy</span>
            </div>
         </div>

         {/* Income vs Expense */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-4">Monthly Cashflow</p>
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <TrendingUp size={20} />
                     </div>
                     <div>
                        <p className="text-xs text-gray-500">Income</p>
                        <p className="font-bold text-gray-900">${data.monthlyIncome.toFixed(2)}</p>
                     </div>
                  </div>
                  <ArrowUpRight className="text-green-500" size={16} />
               </div>
               <div className="w-full h-px bg-gray-100"></div>
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <TrendingDown size={20} />
                     </div>
                     <div>
                        <p className="text-xs text-gray-500">Expenses</p>
                        <p className="font-bold text-gray-900">${data.monthlyExpense.toFixed(2)}</p>
                     </div>
                  </div>
                  <ArrowDownRight className="text-red-500" size={16} />
               </div>
            </div>
         </div>

         {/* Safe to Spend */}
         <div className="bg-gradient-to-br from-belize-teal to-belize-jungle text-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-white/80 text-sm font-bold uppercase tracking-wider">Safe to Spend</p>
                  <p className="text-xs text-white/60">After bills & savings</p>
               </div>
               <ShieldCheck size={24} className="text-white/80" />
            </div>
            <h2 className="text-4xl font-bold mb-4">${data.safeToSpend.toFixed(2)}</h2>
            <p className="text-sm bg-white/20 p-2 rounded-lg inline-block backdrop-blur-sm">
               You can treat yourself today!
            </p>
         </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-lg">Recent Activity</h3>
            <button className="text-sm text-belize-teal font-bold hover:underline">View All</button>
         </div>
         <div className="divide-y divide-gray-100">
            {data.recentTransactions.map((tx) => (
               <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}
                     `}>
                        {tx.merchant.charAt(0)}
                     </div>
                     <div>
                        <p className="font-bold text-gray-900">{tx.merchant}</p>
                        <p className="text-xs text-gray-500">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                     {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
