# Quick Start Guide - Supabase Cloud

## Setup (One-time)

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link Your Project

```bash
pnpm db:link
```

Enter your database password when prompted.

### 3. Push Migrations

```bash
pnpm db:push
```

This creates all tables, indexes, and seeds 60+ biomarker definitions.

### 4. Generate TypeScript Types

```bash
pnpm db:types
```

### 5. Verify Setup

```bash
pnpm db:check
```

Expected output:
```
✅ Database connected
✅ Tables exist
✅ Biomarker definitions loaded: 60
✅ All required tables present
```

### 6. Start Development

```bash
pnpm dev
```

Server runs on http://localhost:3000

## Daily Commands

```bash
# Start dev server
pnpm dev

# Check database health
pnpm db:check

# Push new migrations (after creating new ones)
pnpm db:push

# Regenerate types (after schema changes)
pnpm db:types

# View migration status
pnpm db:status
```

## Access Your Database

- **Dashboard**: https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc
- **Table Editor**: https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc/editor
- **SQL Editor**: https://supabase.com/dashboard/project/jpfwvvavikkbrferkmuc/sql

## Troubleshooting

**Connection failed?**
```bash
pnpm db:check
```

**Migrations failed?**
```bash
pnpm db:status  # Check what's applied
```

**Types not generating?**
```bash
pnpm db:push    # Apply migrations first
pnpm db:types   # Then generate types
```

## Next Steps

1. ✅ Complete setup (steps above)
2. 📖 Read `docs/supabase-cloud-setup.md` for details
3. 🚀 Start implementing features from `.kiro/specs/vithos-backend/tasks.md`

## Need Help?

- Detailed guide: `docs/supabase-cloud-setup.md`
- Migrations: `supabase/README.md`
- Supabase docs: https://supabase.com/docs
