# Vercel Environment Variables Setup

## Option 1: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `vitals` repository
5. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `frontend`
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

6. Add Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app/api
NEXT_PUBLIC_SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZnd2dmF2aWtrYnJmZXJrbXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTg3NTQsImV4cCI6MjA4NzgzNDc1NH0._oPtxuM170uXZoEtQm99dXgeDRlMkMqPZ95POH9Daxs
```

7. Click "Deploy"

## Option 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd frontend
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: vitals
# - Directory: ./
# - Override settings? No
```

## After Vercel Deployment

1. Copy your Vercel URL (e.g., `https://vitals.vercel.app`)
2. Go back to Railway and add `FRONTEND_URL=https://vitals.vercel.app`
3. Redeploy Railway backend
