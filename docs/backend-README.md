# HealthTrack MVP Backend

Personal health report tracking system that enables users to upload medical checkup PDFs, extract and store biomarker data, visualize health trends over time, and receive intelligent insights through AI-powered analysis.

## Features

- 🔐 Secure authentication via Supabase Auth
- 👨‍👩‍👧‍👦 Multi-profile management (track family members)
- 📄 PDF report upload and OCR processing
- 🧬 Biomarker extraction and normalization
- 📊 Health trend visualization
- 🤖 AI-powered Q&A system (RAG)
- 📧 Monthly email digests
- 📝 Living Health Markdown (LHM) documents

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript 5+
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Job Queue**: BullMQ + Redis
- **AI Services**: Mistral AI (OCR, Chat, Embeddings)
- **Email**: Resend
- **Validation**: Zod

## Project Structure

```
src/
├── controllers/       # HTTP request handlers (by feature)
├── services/         # Business logic layer
├── routes/           # Route definitions
├── middlewares/      # Express middleware
├── validations/      # Zod validation schemas
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── workers/          # Background job processors
├── constants/        # Constants and configurations
└── server.ts         # Application entry point

supabase/
└── migrations/       # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (via Supabase)
- Redis
- Supabase account
- Mistral AI API key
- Resend API key

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Supabase credentials
   - Redis URL
   - Mistral AI API key
   - Resend API key

### Development

Start the development server with hot reload:

```bash
pnpm dev
```

The server will start on `http://localhost:3000`

### Building

Build for production:

```bash
pnpm build
```

Start production server:

```bash
pnpm start
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
```

## API Endpoints

### Authentication
- All endpoints require `Authorization: Bearer <token>` header

### Profiles
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create new profile
- `GET /api/profiles/:id` - Get profile by ID
- `PATCH /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile

### Reports
- `GET /api/reports?profileId=<id>` - List reports for profile
- `POST /api/reports` - Upload new report
- `GET /api/reports/:id` - Get report by ID
- `DELETE /api/reports/:id` - Delete report

### Dashboard
- `GET /api/dashboard?profileId=<id>` - Get dashboard data

### Biomarkers
- `GET /api/biomarkers/trends?profileId=<id>&biomarker=<name>` - Get biomarker trends

### Chat
- `POST /api/chat` - Ask health-related questions

### Notifications
- `GET /api/settings/notifications` - Get notification preferences
- `PATCH /api/settings/notifications` - Update notification preferences

## Environment Variables

See `.env.example` for all required environment variables.

## Database Migrations

Migrations are managed through Supabase. To apply migrations:

1. Install Supabase CLI
2. Link your project: `supabase link --project-ref <project-id>`
3. Apply migrations: `supabase db push`

## Background Jobs

The system uses BullMQ for background job processing:

- **process-report**: OCR processing and biomarker extraction
- **update-lhm**: Update Living Health Markdown documents
- **generate-embeddings**: Generate vector embeddings for RAG
- **send-digest**: Send monthly email digests

## Architecture

The application follows a layered architecture:

1. **Controllers**: Handle HTTP requests, validate input, call services
2. **Services**: Contain business logic, orchestrate operations
3. **Middlewares**: Handle cross-cutting concerns (auth, validation, errors)
4. **Workers**: Process background jobs asynchronously

## License

MIT
