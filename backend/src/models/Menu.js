const { defaultClient } = require('../utils/supabase');

const menuItemsSeed = [
  {
    id: "s1",
    name: "Truffle Parmesan Fries",
    category: "starters",
    price: 9.00,
    description: "Crispy double-cooked hand-cut fries tossed in white truffle oil, freshly grated Parmesan, and rosemary, served with garlic aioli.",
    image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&q=80"
  },
  {
    id: "s2",
    name: "Crispy Salt & Pepper Calamari",
    category: "starters",
    price: 14.00,
    description: "Tender calamari rings, lightly dusted in seasoned flour, flash-fried and served with charred lemon and spicy gochujang mayo.",
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80"
  },
  {
    id: "s3",
    name: "Caprese Bruschetta",
    category: "starters",
    price: 11.00,
    description: "Toasted artisanal sourdough topped with vine-ripened cherry tomatoes, fresh buffalo mozzarella, basil chiffonade, and a sweet balsamic glaze.",
    image: "https://images.unsplash.com/photo-1572656631137-7935297eff55?w=400&q=80"
  },
  {
    id: "m1",
    name: "Pan-Seared Atlantic Salmon",
    category: "mains",
    price: 26.00,
    description: "Crispy-skin salmon fillet served over a bed of creamy saffron risotto, charred asparagus, and drizzled with lemon-herb butter sauce.",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80"
  },
  {
    id: "m2",
    name: "Signature Ribeye Steak",
    category: "mains",
    price: 34.00,
    description: "12oz USDA Prime Ribeye steak, dry-aged and grilled to perfection, served with garlic mashed potatoes, roasted broccolini, and red wine jus.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80"
  },
  {
    id: "m3",
    name: "Truffle Wild Mushroom Risotto",
    category: "mains",
    price: 22.00,
    description: "Creamy Arborio rice slowly simmered with porcini, shiitake, and oyster mushrooms, finished with white truffle oil and microgreens.",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80"
  },
  {
    id: "m4",
    name: "Classic Gourmet Wagyu Burger",
    category: "mains",
    price: 18.00,
    description: "Juicy Wagyu beef patty, sharp white cheddar, caramelized onions, butter lettuce, and truffle mayo on a toasted brioche bun. Served with fries.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80"
  },
  {
    id: "d1",
    name: "Warm Chocolate Lava Cake",
    category: "desserts",
    price: 10.00,
    description: "Rich dark chocolate cake with a molten liquid center, served with organic Madagascar vanilla bean gelato and fresh raspberries.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80"
  },
  {
    id: "d2",
    name: "Classic Espresso Tiramisu",
    category: "desserts",
    price: 9.00,
    description: "Layers of espresso-soaked ladyfingers and velvety mascarpone cream, lightly dusted with premium Dutch cocoa powder.",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80"
  },
  {
    id: "d3",
    name: "New York Style Berry Cheesecake",
    category: "desserts",
    price: 9.00,
    description: "Velvety smooth baked cream cheese filling on a buttery graham cracker crust, topped with a luscious wild berry compote.",
    image: "https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=400&q=80"
  },
  {
    id: "dr1",
    name: "Passion Fruit Mojito",
    category: "drinks",
    price: 8.00,
    description: "Muddled fresh mint, lime, and passion fruit pulp, shaken with white rum, simple syrup, and topped with club soda.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80"
  },
  {
    id: "dr2",
    name: "Smoked Rosemary Old Fashioned",
    category: "drinks",
    price: 12.00,
    description: "Premium bourbon whiskey, Angostura bitters, and orange peel, cold-smoked with hickory wood and garnished with a flame-singed rosemary sprig.",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80"
  },
  {
    id: "dr3",
    name: "Fresh Pressed Citrus Orange Juice",
    category: "drinks",
    price: 6.00,
    description: "100% organic cold-pressed oranges, served chilled over ice with a slice of fresh orange garnish.",
    image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80"
  }
];

class Menu {
  static async getAll(supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'SELECT_ALL'
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error querying Supabase menu:', err.message);
      throw err;
    }
  }

  static async getById(id, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'SELECT_BY_ID',
        query_id: id
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Error querying menu item ${id} from Supabase:`, err.message);
      throw err;
    }
  }

  static async create(itemData, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { restaurant_id, ...cleanData } = itemData;
      
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'INSERT',
        payload: cleanData
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating menu item in Supabase:', err.message);
      throw err;
    }
  }

  static async update(id, itemData, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { restaurant_id, ...cleanData } = itemData;

      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'UPDATE',
        query_id: id,
        payload: cleanData
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Error updating menu item ${id} in Supabase:`, err.message);
      throw err;
    }
  }

  static async delete(id, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'DELETE',
        query_id: id
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Error soft deleting menu item ${id} from Supabase:`, err.message);
      throw err;
    }
  }
}

module.exports = Menu;
module.exports.menuItemsSeed = menuItemsSeed;
