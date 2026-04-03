# Supabase Cloud Setup Guide

Complete guide for setting up your HealthTrack database on Supabase Cloud.

## Your Project

- **Project URL**: https://jpfwvvavikkbrferkmuc.supabase.co
- **Project Ref**: jpfwvvavikkbrferkmuc
- **Dashboard**: https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc

## Prerequisites

- Node.js 20+ installed
- Supabase CLI installed globally
- Database password from Supabase project

## Setup Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### 2. Link Your Project

```bash
pnpm db:link
```

You'll be prompted for:
- **Database password**: Enter the password you set when creating the project

This is a one-time setup that saves your project configuration locally.

### 3. Push Migrations

```bash
pnpm db:push
```

This applies all migrations to your cloud database:
- ✅ Creates 9 tables (users, profiles, reports, biomarkers, etc.)
- ✅ Enables pgvector extension for embeddings
- ✅ Sets up Row Level Security policies
- ✅ Creates performance indexes
- ✅ Seeds 60+ biomarker definitions

**Note**: This is safe to run multiple times - it only applies new migrations.

### 4. Generate TypeScript Types

```bash
pnpm db:types
```

This generates `src/types/database.types.ts` with type-safe interfaces for all tables.

**Regenerate types whenever you change the schema.**

### 5. Verify Setup

```bash
pnpm db:check
```

Expected output:
```
🔍 Checking database health...

✅ Database connected
✅ Tables exist
✅ Biomarker definitions loaded: 60
✅ All required tables present

✨ Database is ready!
```

If you see errors, check the [Troubleshooting](#troubleshooting) section.

## Daily Workflow

```bash
# Start development server
pnpm dev

# Check database health anytime
pnpm db:check

# After creating new migrations
pnpm db:push
pnpm db:types

# View migration status
pnpm db:status
```

## Accessing Your Database

### Via Supabase Dashboard

**Table Editor** - View and edit data visually
https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc/editor

**SQL Editor** - Run custom SQL queries
https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc/sql

**Database Settings** - Connection strings and settings
https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc/settings/database

**API Settings** - View your API keys
https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc/settings/api

### Via SQL Editor

Run queries directly in the dashboard:

```sql
-- View all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Count biomarker definitions
SELECT COUNT(*) FROM biomarker_definitions;

-- View biomarkers by category
SELECT category, COUNT(*) 
FROM biomarker_definitions 
GROUP BY category;
```

### Via psql (Optional)

Get connection string from: Settings > Database > Connection string

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.jpfwvvavikkbrferkmuc.supabase.co:5432/postgres"
```

## Database Schema

### Tables Created

| Table | Purpose | Records |
|-------|---------|---------|
| `users` | User accounts (synced with Auth) | Dynamic |
| `profiles` | Health profiles (self + family) | Dynamic |
| `reports` | Uploaded PDF reports | Dynamic |
| `biomarkers` | Extracted health metrics | Dynamic |
| `biomarker_definitions` | Reference data | 60+ seeded |
| `user_health_markdown` | Living health summaries | Dynamic |
| `lhm_history` | LHM version history | Dynamic |
| `report_embeddings` | Vector embeddings for RAG | Dynamic |
| `notification_prefs` | Email preferences | Dynamic |

### Security Features

- **Row Level Security (RLS)** enabled on all user tables
- Users can only access their own data
- Service role (backend) bypasses RLS
- Cascade deletes maintain data integrity

### Performance Features

- Indexes on frequently queried columns
- Vector similarity search (IVFFlat index)
- Optimized for read-heavy workloads
- Connection pooling via Supabase client

## Creating New Migrations

When you need to modify the schema:

```bash
# Create a new migration file
supabase migration new add_new_feature

# Edit the generated file in supabase/migrations/
# Then push to cloud
pnpm db:push

# Regenerate types
pnpm db:types
```

## Troubleshooting

### "Failed to link project"

**Cause**: Incorrect project ref or database password

**Solution**:
```bash
# Make sure you're using the correct project ref
pnpm db:link

# Project ref is: jpfwvvavikkbrferkmuc
# Get password from Supabase dashboard
```

### "Migration failed"

**Cause**: Migration already applied or syntax error

**Solution**:
```bash
# Check migration status
pnpm db:status

# If already applied, you'll see them marked as "Applied"
# If syntax error, check the SQL in the migration file
```

### "Database connection failed"

**Cause**: Incorrect environment variables

**Solution**:
```bash
# Verify .env file
cat .env | grep SUPABASE

# Should show:
# SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
# SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Test connection
pnpm db:check
```

### "Types not generating"

**Cause**: Migrations not applied or CLI issue

**Solution**:
```bash
# Apply migrations first
pnpm db:push

# Then generate types
pnpm db:types

# If still fails, try with full command
supabase gen types typescript --project-id jpfwvvavikkbrferkmuc > src/types/database.types.ts
```

### "RLS policies blocking queries"

**Cause**: Using wrong Supabase client

**Solution**:
```typescript
// ✅ Backend operations - bypasses RLS
import { supabaseAdmin } from './services/supabase.service';
const { data } = await supabaseAdmin.from('profiles').select('*');

// ❌ User operations - respects RLS (only for user-specific queries)
import { createUserSupabaseClient } from './services/supabase.service';
const client = createUserSupabaseClient(userToken);
```

### "Port already in use" or Docker errors

**Not applicable** - You're using Supabase Cloud, no local Docker needed!

## Environment Variables

Your `.env` file should have:

```env
# Supabase Cloud Configuration
SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from: https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc/settings/api

## Best Practices

### 1. Always Use Migrations

Never modify schema directly in the dashboard. Always create migrations:

```bash
supabase migration new descriptive_name
```

### 2. Test Queries in SQL Editor First

Before writing code, test queries in the Supabase SQL Editor.

### 3. Use Service Role for Backend

Backend should always use `supabaseAdmin` to bypass RLS:

```typescript
import { supabaseAdmin } from './services/supabase.service';
```

### 4. Regenerate Types After Schema Changes

```bash
pnpm db:push
pnpm db:types
```

### 5. Check Migration Status Before Pushing

```bash
pnpm db:status
```

## Useful Commands Reference

```bash
# Link project (one-time)
pnpm db:link

# Push migrations to cloud
pnpm db:push

# Generate TypeScript types
pnpm db:types

# Check database health
pnpm db:check

# View migration status
pnpm db:status

# Start dev server
pnpm dev
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Next Steps

After completing setup:

1. ✅ Verify with `pnpm db:check`
2. 🚀 Start dev server with `pnpm dev`
3. 📝 Begin implementing features from `.kiro/specs/vithos-backend/tasks.md`
4. 🧪 Test API endpoints using the dashboard or Postman

## Support

If you encounter issues not covered here:

1. Check [Troubleshooting](#troubleshooting) section
2. Run `pnpm db:check` for diagnostics
3. Check Supabase dashboard for errors
4. Review migration files in `supabase/migrations/`
5. Consult Supabase documentation
