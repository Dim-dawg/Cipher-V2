
# Sneak Peek - Authentic Belizean E-Commerce

Sneak Peek is a premium, multi-vendor e-commerce platform dedicated to connecting global customers with authentic Belizean artisans. It features a local-first architecture, an integrated AI concierge (Cipher) powered by Google Gemini, and financial health integration via Dim Dawg.

![Sneak Peek Banner](https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=2560)

## 🚀 Key Features

### 🛍️ Artisan Marketplace
- **Multi-Vendor Support**: Browse distinct storefronts like *The Spice Shack*, *Cayo Craftsmen*, and *Island Vibes*.
- **Product Catalog**: Filter by category (Food, Home, Apparel) and artisan.
- **Cart & Checkout**: Fully functional shopping cart with quantity management and tax calculations.
- **Wishlist**: Save favorite items to a personalized wishlist.

### 🤖 "Cipher" AI Concierge
- **Powered by Google Gemini 2.5 Flash**: A context-aware assistant that knows the catalog, your order history, and your preferences.
- **Generative Images**: If a product image is missing, Cipher uses **Gemini Image Generation** to create a photorealistic visualization on the fly.
- **Financial Vibe Check**: Integrates with "Dim Dawg" (external financial dashboard) to advise users if they can afford a purchase based on their budget forecast.

### 💾 Local-First Architecture
- **In-Browser SQLite**: Uses `sql.js` (WASM) to run a real relational database entirely in the browser.
- **Persistence**: All data (users, orders, wishlist) is saved to `localStorage`, so your state is preserved across reloads without needing a backend server.
- **Mock Authentication**: Full Sign Up / Sign In flow running against the local SQLite database.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: SQLite (via `sql.js` WASM)
- **AI Models**: 
  - `gemini-2.5-flash` (Chat & Reasoning)
  - `gemini-2.5-flash-image` (Generative Product Visualization)
- **Icons**: Lucide React

---

## 📦 Setup & Installation

1. **Clone the Repository**
2. **Install Dependencies** (if using a package manager, otherwise dependencies are loaded via import maps/CDN in this demo environment).
3. **Environment Variables**:
   Ensure your Google Gemini API Key is available in `process.env.API_KEY`.

### Database Initialization
The application automatically initializes the SQLite database on first load. It seeds:
- 3 Artisan Storefronts
- 9 Authentic Belizean Products
- 1 Demo User (`demo@sneakpeek.com` / `password123`)

---

## 💰 Financial Integration (Dim Dawg)

Sneak Peek connects to the "Dim Dawg" financial analyzer to provide responsible shopping advice.

1. **Configure**: Click the **Settings Gear** icon in the Navbar.
2. **Enter Credentials**:
   - **Endpoint**: Your Google Apps Script Web App URL.
   - **API Key**: Your Dim Dawg API Key.
3. **Use**: Ask Cipher *"Can I afford this?"* while viewing a product.
   - Cipher will query your financial forecast securely and return a "SAFE" or "RISKY" verdict based on your projected balance.

---

## 📂 Project Structure

- `App.tsx`: Main controller handling Routing, State, and UI Layout.
- `services/db.ts`: SQLite engine wrapper, schema definitions, and seeding logic.
- `services/supabaseService.ts`: Data access layer (abstracts SQL queries).
- `services/geminiService.ts`: AI logic, tool definitions (searchProducts, checkAffordability), and image generation.
- `components/`: Reusable UI components (Navbar, ChatWidget, StoreProductCard, etc.).

---

**© 2024 Sneak Peek. Rooted in Tradition. Elevated for the World.**
