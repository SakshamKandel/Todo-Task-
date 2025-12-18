# TaskFlow Setup Guide

## Quick Start

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to initialize (~2 minutes)

### 2. Get Your API Keys
1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy the **Project URL** and **anon public** key

### 3. Configure Environment
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Create a new query
3. Paste the contents of `supabase-schema.sql`
4. Click **Run**

### 5. Create SuperAdmin Account
1. Go to **Authentication** → **Users** in Supabase
2. Click **Add User** → **Create new user**
3. Email: `admin@asinify.com`
4. Password: `Admin@12345`
5. Click **Create user**

### 6. Start the App
```bash
npm run dev
```

---

## User Roles

| Email | Role |
|-------|------|
| `admin@asinify.com` | **SuperAdmin** - full access |
| `*@asinify.com` | **Admin** - can manage users/teams |
| Other emails | **Normal** - personal tasks only |

---

## Features by Role

### SuperAdmin
- Create/manage all users (including admins)
- Create/manage all teams
- View all tasks
- Full system access

### Admin
- Create normal users
- Create/manage teams
- Assign tasks to team members
- View team tasks

### Normal User
- Create/manage personal tasks
- View assigned tasks
- Join teams (when invited)
