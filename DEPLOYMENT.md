# Vithos Deployment Guide

## Overview
- **Frontend**: Vercel (Next.js)
- **Backend**: Railway (Node.js/Express)
- **Database**: Supabase (already hosted)
- **Redis**: Redis Cloud (already hosted)

---

## Backend Deployment (Railway)

### 1. Prepare Repository
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect the configuration from `railway.json`

### 3. Configure Environment Variables

In Railway dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis
REDIS_HOST=redis-16050.crce276.ap-south-1-3.ec2.cloud.redislabs.com
REDIS_PORT=16050
REDIS_USERNAME=default
REDIS_PASSWORD=your_redis_password

# Mistral AI
MISTRAL_API_KEY=your_mistral_key

# Resend Email
RESEND_API_KEY=your_resend_key
FROM_EMAIL=onboarding@resend.dev

# Application
MAX_FILE_SIZE_MB=10
UPLOAD_RATE_LIMIT=10
API_RATE_LIMIT=100
```

### 4. Deploy

Railway will automatically:
- Install dependencies with `pnpm install`
- Build with `pnpm run build`
- Start with `pnpm run start`

### 5. Get Backend URL

After deployment, Railway will provide a URL like:
`https://your-app.railway.app`

Copy this URL - you'll need it for frontend configuration.

---

## Frontend Deployment (Vercel)

### 1. Update Frontend Environment

Create `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
NEXT_PUBLIC_SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your repository
4. Vercel will auto-detect Next.js
5. Set Root Directory to `frontend`
6. Add environment variables from step 1
7. Click "Deploy"

### 3. Configure Environment Variables in Vercel

In Vercel dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
NEXT_PUBLIC_SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Redeploy

After adding environment variables, trigger a new deployment:
- Vercel Dashboard → Deployments → Click "..." → Redeploy

---

## Post-Deployment Configuration

### 1. Update CORS in Backend

Add your Vercel domain to CORS whitelist in `src/server.ts`:

```typescript
const corsOptions = {
  origin: [
    'http://localhost:3001',
    'https://your-app.vercel.app',
  ],
  credentials: true,
};
```

Commit and push to trigger Railway redeploy.

### 2. Update Supabase Auth URLs

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs: Add `https://your-app.vercel.app/**`

### 3. Update Resend Domain (Optional)

For production emails:
1. Add your domain in Resend dashboard
2. Verify DNS records
3. Update `FROM_EMAIL` in Railway environment variables

---

## Monitoring & Logs

### Railway
- View logs: Railway Dashboard → Your Service → Logs
- Metrics: Railway Dashboard → Your Service → Metrics

### Vercel
- View logs: Vercel Dashboard → Your Project → Deployments → Click deployment → Logs
- Analytics: Vercel Dashboard → Your Project → Analytics

---

## Troubleshooting

### Backend Issues
```bash
# Check Railway logs
railway logs

# Check build logs
railway logs --build
```

### Frontend Issues
```bash
# Check Vercel logs in dashboard
# Or use CLI
vercel logs your-deployment-url
```

### Common Issues

1. **CORS errors**: Update CORS whitelist in backend
2. **API 404**: Check `NEXT_PUBLIC_API_URL` includes `/api`
3. **Auth errors**: Verify Supabase keys and URLs
4. **Redis connection**: Check Redis credentials and firewall rules
5. **Build failures**: Check Node version (requires >=20.0.0)

---

## Rollback

### Railway
Railway Dashboard → Deployments → Click previous deployment → Redeploy

### Vercel
Vercel Dashboard → Deployments → Click previous deployment → Promote to Production

---

## CI/CD (Automatic Deployments)

Both platforms auto-deploy on git push:

- **Railway**: Deploys on push to `main` branch
- **Vercel**: Deploys on push to any branch (production on `main`)

To disable auto-deploy:
- Railway: Settings → Disable auto-deploy
- Vercel: Settings → Git → Disable auto-deploy

---

## Cost Estimates

### Railway (Backend)
- Hobby Plan: $5/month (500 hours)
- Pro Plan: $20/month (unlimited)

### Vercel (Frontend)
- Hobby: Free (personal projects)
- Pro: $20/month (commercial)

### Supabase
- Free tier: 500MB database, 1GB file storage
- Pro: $25/month (8GB database, 100GB storage)

### Redis Cloud
- Free tier: 30MB
- Paid: Starting at $5/month

### Resend
- Free: 100 emails/day
- Paid: Starting at $20/month (50k emails)

---

## Security Checklist

- [ ] All environment variables set correctly
- [ ] Supabase RLS policies enabled
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Helmet security headers configured
- [ ] API keys rotated from development
- [ ] Redis password protected
- [ ] File upload size limits set
- [ ] Error messages don't expose sensitive info
- [ ] HTTPS enforced on all endpoints

---

## Next Steps

1. Set up custom domain (optional)
2. Configure monitoring/alerting
3. Set up backup strategy
4. Document API endpoints
5. Create staging environment
6. Set up error tracking (Sentry)
7. Configure CDN for static assets
8. Implement rate limiting per user
9. Add health check endpoints
10. Set up automated testing in CI/CD
