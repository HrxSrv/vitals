# Railway Environment Variables Setup

Copy these environment variables to Railway dashboard:

```
NODE_ENV=production
PORT=3000

# Supabase (copy from your .env)
SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZnd2dmF2aWtrYnJmZXJrbXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTg3NTQsImV4cCI6MjA4NzgzNDc1NH0._oPtxuM170uXZoEtQm99dXgeDRlMkMqPZ95POH9Daxs
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZnd2dmF2aWtrYnJmZXJrbXVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI1ODc1NCwiZXhwIjoyMDg3ODM0NzU0fQ.p81poXKnZIHAI77Cf_pfHbS6q4BQ2fvlOjMIklVrr_E

# Redis (copy from your .env)
REDIS_HOST=redis-16050.crce276.ap-south-1-3.ec2.cloud.redislabs.com
REDIS_PORT=16050
REDIS_USERNAME=default
REDIS_PASSWORD=yaUqRyPnqSGpFMhNVoItuRXp4tEnkjDf

# Mistral AI (copy from your .env)
MISTRAL_API_KEY=PnlRIMWPWipgwDj5mPbf0dbbXoRVdoh9

# Resend Email (copy from your .env)
RESEND_API_KEY=re_dup2xMFr_FAaxBqcwd81FvRrwCwv1tDxL
FROM_EMAIL=onboarding@resend.dev

# Application
MAX_FILE_SIZE_MB=10
UPLOAD_RATE_LIMIT=10
API_RATE_LIMIT=100

# Frontend URL (add this AFTER deploying frontend to Vercel)
FRONTEND_URL=https://your-app.vercel.app
```

## After Railway Deployment

1. Copy your Railway URL (e.g., `https://vithos-production.up.railway.app`)
2. You'll need this for the frontend deployment
