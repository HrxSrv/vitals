# Post-Deployment Checklist

## 1. Update Supabase Auth URLs

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Authentication → URL Configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: Add `https://your-app.vercel.app/**`

## 2. Update Railway FRONTEND_URL

1. Go to Railway dashboard
2. Select your project
3. Go to Variables
4. Add/Update: `FRONTEND_URL=https://your-app.vercel.app`
5. Redeploy

## 3. Test the Deployment

### Backend Health Check
```bash
curl https://your-railway-url.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### Frontend Test
1. Visit `https://your-app.vercel.app`
2. Try to sign up/login
3. Upload a test report
4. Check if trends work
5. Test chat functionality

## 4. Monitor Logs

### Railway Logs
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs
```

### Vercel Logs
- Go to Vercel Dashboard → Your Project → Deployments
- Click on latest deployment → Logs

## 5. Common Issues & Fixes

### CORS Errors
- Make sure `FRONTEND_URL` is set in Railway
- Check `src/server.ts` CORS configuration

### API 404 Errors
- Verify `NEXT_PUBLIC_API_URL` includes `/api` at the end
- Example: `https://your-app.railway.app/api`

### Auth Errors
- Check Supabase redirect URLs
- Verify Supabase keys in both Railway and Vercel

### Database Connection Issues
- Check Supabase service role key
- Verify network connectivity from Railway

### Redis Connection Issues
- Check Redis credentials
- Verify Redis Cloud allows connections from Railway IPs

## 6. Performance Optimization (Optional)

### Enable Vercel Analytics
1. Vercel Dashboard → Your Project → Analytics
2. Enable Web Analytics

### Set up Error Tracking
Consider adding Sentry:
```bash
npm install @sentry/nextjs @sentry/node
```

### Configure CDN Caching
Vercel automatically handles this for static assets

## 7. Security Checklist

- [ ] All API keys are in environment variables (not in code)
- [ ] CORS is configured for production domains only
- [ ] Supabase RLS policies are enabled
- [ ] Rate limiting is active
- [ ] HTTPS is enforced
- [ ] Error messages don't expose sensitive info

## 8. Backup Strategy

### Database Backups
- Supabase Pro plan includes automatic daily backups
- Free tier: Manual exports via Supabase dashboard

### Code Backups
- Already handled by GitHub

## 9. Monitoring Setup

### Set up Uptime Monitoring
Use services like:
- UptimeRobot (free)
- Pingdom
- Better Uptime

Monitor:
- `https://your-railway-url.railway.app/health`
- `https://your-app.vercel.app`

### Set up Alerts
- Railway: Settings → Notifications
- Vercel: Settings → Notifications

## 10. Documentation

Update your README.md with:
- Production URLs
- Deployment process
- Environment variables needed
- How to contribute

---

## Quick Reference

**Backend URL**: https://your-railway-url.railway.app
**Frontend URL**: https://your-app.vercel.app
**Supabase Dashboard**: https://supabase.com/dashboard
**Railway Dashboard**: https://railway.app/dashboard
**Vercel Dashboard**: https://vercel.com/dashboard
