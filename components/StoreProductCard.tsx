
import React from 'react';
import { Plus, Heart, Store } from 'lucide-react';

interface StoreProductCardProps {
  product: any;
  onAddToCart: (product: any) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({ product, onAddToCart, isWishlisted, onToggleWishlist }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col group">
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {onToggleWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist();
            }}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
          >
            <Heart 
              size={16} 
              className={`transition-colors ${isWishlisted ? 'fill-belize-coral text-belize-coral' : 'text-gray-400'}`} 
            />
          </button>
        )}
        
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/600x800/f4f4f5/a1a1aa?text=No+Image';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.name}</h3>
            <span className="font-bold text-belize-teal">${product.price.toFixed(2)}</span>
        </div>
        
        {/* Vendor Attribution */}
        {product.store_name && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <Store size={12} />
                <span>Sold by {product.store_name}</span>
            </div>
        )}

        <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{product.description}</p>
        
        <button 
          onClick={() => onAddToCart(product)}
          className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-belize-teal transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add to Cart
        </button>
      </div>
    </div>
  );
};

export default StoreProductCard;
