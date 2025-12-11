
import React, { useState } from 'react';
import { X, CreditCard, Banknote, Truck, MapPin, CheckCircle, Loader2, Info } from 'lucide-react';
import { PaymentMethod, User } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  total: number;
  user: User | null;
  onConfirmOrder: (address: string, paymentMethod: PaymentMethod) => Promise<void>;
}

const DISTRICTS = ["Belize", "Cayo", "Corozal", "Orange Walk", "Stann Creek", "Toledo", "San Pedro (Ambergris Caye)"];

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, subtotal, total, user, onConfirmOrder }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('Belize');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && (!address || !city)) return;
    setStep(prev => prev === 1 ? 2 : 3);
  };

  const handleBack = () => {
    setStep(prev => prev === 2 ? 1 : prev);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const fullAddress = `${address}, ${city}, ${district}`;
    await onConfirmOrder(fullAddress, paymentMethod);
    setLoading(false);
    setStep(3); // Success step
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {step !== 3 && (
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-serif font-bold text-gray-900 text-lg">Checkout</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200">
                    <X size={20} />
                </button>
            </div>
        )}

        {/* Step 1: Shipping */}
        {step === 1 && (
          <div className="p-6">
             {/* Progress */}
             <div className="flex items-center gap-2 mb-6 text-sm">
                <span className="font-bold text-belize-teal">1. Shipping</span>
                <div className="h-px bg-gray-200 w-8"></div>
                <span className="text-gray-400">2. Payment</span>
             </div>

             <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg flex gap-3 text-sm text-blue-800 mb-4">
                    <Info className="shrink-0 mt-0.5" size={16} />
                    <p>We ship nationwide via <strong>BPMS</strong>. For local city deliveries, we use trusted <strong>Run Man</strong> services.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-belize-teal/50 outline-none"
                        placeholder="e.g. 12 Albert Street"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Municipality</label>
                        <input 
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-belize-teal/50 outline-none"
                            placeholder="City / Town"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                        <select 
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-belize-teal/50 outline-none"
                        >
                            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>
             </div>

             <div className="mt-8 flex justify-end">
                <button 
                    onClick={handleNext}
                    disabled={!address || !city}
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-belize-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue to Payment
                </button>
             </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className="p-6">
             <div className="flex items-center gap-2 mb-6 text-sm">
                <span className="text-gray-500">1. Shipping</span>
                <div className="h-px bg-belize-teal w-8"></div>
                <span className="font-bold text-belize-teal">2. Payment</span>
             </div>

             <div className="mb-6">
                 <h4 className="font-bold text-gray-800 mb-3">Select Payment Method</h4>
                 <div className="space-y-3">
                     {/* COD */}
                     <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-belize-teal bg-belize-teal/5 ring-1 ring-belize-teal' : 'border-gray-200 hover:border-belize-teal/50'}`}>
                         <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                         <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                             <Truck size={20} />
                         </div>
                         <div className="flex-1">
                             <div className="font-bold text-gray-900">Cash on Delivery (COD)</div>
                             <div className="text-xs text-gray-500">Pay the Run Man or BPMS courier upon arrival.</div>
                         </div>
                         {paymentMethod === 'cod' && <CheckCircle size={20} className="text-belize-teal" />}
                     </label>

                     {/* Bank Transfer */}
                     <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'bank_transfer' ? 'border-belize-teal bg-belize-teal/5 ring-1 ring-belize-teal' : 'border-gray-200 hover:border-belize-teal/50'}`}>
                         <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} />
                         <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                             <Banknote size={20} />
                         </div>
                         <div className="flex-1">
                             <div className="font-bold text-gray-900">Direct Bank Transfer</div>
                             <div className="text-xs text-gray-500">Atlantic Bank / Belize Bank</div>
                         </div>
                         {paymentMethod === 'bank_transfer' && <CheckCircle size={20} className="text-belize-teal" />}
                     </label>

                     {/* Credit Card */}
                     <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-belize-teal bg-belize-teal/5 ring-1 ring-belize-teal' : 'border-gray-200 hover:border-belize-teal/50'}`}>
                         <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'credit_card'} onChange={() => setPaymentMethod('credit_card')} />
                         <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                             <CreditCard size={20} />
                         </div>
                         <div className="flex-1">
                             <div className="font-bold text-gray-900">Credit / Debit Card</div>
                             <div className="text-xs text-gray-500">Secure gateway (Heritage/Atlantic).</div>
                         </div>
                         {paymentMethod === 'credit_card' && <CheckCircle size={20} className="text-belize-teal" />}
                     </label>
                 </div>

                 {/* Contextual Info */}
                 <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
                     {paymentMethod === 'bank_transfer' && (
                         <div>
                             <p className="font-bold mb-1">Bank Details:</p>
                             <p>Belize Bank | Acc: 123-456-789 | Sneak Peek Ltd.</p>
                             <p className="text-xs mt-1 text-gray-400">Please include your Order ID in remarks.</p>
                         </div>
                     )}
                     {paymentMethod === 'credit_card' && (
                         <div className="flex flex-col gap-2">
                             <input placeholder="Card Number (Mock)" className="w-full p-2 border rounded bg-white text-sm" />
                             <div className="flex gap-2">
                                <input placeholder="MM/YY" className="w-1/2 p-2 border rounded bg-white text-sm" />
                                <input placeholder="CVC" className="w-1/2 p-2 border rounded bg-white text-sm" />
                             </div>
                         </div>
                     )}
                     {paymentMethod === 'cod' && (
                         <p>Ensure you have the exact amount of <strong>${total.toFixed(2)}</strong> ready upon delivery.</p>
                     )}
                 </div>
             </div>

             <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                <div className="text-right">
                    <span className="text-gray-500 text-sm">Total to Pay:</span>
                    <div className="text-xl font-bold text-gray-900">${total.toFixed(2)}</div>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleBack} className="text-gray-500 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg">Back</button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-belize-teal text-white px-6 py-3 rounded-xl font-bold hover:bg-belize-jungle transition-colors flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Processing...' : 'Place Order'}
                    </button>
                </div>
             </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
            <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Order Confirmed!</h2>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto">
                    Thank you for supporting local artisans. You will receive an email confirmation shortly.
                </p>
                <button 
                    onClick={onClose}
                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-belize-teal transition-colors"
                >
                    Continue Shopping
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
