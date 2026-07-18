# Walkthrough - Supabase Database Integration

We have successfully integrated your **Supabase database instance** into the backend API server. All mock arrays have been replaced with persistent PostgreSQL queries, utilizing resilient local failovers so the application never breaks.

---

## 🚀 Active Server Links
- **Vite React Dev Server (Port 3006)**: [http://localhost:3006](http://localhost:3006)
- **Customer Menu View**: [http://localhost:3006/customer?table=1](http://localhost:3006/customer?table=1)
- **Waiter/Sales Terminal**: [http://localhost:3006/waiter](http://localhost:3006/waiter)
- **Kitchen Display (KDS)**: [http://localhost:3006/kitchen](http://localhost:3006/kitchen)
- **Backend API Base**: [http://localhost:3005/api/](http://localhost:3005/api/)

---

## 🛠️ Supabase Tables Setup Action Required

Before the database can persist data, you must create the target tables inside your Supabase project.

### 📋 Steps to Create Tables
1. Open your **Supabase Dashboard** at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** tab in the left navigation sidebar.
3. Click **New Query**, paste the following SQL script, and click **Run**:

```sql
-- 1. Create Menu Table
create table if not exists menu (
  id text primary key,
  name text not null,
  description text,
  price numeric(10,2) not null,
  category text not null,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Orders Table
create table if not exists orders (
  id text primary key,
  "table" text not null,
  status text not null,
  timestamp timestamp with time zone not null,
  items jsonb not null,
  billing jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

4. Once these tables are created, they will automatically be cached and populated with pre-seeded mock records on the next API call!
