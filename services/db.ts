

// --- SQLite Database Engine Wrapper ---
// Uses sql.js to run a SQLite database in the browser memory
// Persists data to localStorage

let db: any = null;
let initPromise: Promise<void> | null = null;

const DB_STORAGE_KEY = 'sneak_peek_sqlite_db_v12'; // Incremented for Wallet & POD Features

// Seed Storefronts (Artisans)
const SEED_STOREFRONTS = [
  { 
    id: 1, 
    name: "The Spice Shack", 
    description: "Authentic Belizean flavors, from fiery habaneros to rich roasted coffee. We work with small-scale farmers to bring the heat of the tropics to your table.", 
    banner_url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200", 
    logo_url: "https://images.unsplash.com/photo-1532336414038-5178525c568e?auto=format&fit=crop&q=80&w=200",
    location: "Dangriga, Stann Creek",
    owner_name: "Mama Lena",
    founded_year: 1998,
    tags: "Organic|Family Owned|Spicy"
  },
  { 
    id: 2, 
    name: "Cayo Craftsmen", 
    description: "Master woodworkers and stone carvers from the Cayo District. Our collective preserves ancient Mayan techniques in every piece of sustainable mahogany we carve.", 
    banner_url: "https://images.unsplash.com/photo-1605218427368-35b018b6e8a0?auto=format&fit=crop&q=80&w=1200", 
    logo_url: "https://images.unsplash.com/photo-1504198458649-3128b932f49e?auto=format&fit=crop&q=80&w=200",
    location: "San Ignacio, Cayo",
    owner_name: "The Cruz Brothers",
    founded_year: 2005,
    tags: "Sustainable|Handmade|Woodwork"
  },
  { 
    id: 3, 
    name: "Island Vibes", 
    description: "Laid-back apparel and music instruments inspired by the Caribbean coast. Capturing the spirit of 'Go Slow' in every stitch and beat.", 
    banner_url: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=1200", 
    logo_url: "https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&q=80&w=200",
    location: "Caye Caulker",
    owner_name: "Jamal & Sarah",
    founded_year: 2012,
    tags: "Apparel|Culture|Music"
  }
];

// Initial Seed Data (Authentic Belizean Items Only)
const SEED_PRODUCTS = [
  { id: 1, storefront_id: 1, name: "Marie Sharp's Fiery Hot Sauce", description: "The world-famous habanero pepper sauce made with fresh carrots and onions. A staple of Belizean cuisine.", price: 8.50, category: "Food & Snacks", image_url: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" },
  { id: 2, storefront_id: 2, name: "Hand-Carved Mahogany Bowl", description: "Sustainably sourced mahogany, hand-carved by artisans. Perfect for centerpieces or serving dry fruits.", price: 45.00, category: "Home & Living", image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" },
  { id: 3, storefront_id: 2, name: "Mayan Jipijapa Basket", description: "Intricate woven basket using traditional methods. Durable, beautiful, and functional.", price: 35.00, category: "Home & Living", image_url: "https://images.unsplash.com/photo-1622398925373-3f9101e27545?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" },
  { id: 4, storefront_id: 3, name: "Belikin Beer Glass Set", description: "Set of 4 collector glasses featuring the iconic Mayan temple logo.", price: 24.00, category: "Home & Living", image_url: "https://images.unsplash.com/photo-1554593645-568eb4b68424?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" },
  { id: 5, storefront_id: 3, name: "Garifuna Drum (Small)", description: "Authentic handmade drum representing the heartbeat of Garifuna culture. Great for decoration or light percussion.", price: 85.00, category: "Music", image_url: "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&q=80&w=1000", stock_status: "low_stock" },
  { id: 6, storefront_id: 1, name: "Premium Coffee Beans", description: "Locally grown coffee beans, roasted to perfection. Rich, bold flavor.", price: 18.00, category: "Food & Snacks", image_url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" },
  { id: 7, storefront_id: 3, name: "Tropical Print Shirt", description: "Lightweight, breathable shirt with vibrant tropical patterns.", price: 32.00, category: "Apparel", image_url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" },
  { id: 8, storefront_id: 2, name: "Coconut Oil Soap", description: "Handmade organic soap with pure coconut oil and lemongrass. Gentle on skin.", price: 12.00, category: "Home & Living", image_url: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" },
  { id: 9, storefront_id: 2, name: "Mayan Slate Carving", description: "Traditional Mayan relief carving on local slate stone. A piece of history.", price: 55.00, category: "Home & Living", image_url: "https://images.unsplash.com/photo-1599665608035-15d2639a5840?auto=format&fit=crop&q=80&w=1000", stock_status: "in_stock" }
];

const SEED_USER = { id: 1, username: "Demo User", email: "demo@sneakpeek.com", password: "password123", role: 'customer' };
// Vendor account linked to Store ID 1 (The Spice Shack)
const SEED_VENDOR = { id: 2, username: "Mama Lena", email: "vendor@sneakpeek.com", password: "password123", role: 'owner' };
// Run Man Account
const SEED_RUNMAN = { id: 3, username: "Jose The Runner", email: "runman@sneakpeek.com", password: "password123", role: 'run_man' };

const SEED_ADDRESS = { id: 1, user_id: 1, label: "Home", address_line: "123 Palm Ave", city: "Belize City", region: "Belize", country: "Belize", postal_code: "00000" };
const SEED_ORDER = { id: 1001, user_id: 1, total_amount: 53.50, status: "delivered", payment_method: "credit_card", shipping_address: "123 Palm Ave, Belize City", created_at: new Date(Date.now() - 86400000 * 5).toISOString() };
const SEED_AGENT = { id: 1, name: "Cipher", model: "gemini-2.5-flash", personality: "Friendly, Professional, Financial Aware", created_at: new Date().toISOString() };

export const initDB = async () => {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (typeof window.initSqlJs !== 'function') {
      throw new Error("SQL.js not loaded. Please check index.html");
    }

    const SQL = await window.initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    // Check LocalStorage for existing DB
    const savedDb = localStorage.getItem(DB_STORAGE_KEY);
    if (savedDb) {
      try {
        const binaryString = atob(savedDb);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        db = new SQL.Database(bytes);
        console.log("SQLite Database loaded from LocalStorage");
      } catch (e) {
        console.error("Failed to load saved DB, creating new one", e);
        db = new SQL.Database();
        seedDatabase();
      }
    } else {
      db = new SQL.Database();
      seedDatabase();
    }
  })();

  return initPromise;
};

const seedDatabase = () => {
  console.log("Seeding SQLite Database...");
  
  // Create Tables
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, email TEXT, password TEXT, role TEXT DEFAULT 'customer');`);
  db.run(`CREATE TABLE IF NOT EXISTS addresses (id INTEGER PRIMARY KEY, user_id INTEGER, label TEXT, address_line TEXT, city TEXT, region TEXT, country TEXT, postal_code TEXT);`);
  // Storefronts now includes owner_id
  db.run(`CREATE TABLE IF NOT EXISTS storefronts (id INTEGER PRIMARY KEY, name TEXT, description TEXT, banner_url TEXT, logo_url TEXT, location TEXT, owner_name TEXT, owner_id INTEGER, founded_year INTEGER, tags TEXT);`);
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, storefront_id INTEGER, name TEXT, description TEXT, price REAL, category TEXT, image_url TEXT, stock_status TEXT);`);
  
  // Update Order Schema
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER, total_amount REAL, status TEXT, payment_method TEXT, shipping_address TEXT, created_at TEXT);`);
  // Add Order Items
  db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, quantity INTEGER, price_at_purchase REAL);`);
  
  // Run Man Profiles (Updated v12)
  db.run(`CREATE TABLE IF NOT EXISTS run_man_profiles (user_id INTEGER PRIMARY KEY, vehicle_type TEXT, vehicle_plate TEXT, phone TEXT, status TEXT, is_online INTEGER DEFAULT 1, wallet_balance REAL DEFAULT 0, current_lat REAL, current_lng REAL);`);
  
  // Deliveries (Updated v12)
  db.run(`CREATE TABLE IF NOT EXISTS deliveries (id INTEGER PRIMARY KEY, order_id INTEGER, run_man_id INTEGER, status TEXT, pickup_location TEXT, dropoff_location TEXT, earnings REAL, proof_of_delivery TEXT, created_at TEXT, updated_at TEXT);`);

  db.run(`CREATE TABLE IF NOT EXISTS wishlist (id INTEGER PRIMARY KEY, user_id INTEGER, product_id INTEGER, added_at TEXT);`);
  db.run(`CREATE TABLE IF NOT EXISTS ai_agents (id INTEGER PRIMARY KEY, name TEXT, model TEXT, personality TEXT, created_at TEXT);`);
  
  // Insert Seed Data
  // Users
  const userStmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)");
  userStmt.run([SEED_USER.id, SEED_USER.username, SEED_USER.email, SEED_USER.password, SEED_USER.role]);
  userStmt.run([SEED_VENDOR.id, SEED_VENDOR.username, SEED_VENDOR.email, SEED_VENDOR.password, SEED_VENDOR.role]);
  userStmt.run([SEED_RUNMAN.id, SEED_RUNMAN.username, SEED_RUNMAN.email, SEED_RUNMAN.password, SEED_RUNMAN.role]);
  userStmt.free();

  // Run Man Profile
  const runManStmt = db.prepare("INSERT INTO run_man_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  runManStmt.run([SEED_RUNMAN.id, 'motorcycle', 'M-1234', '501-555-0199', 'active', 1, 45.00, 17.5046, -88.1962]);
  runManStmt.free();

  // Address
  const addrStmt = db.prepare("INSERT INTO addresses VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  addrStmt.run([SEED_ADDRESS.id, SEED_ADDRESS.user_id, SEED_ADDRESS.label, SEED_ADDRESS.address_line, SEED_ADDRESS.city, SEED_ADDRESS.region, SEED_ADDRESS.country, SEED_ADDRESS.postal_code]);
  addrStmt.free();

  // Storefronts - Link Spice Shack (ID 1) to Vendor (ID 2)
  const storeStmt = db.prepare("INSERT INTO storefronts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  SEED_STOREFRONTS.forEach(s => {
    const ownerId = s.id === 1 ? 2 : null; 
    storeStmt.run([s.id, s.name, s.description, s.banner_url, s.logo_url, s.location, s.owner_name, ownerId, s.founded_year, s.tags]);
  });
  storeStmt.free();

  // Products
  const prodStmt = db.prepare("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  SEED_PRODUCTS.forEach(p => {
    prodStmt.run([p.id, p.storefront_id, p.name, p.description, p.price, p.category, p.image_url, p.stock_status]);
  });
  prodStmt.free();

  // Orders
  const orderStmt = db.prepare("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?)");
  orderStmt.run([SEED_ORDER.id, SEED_ORDER.user_id, SEED_ORDER.total_amount, SEED_ORDER.status, SEED_ORDER.payment_method, SEED_ORDER.shipping_address, SEED_ORDER.created_at]);
  orderStmt.free();

  // AI Agent
  const agentStmt = db.prepare("INSERT INTO ai_agents VALUES (?, ?, ?, ?, ?)");
  agentStmt.run([SEED_AGENT.id, SEED_AGENT.name, SEED_AGENT.model, SEED_AGENT.personality, SEED_AGENT.created_at]);
  agentStmt.free();

  saveDB();
};

const saveDB = () => {
  if (!db) return;
  const data = db.export();
  let binary = '';
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i]);
  }
  try {
    localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
  } catch (e) {
    console.error("Failed to save DB to localStorage (probably quota exceeded)", e);
  }
};

// Generic Query Runner
export const executeQuery = async (sql: string, params: any[] = []): Promise<any[]> => {
  await initDB();
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    
    // Auto-save on modification queries
    if (sql.trim().toUpperCase().match(/^(INSERT|UPDATE|DELETE|REPLACE)/)) {
      saveDB();
    }
    
    return result;
  } catch (e) {
    console.error("SQL Error:", e, "Query:", sql);
    throw e;
  }
};

export const executeRun = async (sql: string, params: any[] = []) => {
  await initDB();
  db.run(sql, params);
  saveDB();
};