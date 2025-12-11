

import { CustomerContext, Product, User, Order, Address, WishlistItem, Review, Storefront, VendorContext, CartItem, PaymentMethod, RunManProfile, Delivery, RunManContext } from '../types';
import { supabase } from './supabaseClient';

// --- SERVICE METHODS USING SQLITE ---



// Real Login logic against SQLite DB
export const loginUser = async (email: string, password?: string): Promise<User | null> => {
    if (!password) {
       console.warn("Attempting login without password in Supabase Auth, which requires a password.");
       return null;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error("Supabase login error:", error.message);
        throw new Error(error.message);
    }

    if (data.user) {
        const { data: profile, error: profileError } = await supabase
            .from('user')
            .select('id, username, email, role')
            .eq('email', data.user.email)
            .single();

        if (profileError) {
            console.error("Supabase profile fetch error:", profileError.message);
            return {
                id: data.user.id, // Supabase UUID
                username: data.user.email?.split('@')[0] || '',
                email: data.user.email || '',
                role: 'customer', // Default role if profile not found
            };
        }
        
        return profile as User;
    }
    
    return null;
};

// Registration Logic
export const registerUser = async (
    email: string, 
    password: string, 
    username: string, 
    role: 'customer' | 'owner' | 'run_man' = 'customer', 
    storeName?: string,
    runManDetails?: { vehicleType: string, vehiclePlate: string, phone: string }
): Promise<User | null> => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Supabase Auth Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
            data: {
                username: username,
                role: role
            }
        }
    });

    if (authError) {
        console.error("Supabase sign up error:", authError.message);
        throw new Error(authError.message);
    }

    if (!authData.user) {
        throw new Error("User data not returned after sign up.");
    }

    const newUserAuthId = authData.user.id;

    // 2. Insert into public.user table
    const { data: profile, error: profileError } = await supabase
        .from('user')
        .insert({ 
            id: newUserAuthId,
            username: username, 
            email: normalizedEmail,
            role: role,
            password_hash: 'SUPABASE_MANAGED'
        })
        .select('id, username, email, role')
        .single();

    if (profileError) {
        console.error("Supabase profile insert error:", profileError.message);
        throw new Error(profileError.message);
    }

    // 3. Handle role-specific inserts
    if (role === 'owner' && storeName) {
        const description = `Welcome to ${storeName}. We sell amazing products.`;
        const banner = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200";
        const logo = "https://placehold.co/200x200/007f8b/ffffff?text=Store";
        
        const { error: storeError } = await supabase
            .from('storefronts')
            .insert({ 
                name: storeName, 
                description: description, 
                banner_url: banner, 
                logo_url: logo, 
                location: 'Belize', 
                owner_name: username, 
                owner_id: newUserAuthId,
                founded_year: new Date().getFullYear(), 
                tags: 'New'
            });
        if (storeError) {
            console.error("Supabase storefront insert error:", storeError.message);
            throw new Error(storeError.message);
        }
    }
    
    if (role === 'run_man' && runManDetails) {
        const { error: runManError } = await supabase
            .from('run_man_profiles')
            .insert({
                user_id: newUserAuthId,
                vehicle_type: runManDetails.vehicleType,
                vehicle_plate: runManDetails.vehiclePlate,
                phone: runManDetails.phone,
                status: 'active',
                current_lat: 17.498,
                current_lng: -88.190,
                is_online: 1, 
                wallet_balance: 0.0
            });
        if (runManError) {
            console.error("Supabase Run Man profile insert error:", runManError.message);
            throw new Error(runManError.message);
        }
    }
    
    return profile as User;
};

export const fetchCustomerContext = async (userId: string | null): Promise<CustomerContext> => {
  if (!userId) {
    return {
      profile: null,
      addresses: [],
      orders: [],
      recentItems: [],
      wishlist: [],
      reviews: []
    };
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('user')
    .select('id, username, email, role')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error("Supabase fetch profile error:", profileError.message);
  }

  // Fetch addresses
  const { data: addresses, error: addrError } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId);

  if (addrError) {
    console.error("Supabase fetch addresses error:", addrError.message);
  }

  // Fetch orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error("Supabase fetch orders error:", ordersError.message);
  }

  // Fetch wishlist
  const { data: wishlist, error: wishlistError } = await supabase
    .from('wishlist')
    .select('*')
    .eq('user_id', userId);

  if (wishlistError) {
    console.error("Supabase fetch wishlist error:", wishlistError.message);
  }

  return {
    profile: (profile as User) || null,
    addresses: (addresses as Address[]) || [],
    orders: (orders as Order[]) || [],
    recentItems: [],
    wishlist: (wishlist as WishlistItem[]) || [],
    reviews: []
  };
};

export const fetchVendorContext = async (userId: string): Promise<VendorContext | null> => {
  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('user')
    .select('id, username, email, role')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error("Supabase fetch profile error for vendor:", profileError?.message);
    return null;
  }

  // Fetch store
  const { data: store, error: storeError } = await supabase
    .from('storefronts')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (storeError || !store) {
    console.error("Supabase fetch store error for vendor:", storeError?.message);
    return null; // User is owner but has no store yet?
  }

  // Fetch products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('storefront_id', store.id);

  if (productsError) {
    console.error("Supabase fetch products error for vendor:", productsError.message);
  }

  // Fetch sales items and calculate total sales
  // NOTE: Supabase RLS policies might be needed for this complex join/filter
  const { data: salesItems, error: salesError } = await supabase
    .from('order_items')
    .select(`
      *,
      products (name, price, storefront_id),
      orders (created_at)
    `)
    .eq('products.storefront_id', store.id) // Filter by storefront_id via products table
    .order('created_at', { ascending: false, foreignTable: 'orders' });


  let totalSales = 0;
  let uniqueOrderIds: number[] = []; // order_id is number in schema
  if (salesItems) {
      totalSales = salesItems.reduce((acc, item: any) => acc + (item.price_at_purchase * item.quantity), 0);
      uniqueOrderIds = [...new Set(salesItems.map((item: any) => item.order_id))];
  }

  // Fetch related orders
  let relatedOrders: Order[] = [];
  if (uniqueOrderIds.length > 0) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', uniqueOrderIds)
        .order('created_at', { ascending: false });
      if (ordersError) console.error("Supabase fetch related orders error:", ordersError.message);
      relatedOrders = orders || [];
  }

  // Fetch deliveries related to these orders
  let deliveries: Delivery[] = [];
  if (uniqueOrderIds.length > 0) {
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .in('order_id', uniqueOrderIds);
      if (deliveryError) console.error("Supabase fetch deliveries error:", deliveryError.message);
      deliveries = deliveryData || [];
  }

  return {
    profile: profile as User,
    store: store as Storefront,
    products: (products as Product[]) || [],
    orders: relatedOrders,
    totalSales: totalSales,
    deliveries: deliveries
  };
};

// --- RUN MAN CONTEXT ---

export const fetchRunManContext = async (userId: string): Promise<RunManContext | null> => {
    // Fetch profile
    const { data: profile, error: profileError } = await supabase
        .from('user')
        .select('id, username, email, role')
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
        console.error("Supabase fetch profile error for run man:", profileError?.message);
        return null;
    }

    // Fetch run man profile
    const { data: runManProfile, error: runManError } = await supabase
        .from('run_man_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (runManError || !runManProfile) {
        console.error("Supabase fetch run man profile error:", runManError?.message);
        return null;
    }

    // Get Active Delivery (assigned or picked_up)
    const { data: activeDelivery, error: activeDelError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('run_man_id', userId)
        .in('status', ['assigned', 'picked_up'])
        .limit(1)
        .single();

    if (activeDelError && activeDelError.code !== 'PGRST116') { // PGRST116 is 'no rows found'
        console.error("Supabase fetch active delivery error:", activeDelError.message);
    }

    // Get Available Jobs (status = searching) - Only show if driver is online
    let availableDeliveries: Delivery[] = [];
    if (runManProfile.is_online) {
        const { data: availableRes, error: availableError } = await supabase
            .from('deliveries')
            .select('*')
            .eq('status', 'searching')
            .order('created_at', { ascending: false });
        
        if (availableError) console.error("Supabase fetch available deliveries error:", availableError.message);
        availableDeliveries = availableRes || [];
    }

    // Get Completed Jobs
    const { data: completedDeliveries, error: completedError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('run_man_id', userId)
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false })
        .limit(20);

    if (completedError) console.error("Supabase fetch completed deliveries error:", completedError.message);

    return {
        profile: profile as User,
        runManProfile: runManProfile as RunManProfile,
        activeDelivery: (activeDelivery as Delivery) || null,
        availableDeliveries: availableDeliveries,
        completedDeliveries: (completedDeliveries as Delivery[]) || []
    };
};

// --- LOGISTICS METHODS ---

export const requestDelivery = async (orderId: number, pickupLocation: string, dropoffLocation: string) => {
    const earnings = 10.00; // Base earnings logic (e.g. flat rate $10 BZD for local run)

    // Check if delivery already exists
    const { data: existing, error: existingError } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', orderId);

    if (existingError) {
        console.error("Supabase check existing delivery error:", existingError.message);
        throw new Error(existingError.message);
    }
    if (existing && existing.length > 0) {
        return;
    }

    const { error: insertError } = await supabase
        .from('deliveries')
        .insert({
            order_id: orderId,
            status: 'searching',
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            earnings: earnings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (insertError) {
        console.error("Supabase insert delivery error:", insertError.message);
        throw new Error(insertError.message);
    }

    // Update order status to processing
    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', orderId);
    
    if (updateError) {
        console.error("Supabase update order status error:", updateError.message);
        throw new Error(updateError.message);
    }
};

export const acceptDelivery = async (deliveryId: number, runManId: string) => {
    const { error } = await supabase
        .from('deliveries')
        .update({ status: 'assigned', run_man_id: runManId, updated_at: new Date().toISOString() })
        .eq('id', deliveryId);
    
    if (error) {
        console.error("Supabase accept delivery error:", error.message);
        throw new Error(error.message);
    }
};

export const updateDeliveryStatus = async (deliveryId: number, status: 'picked_up' | 'delivered', proofOfDelivery?: string) => {
    const updatedAt = new Date().toISOString();
    
    const { error: updateDeliveryError } = await supabase
        .from('deliveries')
        .update({ status: status, updated_at: updatedAt, proof_of_delivery: proofOfDelivery || null })
        .eq('id', deliveryId);

    if (updateDeliveryError) {
        console.error("Supabase update delivery status error:", updateDeliveryError.message);
        throw new Error(updateDeliveryError.message);
    }

    // Sync status with the main Order table
    if (status === 'delivered') {
         // Get order details & earnings
         const { data: deliveryData, error: deliveryDataError } = await supabase
            .from('deliveries')
            .select('order_id, run_man_id, earnings')
            .eq('id', deliveryId)
            .single();

         if (deliveryDataError || !deliveryData) {
            console.error("Supabase fetch delivery data error:", deliveryDataError?.message);
            throw new Error(deliveryDataError?.message || "Delivery data not found.");
         }
             
         const { order_id, run_man_id, earnings } = deliveryData;
             
         // Update Order Status
         const { error: updateOrderError } = await supabase
            .from('orders')
            .update({ status: 'delivered' })
            .eq('id', order_id);
         if (updateOrderError) {
            console.error("Supabase update order status error (delivered):", updateOrderError.message);
            throw new Error(updateOrderError.message);
         }

         // PAY THE DRIVER (Add to Wallet)
         if (run_man_id) {
             const { error: updateWalletError } = await supabase
                .from('run_man_profiles')
                .update({ wallet_balance: (runManProfile: RunManProfile) => runManProfile.wallet_balance + earnings })
                .eq('user_id', run_man_id);
             if (updateWalletError) {
                console.error("Supabase update wallet error:", updateWalletError.message);
                throw new Error(updateWalletError.message);
             }
         }
    } else if (status === 'picked_up') {
         const { data: deliveryData, error: deliveryDataError } = await supabase
            .from('deliveries')
            .select('order_id')
            .eq('id', deliveryId)
            .single();

         if (deliveryDataError || !deliveryData) {
            console.error("Supabase fetch delivery data error:", deliveryDataError?.message);
            throw new Error(deliveryDataError?.message || "Delivery data not found.");
         }
         const orderId = deliveryData.order_id;
         const { error: updateOrderError } = await supabase
            .from('orders')
            .update({ status: 'shipped' })
            .eq('id', orderId);
         if (updateOrderError) {
            console.error("Supabase update order status error (shipped):", updateOrderError.message);
            throw new Error(updateOrderError.message);
         }
    }
};

export const toggleRunManStatus = async (userId: string, isOnline: boolean) => {
    const { error } = await supabase
        .from('run_man_profiles')
        .update({ is_online: isOnline ? 1 : 0 })
        .eq('user_id', userId);

    if (error) {
        console.error("Supabase toggle run man status error:", error.message);
        throw new Error(error.message);
    }
};

export const withdrawEarnings = async (userId: string) => {
    // Reset wallet to 0
    const { error } = await supabase
        .from('run_man_profiles')
        .update({ wallet_balance: 0 })
        .eq('user_id', userId);

    if (error) {
        console.error("Supabase withdraw earnings error:", error.message);
        throw new Error(error.message);
    }
};

export const getAllProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            storefronts (name)
        `);

    if (error) {
        console.error("Supabase get all products error:", error.message);
        throw new Error(error.message);
    }
    
    return data.map(p => ({
        ...p,
        store_name: (p as any).storefronts ? (p as any).storefronts.name : null
    })) as Product[];
};

export const addProduct = async (storeId: number, name: string, description: string, price: number, category: string): Promise<Product> => {
    const { data, error } = await supabase
        .from('products')
        .insert({
            storefront_id: storeId,
            name: name,
            description: description,
            price: price,
            category: category,
            image_url: '', // Default empty
            stock_status: 'in_stock' // Default
        })
        .select(`
            *,
            storefronts (name)
        `)
        .single();

    if (error) {
        console.error("Supabase add product error:", error.message);
        throw new Error(error.message);
    }
    
    return {
        ...data,
        store_name: (data as any).storefronts ? (data as any).storefronts.name : null
    } as Product;
};

export const deleteProduct = async (productId: number) => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

    if (error) {
        console.error("Supabase delete product error:", error.message);
        throw new Error(error.message);
    }
};

// --- CHECKOUT & ORDER LOGIC ---

export const createOrder = async (
    userId: string, 
    cart: CartItem[], 
    total: number, 
    paymentMethod: PaymentMethod, 
    shippingAddress: string
): Promise<Order> => {
    
    const createdAt = new Date().toISOString();
    
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            total_amount: total,
            status: 'pending',
            payment_method: paymentMethod,
            shipping_address: shippingAddress,
            created_at: createdAt
        })
        .select('*')
        .single();

    if (orderError || !orderData) {
        console.error("Supabase create order error:", orderError?.message);
        throw new Error(orderError?.message || "Failed to create order.");
    }

    // 2. Insert Order Items
    const orderItemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price
    }));

    const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

    if (orderItemsError) {
        console.error("Supabase insert order items error:", orderItemsError.message);
        throw new Error(orderItemsError.message);
    }

    return orderData as Order;
};


export const searchProducts = async (query: string, category?: string): Promise<Product[]> => {
    let queryBuilder = supabase
        .from('products')
        .select(`
            *,
            storefronts (name)
        `);

    const searchTerm = `%${query.toLowerCase()}%`;

    queryBuilder = queryBuilder.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`);

    if (category) {
        queryBuilder = queryBuilder.eq('category', category);
    }

    const { data, error } = await queryBuilder;

    if (error) {
        console.error("Supabase search products error:", error.message);
        throw new Error(error.message);
    }
    
    return (data || []).map(p => ({
        ...p,
        store_name: (p as any).storefronts ? (p as any).storefronts.name : null
    })) as Product[];
};

// --- Storefront Methods ---

export const getAllStorefronts = async (): Promise<Storefront[]> => {
    const { data, error } = await supabase
        .from('storefronts')
        .select('*');

    if (error) {
        console.error("Supabase get all storefronts error:", error.message);
        throw new Error(error.message);
    }
    
    return data as Storefront[];
};

export const getStorefrontDetails = async (id: number): Promise<{ store: Storefront | null, products: Product[] }> => {
    const { data: store, error: storeError } = await supabase
        .from('storefronts')
        .select('*')
        .eq('id', id)
        .single();

    if (storeError || !store) {
        console.error("Supabase get storefront details error:", storeError?.message);
        return { store: null, products: [] };
    }
    
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
            *,
            storefronts (name)
        `)
        .eq('storefront_id', id);

    if (productsError) {
        console.error("Supabase get storefront products error:", productsError.message);
    }

    return {
        store: store as Storefront,
        products: (products || []).map(p => ({
            ...p,
            store_name: (p as any).storefronts ? (p as any).storefronts.name : null
        })) as Product[]
    };
};

export const createConversationSession = async (userId: string | null): Promise<string | null> => {
    // Generate a unique session ID
    const newSessionId = "session-" + Math.random().toString(36).substr(2, 9);

    const { data, error } = await supabase
        .from('conversation_sessions')
        .insert({
            session_id: newSessionId,
            user_id: userId,
            start_time: new Date().toISOString(),
            total_messages: 0,
            last_active: new Date().toISOString()
        })
        .select('session_id')
        .single();

    if (error) {
        console.error("Supabase create conversation session error:", error.message);
        throw new Error(error.message);
    }
    
    return data?.session_id || null;
};

export const saveChatMessage = async (
  sessionId: string, 
  userId: string | null, 
  sender: 'user' | 'model', 
  content: string
) => {
    const { error } = await supabase
        .from('conversation_messages')
        .insert({
            session_id: sessionId,
            user_id: userId,
            sender: sender,
            message_content: content,
            timestamp: new Date().toISOString()
        });

    if (error) {
        console.error("Supabase save chat message error:", error.message);
        throw new Error(error.message);
    }

    // Optionally update conversation_sessions.total_messages and last_active
    const { error: updateSessionError } = await supabase
        .from('conversation_sessions')
        .update({
            total_messages: (cs: any) => cs.total_messages + 1,
            last_active: new Date().toISOString()
        })
        .eq('session_id', sessionId);
    
    if (updateSessionError) {
        console.error("Supabase update conversation session error:", updateSessionError.message);
        throw new Error(updateSessionError.message);
    }
};

// Helper to Toggle Wishlist in DB
export const updateWishlistInDb = async (userId: string, productId: number, remove: boolean) => {
    if (remove) {
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);
        
        if (error) {
            console.error("Supabase delete wishlist item error:", error.message);
            throw new Error(error.message);
        }
    } else {
        const { data: exists, error: existsError } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', userId)
            .eq('product_id', productId);
        
        if (existsError) {
            console.error("Supabase check wishlist item exists error:", existsError.message);
            throw new Error(existsError.message);
        }

        if (!exists || exists.length === 0) {
            const { error } = await supabase
                .from('wishlist')
                .insert({ user_id: userId, product_id: productId, added_at: new Date().toISOString() });
            
            if (error) {
                console.error("Supabase insert wishlist item error:", error.message);
                throw new Error(error.message);
            }
        }
    }
};
