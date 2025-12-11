import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ujbggikahinwieexvyoe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqYmdnaWthaGlud2llZXh2eW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODkxNjgsImV4cCI6MjA3NTg2NTE2OH0.Wtj8hL7UBrGPp_rLn5SokUGehYpKjGwcEdkvP6P0S34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function queryDatabase() {
  try {
    // Let's try to fetch all tables first to see what's available
    console.log("Fetching all tables...");
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (tablesError) {
      console.error('Error fetching table names:', tablesError.message);
      return;
    }

    if (tables && tables.length > 0) {
      console.log("Tables in public schema:", tables.map(t => t.tablename).join(', '));

      // Let's try to fetch data from the 'user' table if it exists
      const userTableExists = tables.some(t => t.tablename === 'user');
      if (userTableExists) {
        console.log("\nFetching data from 'user' table...");
        const { data: users, error: userError } = await supabase
          .from('user')
          .select('*');

        if (userError) {
          console.error('Error fetching users:', userError.message);
        } else if (users && users.length > 0) {
          console.log("Data from 'user' table:", users);
        } else {
          console.log("No data found in 'user' table.");
        }
      } else {
        console.log("'user' table not found in public schema.");
      }

      // You can add more queries here for other tables like 'products', 'addresses', etc.
      // Example:
      // const productsTableExists = tables.some(t => t.tablename === 'products');
      // if (productsTableExists) {
      //   console.log("\nFetching data from 'products' table...");
      //   const { data: products, error: productsError } = await supabase
      //     .from('products')
      //     .select('*');
      //   if (productsError) {
      //     console.error('Error fetching products:', productsError.message);
      //   } else if (products && products.length > 0) {
      //     console.log("Data from 'products' table:", products);
      //   } else {
      //     console.log("No data found in 'products' table.");
      //   }
      // }
    } else {
      console.log("No tables found in public schema.");
    }

  } catch (error: any) {
    console.error('An unexpected error occurred:', error.message);
  }
}

queryDatabase();
