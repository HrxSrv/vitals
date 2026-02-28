# Testing Guide

## What's Implemented So Far

✅ **Task 1-4 Complete:**
- Project structure and infrastructure
- Database schema with Supabase
- Authentication middleware
- **Profile Management (Full CRUD)**

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file has:
   ```
   SUPABASE_URL=https://jpfwvvavikkbrferkmuc.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Database Migrations**: Run migrations to create tables:
   ```bash
   pnpm db:push
   ```

3. **Start Server**:
   ```bash
   pnpm run dev
   ```

## Testing Endpoints

### 1. Health Check (No Auth Required)

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Get Auth Session

First, you need a Supabase access token. You can get one by:
- Signing up/logging in through Supabase Auth UI
- Or using Supabase client in your frontend

```bash
curl http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

### 3. Profile Management

#### Create a Profile

```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "relationship": "self",
    "dob": "1990-01-15T00:00:00.000Z",
    "gender": "male"
  }'
```

**Expected Response:**
```json
{
  "profile": {
    "id": "uuid-here",
    "userId": "user-uuid",
    "name": "John Doe",
    "relationship": "self",
    "dob": "1990-01-15T00:00:00.000Z",
    "gender": "male",
    "isDefault": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Note:** The first profile is automatically set as default, and a skeleton LHM document is created.

#### List All Profiles

```bash
curl http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

#### Get Specific Profile

```bash
curl http://localhost:3000/api/profiles/PROFILE_ID \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

#### Update Profile

```bash
curl -X PATCH http://localhost:3000/api/profiles/PROFILE_ID \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith"
  }'
```

#### Set as Default Profile

```bash
curl -X PATCH http://localhost:3000/api/profiles/PROFILE_ID/default \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

#### Delete Profile

```bash
curl -X DELETE http://localhost:3000/api/profiles/PROFILE_ID \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

**Note:** You cannot delete your only profile. Create another one first.

## Testing with REST Client

If you use VS Code with the REST Client extension, you can use the `test-api.http` file:

1. Open `test-api.http`
2. Replace `YOUR_SUPABASE_TOKEN_HERE` with your actual token
3. Click "Send Request" above each request

## What Gets Created Automatically

When you create a profile, the system automatically:
1. ✅ Creates the profile record
2. ✅ Sets it as default if it's your first profile
3. ✅ Initializes a skeleton LHM (Living Health Markdown) document
4. ✅ Stores the LHM in the `user_health_markdown` table

## Validation Tests

### Test Invalid Data

**Missing required field:**
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "relationship": "self"
  }'
```

**Expected:** 400 error with validation details

**Invalid relationship:**
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "relationship": "invalid"
  }'
```

**Expected:** 400 error with validation details

### Test Authorization

**Access another user's profile:**
```bash
curl http://localhost:3000/api/profiles/SOMEONE_ELSES_PROFILE_ID \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

**Expected:** 403 Forbidden error

## Database Verification

You can verify the data in Supabase:

1. Go to Supabase Dashboard → Table Editor
2. Check these tables:
   - `profiles` - Your profile records
   - `user_health_markdown` - Skeleton LHM documents
   - `users` - User records synced from Supabase Auth

## Next Steps

After testing profiles, we can implement:
- **Task 5**: File upload and storage (PDF reports)
- **Task 6**: Background job queue
- **Task 7**: Mistral API integration
- **Task 8**: Biomarker extraction

Or we can continue testing by implementing a simple frontend to interact with the API!

## Troubleshooting

### Server won't start
- Check `.env` file has all required variables
- Verify Supabase URL and keys are correct
- Run `pnpm install` to ensure dependencies are installed

### 401 Unauthorized
- Your Supabase token may be expired
- Get a fresh token from Supabase Auth

### 500 Internal Server Error
- Check server logs for detailed error messages
- Verify database migrations were applied
- Check Supabase connection is working
