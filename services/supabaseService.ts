

import { CustomerContext, Product, User, Order, Address, WishlistItem, Review, Storefront, VendorContext, CartItem, PaymentMethod, RunManProfile, Delivery, RunManContext } from '../types';
import { executeQuery, executeRun } from './db';

// --- SERVICE METHODS USING SQLITE ---

export const checkSupabaseConnection = async (): Promise<boolean> => {
  // DB init happens lazily, so we just assume "true" effectively
  return true;
};

export const connectToSupabase = (url: string, key: string): boolean => {
  return true;
};

// Real Login logic against SQLite DB
export const loginUser = async (email: string, password?: string, role: 'customer' | 'owner' | 'run_man' = 'customer'): Promise<User | null> => {
    // If no password provided (legacy/lazy auth), default to old behavior for safety or fail
    if (!password) {
       console.warn("Attempting login without password");
       return null;
    }

    // Normalized email for case-insensitive check
    const normalizedEmail = email.trim().toLowerCase();

    // Now filtering by role as well to allow same email for different account types
    // Using LOWER(email) for case-insensitive matching
    const users = await executeQuery(
        "SELECT * FROM users WHERE LOWER(email) = ? AND password = ? AND role = ?", 
        [normalizedEmail, password, role]
    );
    
    if (users.length > 0) {
        // Remove password from returned object for safety
        const user = users[0];
        delete user.password;
        return user as User;
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

    // Check if user exists WITH THIS SPECIFIC ROLE (Case Insensitive)
    const existing = await executeQuery(
        "SELECT id FROM users WHERE LOWER(email) = ? AND role = ?", 
        [normalizedEmail, role]
    );
    
    if (existing.length > 0) {
        throw new Error(`A ${role} account with this email already exists`);
    }

    // Insert new user
    await executeRun(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)", 
        [username, normalizedEmail, password, role]
    );
    
    // Fetch user to get ID - ensure we get the one with the correct role
    const newUsers = await executeQuery(
        "SELECT * FROM users WHERE LOWER(email) = ? AND role = ?", 
        [normalizedEmail, role]
    );
    const user = newUsers[0] as User;

    // If Owner, Create Storefront
    if (role === 'owner' && storeName) {
        const description = `Welcome to ${storeName}. We sell amazing products.`;
        const banner = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200";
        const logo = "https://placehold.co/200x200/007f8b/ffffff?text=Store";
        
        await executeRun(
            "INSERT INTO storefronts (name, description, banner_url, logo_url, location, owner_name, owner_id, founded_year, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [storeName, description, banner, logo, 'Belize', username, user.id, new Date().getFullYear(), 'New']
        );
    }
    
    // If Run Man, Create Profile
    if (role === 'run_man' && runManDetails) {
        await executeRun(
            "INSERT INTO run_man_profiles (user_id, vehicle_type, vehicle_plate, phone, status, current_lat, current_lng, is_online, wallet_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [user.id, runManDetails.vehicleType, runManDetails.vehiclePlate, runManDetails.phone, 'active', 17.498, -88.190, 1, 0.0] // Default Belize City Coords
        );
    }
    
    delete (user as any).password;
    return user;
};

export const fetchCustomerContext = async (userId: number | null): Promise<CustomerContext> => {
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

  // Run Queries
  const profileRes = await executeQuery("SELECT id, username, email, role FROM users WHERE id = ?", [userId]);
  const addrRes = await executeQuery("SELECT * FROM addresses WHERE user_id = ?", [userId]);
  const ordersRes = await executeQuery("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  const wishlistRes = await executeQuery("SELECT * FROM wishlist WHERE user_id = ?", [userId]);

  return {
    profile: (profileRes[0] as User) || null,
    addresses: addrRes as Address[],
    orders: ordersRes as Order[],
    recentItems: [],
    wishlist: wishlistRes as WishlistItem[],
    reviews: []
  };
};

export const fetchVendorContext = async (userId: number): Promise<VendorContext | null> => {
  const profileRes = await executeQuery("SELECT id, username, email, role FROM users WHERE id = ?", [userId]);
  if (profileRes.length === 0) return null;

  const storeRes = await executeQuery("SELECT * FROM storefronts WHERE owner_id = ?", [userId]);
  if (storeRes.length === 0) return null; // User is owner but has no store yet?

  const store = storeRes[0] as Storefront;
  const products = await executeQuery("SELECT * FROM products WHERE storefront_id = ?", [store.id]);
  
  // REAL SALES CALCULATION:
  const salesQuery = `
    SELECT oi.*, p.name as product_name, p.price, o.created_at
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE p.storefront_id = ?
    ORDER BY o.created_at DESC
  `;
  const salesItems = await executeQuery(salesQuery, [store.id]);
  const totalSales = salesItems.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0);

  // Fetch unique related orders
  const uniqueOrderIds = [...new Set(salesItems.map(item => item.order_id))];
  let relatedOrders: any[] = [];
  let deliveries: any[] = [];
  
  if (uniqueOrderIds.length > 0) {
      const placeholders = uniqueOrderIds.map(() => '?').join(',');
      relatedOrders = await executeQuery(`SELECT * FROM orders WHERE id IN (${placeholders}) ORDER BY created_at DESC`, uniqueOrderIds);
      
      // Fetch deliveries related to these orders
      deliveries = await executeQuery(`SELECT * FROM deliveries WHERE order_id IN (${placeholders})`, uniqueOrderIds);
  }

  return {
    profile: profileRes[0] as User,
    store: store,
    products: products as Product[],
    orders: relatedOrders as Order[],
    totalSales: totalSales,
    deliveries: deliveries as Delivery[]
  };
};

// --- RUN MAN CONTEXT ---

export const fetchRunManContext = async (userId: number): Promise<RunManContext | null> => {
    const profileRes = await executeQuery("SELECT id, username, email, role FROM users WHERE id = ?", [userId]);
    if (profileRes.length === 0) return null;

    const runManRes = await executeQuery("SELECT * FROM run_man_profiles WHERE user_id = ?", [userId]);
    if (runManRes.length === 0) return null;

    const runManProfile = runManRes[0] as RunManProfile;

    // Get Active Delivery (assigned or picked_up)
    const activeDelRes = await executeQuery(`
        SELECT * FROM deliveries 
        WHERE run_man_id = ? AND status IN ('assigned', 'picked_up') 
        LIMIT 1
    `, [userId]);

    // Get Available Jobs (status = searching) - Only show if driver is online
    let availableRes: any[] = [];
    if (runManProfile.is_online) {
        availableRes = await executeQuery(`
            SELECT * FROM deliveries 
            WHERE status = 'searching'
            ORDER BY created_at DESC
        `);
    }

    // Get Completed Jobs
    const completedRes = await executeQuery(`
        SELECT * FROM deliveries 
        WHERE run_man_id = ? AND status = 'delivered'
        ORDER BY updated_at DESC
        LIMIT 20
    `, [userId]);

    return {
        profile: profileRes[0] as User,
        runManProfile: runManProfile,
        activeDelivery: activeDelRes[0] as Delivery || null,
        availableDeliveries: availableRes as Delivery[],
        completedDeliveries: completedRes as Delivery[]
    };
};

// --- LOGISTICS METHODS ---

export const requestDelivery = async (orderId: number, pickupLocation: string, dropoffLocation: string) => {
    const createdAt = new Date().toISOString();
    // Base earnings logic (e.g. flat rate $10 BZD for local run)
    const earnings = 10.00; 

    // Check if delivery already exists
    const existing = await executeQuery("SELECT id FROM deliveries WHERE order_id = ?", [orderId]);
    if (existing.length > 0) {
        return;
    }

    await executeRun(
        "INSERT INTO deliveries (order_id, status, pickup_location, dropoff_location, earnings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [orderId, 'searching', pickupLocation, dropoffLocation, earnings, createdAt, createdAt]
    );

    // Update order status to processing
    await executeRun("UPDATE orders SET status = 'processing' WHERE id = ?", [orderId]);
};

export const acceptDelivery = async (deliveryId: number, runManId: number) => {
    const updatedAt = new Date().toISOString();
    await executeRun(
        "UPDATE deliveries SET status = 'assigned', run_man_id = ?, updated_at = ? WHERE id = ?",
        [runManId, updatedAt, deliveryId]
    );
};

export const updateDeliveryStatus = async (deliveryId: number, status: 'picked_up' | 'delivered', proofOfDelivery?: string) => {
    const updatedAt = new Date().toISOString();
    
    await executeRun(
        "UPDATE deliveries SET status = ?, updated_at = ?, proof_of_delivery = ? WHERE id = ?",
        [status, updatedAt, proofOfDelivery || null, deliveryId]
    );

    // Sync status with the main Order table
    if (status === 'delivered') {
         // Get order details & earnings
         const dRes = await executeQuery("SELECT order_id, run_man_id, earnings FROM deliveries WHERE id = ?", [deliveryId]);
         if (dRes.length > 0) {
             const { order_id, run_man_id, earnings } = dRes[0];
             
             // Update Order Status
             await executeRun("UPDATE orders SET status = 'delivered' WHERE id = ?", [order_id]);

             // PAY THE DRIVER (Add to Wallet)
             if (run_man_id) {
                 await executeRun(
                     "UPDATE run_man_profiles SET wallet_balance = wallet_balance + ? WHERE user_id = ?",
                     [earnings, run_man_id]
                 );
             }
         }
    } else if (status === 'picked_up') {
         const dRes = await executeQuery("SELECT order_id FROM deliveries WHERE id = ?", [deliveryId]);
         if (dRes.length > 0) {
             const orderId = dRes[0].order_id;
             await executeRun("UPDATE orders SET status = 'shipped' WHERE id = ?", [orderId]);
         }
    }
};

export const toggleRunManStatus = async (userId: number, isOnline: boolean) => {
    await executeRun(
        "UPDATE run_man_profiles SET is_online = ? WHERE user_id = ?",
        [isOnline ? 1 : 0, userId]
    );
};

export const withdrawEarnings = async (userId: number) => {
    // Reset wallet to 0
    await executeRun(
        "UPDATE run_man_profiles SET wallet_balance = 0 WHERE user_id = ?",
        [userId]
    );
};

export const getAllProducts = async (): Promise<Product[]> => {
    // JOIN with storefronts to get the artisan name
    const sql = `
        SELECT p.*, s.name as store_name 
        FROM products p
        LEFT JOIN storefronts s ON p.storefront_id = s.id
    `;
    const rows = await executeQuery(sql);
    return rows as Product[];
}

export const addProduct = async (storeId: number, name: string, description: string, price: number, category: string): Promise<Product> => {
    await executeRun(
        "INSERT INTO products (storefront_id, name, description, price, category, image_url, stock_status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [storeId, name, description, price, category, '', 'in_stock']
    );
    
    // Fetch back the last inserted
    const res = await executeQuery("SELECT * FROM products WHERE storefront_id = ? AND name = ? ORDER BY id DESC LIMIT 1", [storeId, name]);
    return res[0] as Product;
};

export const deleteProduct = async (productId: number) => {
    await executeRun("DELETE FROM products WHERE id = ?", [productId]);
};

// --- CHECKOUT & ORDER LOGIC ---

export const createOrder = async (
    userId: number, 
    cart: CartItem[], 
    total: number, 
    paymentMethod: PaymentMethod, 
    shippingAddress: string
): Promise<Order> => {
    
    const createdAt = new Date().toISOString();
    
    // 1. Insert Order
    await executeRun(
        "INSERT INTO orders (user_id, total_amount, status, payment_method, shipping_address, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, total, 'pending', paymentMethod, shippingAddress, createdAt]
    );

    // 2. Get the new Order ID (Assuming single user concurrency for local DB, sorting by created desc is safe enough)
    const orderRes = await executeQuery("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1", [userId]);
    const order = orderRes[0] as Order;

    // 3. Insert Order Items
    for (const item of cart) {
        await executeRun(
            "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)",
            [order.id, item.id, item.quantity, item.price]
        );
    }

    return order;
};


export const searchProducts = async (query: string, category?: string): Promise<Product[]> => {
    let sql = `
        SELECT p.*, s.name as store_name 
        FROM products p 
        LEFT JOIN storefronts s ON p.storefront_id = s.id
        WHERE (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.category) LIKE ?)
    `;
    const wildcard = `%${query.toLowerCase()}%`;
    const params = [wildcard, wildcard, wildcard];

    if (category) {
        sql += " AND LOWER(p.category) = ?";
        params.push(category.toLowerCase());
    }

    const rows = await executeQuery(sql, params);
    return rows as Product[];
};

// --- Storefront Methods ---

export const getAllStorefronts = async (): Promise<Storefront[]> => {
    const rows = await executeQuery("SELECT * FROM storefronts");
    return rows as Storefront[];
}

export const getStorefrontDetails = async (id: number): Promise<{ store: Storefront | null, products: Product[] }> => {
    const storeRes = await executeQuery("SELECT * FROM storefronts WHERE id = ?", [id]);
    if (storeRes.length === 0) {
        return { store: null, products: [] };
    }
    
    const productsRes = await executeQuery(`
        SELECT p.*, s.name as store_name 
        FROM products p
        LEFT JOIN storefronts s ON p.storefront_id = s.id
        WHERE p.storefront_id = ?
    `, [id]);

    return {
        store: storeRes[0] as Storefront,
        products: productsRes as Product[]
    };
}

export const createConversationSession = async (userId: number | null): Promise<string | null> => {
  return "session-" + Math.random().toString(36).substr(2, 9);
};

export const saveChatMessage = async (
  sessionId: string, 
  userId: number | null, 
  sender: 'user' | 'model', 
  content: string
) => {
  // Can expand to store chat history in SQLite 'messages' table if needed
};

// Helper to Toggle Wishlist in DB
export const updateWishlistInDb = async (userId: number, productId: number, remove: boolean) => {
    if (remove) {
        await executeRun("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId]);
    } else {
        const exists = await executeQuery("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId]);
        if (exists.length === 0) {
            await executeRun("INSERT INTO wishlist (user_id, product_id, added_at) VALUES (?, ?, ?)", [userId, productId, new Date().toISOString()]);
        }
    }
};
