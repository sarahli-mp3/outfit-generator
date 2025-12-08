# 👋 Hi there  

I’m **Sarah** — [YouTube](https://www.youtube.com/@sarahliyt) | [Instagram](https://instagram.com/sarahli.mp3)

**Outfit98** is a nostalgic Windows 98–style outfit picker. Try it, remix it, and enjoy the retro vibes.  

---

## 🧠 What It Is  

A cozy Windows 98-inspired desktop app that lets you choose tops and bottoms, upload your own clothes, and see AI-generated outfit previews.

Features:
- You can customize outfits with a nano banana prompt that will generate an outfit for a particular occasion

---

## 🚀 Quick Start  

1. **Clone and install**
   ```bash
   git clone <your-fork-url> outfit98 && cd outfit98
   npm install

2. **Add your .env file**
```VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_API_KEY=your_google_api_key
```

3. **Run the app**
```npm run dev```
Your retro window should pop up! 
Note: a electron popup might show up and not work so you can just open it in the browser. 

---

## 🧺 Supabase Setup (For Uploading Clothes)

To upload your own tops and bottoms, set up Supabase in a few easy steps:

### Step 1: Create a Project

Go to https://supabase.com, sign in, and click New Project.
Copy your Project URL and Anon Key — you’ll use them in your .env file.

### Step 2: Enable Storage

In your Supabase dashboard, go to Storage → Create bucket.
Name it clothing-images and make sure it’s public.

### Step 3 — Create a Table

Go to SQL Editor → New Query and paste this:

```
create table if not exists clothing_items (
  id bigint generated always as identity primary key,
  name text,
  category text check (category in ('tops','bottoms')),
  image_url text not null,
  created_at timestamp with time zone default now()
);

alter table clothing_items enable row level security;

create policy "anon can read" on clothing_items
for select using (true);

create policy "anon can insert" on clothing_items
for insert with check (true);
```

Then click Run.

### Step 4: Upload Your Clothes

Open the app, click the folder icon, then choose Upload Tops or Upload Bottoms.
Your images will upload to Supabase and appear in the carousel automatically.

If items don’t show, double-check that your bucket is public and the table policies are correct.

---

### 🤖 AI Outfit Previews 

Outfit98 uses the Google Generative AI API to create realistic outfit previews.
This feature is required for the app to work properly.

Important:

You must have a Google Developer account and enable billing on your Google Cloud project.
The API is not free — you’ll be charged per request.

### Step 1: Get an API Key

Go to Google AI Studio.
Sign in with a Google Developer account.

### Step 2: Enable Billing

In your Google Cloud project, make sure billing is turned on.

### Step 3: Add Your Key

Copy your key into the .env file:
```
VITE_GOOGLE_API_KEY=your_google_api_key
```

### Step 4 — Restart the App

Once you restart, AI outfit previews will automatically generate as you browse tops and bottoms.

---

### 🧩 Built With

Electron · React · TypeScript · Vite · 98.css · Supabase · Google Gemini API

---

###  🎬 Watch the Build

Watch on YouTube

Follow for more cozy coding projects → @sarahli.mp3

