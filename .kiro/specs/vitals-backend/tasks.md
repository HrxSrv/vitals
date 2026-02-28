# Implementation Plan

- [x] 1. Set up project structure and core infrastructure
  - Create Express.js TypeScript project with proper folder structure (handler, service, repository, apiclient, middleware, router, model, lib, jobs, db)
  - Configure TypeScript with strict mode and path aliases
  - Set up ESLint and Prettier for code quality
  - Create package.json with all required dependencies (express, @supabase/supabase-js, bullmq, ioredis, zod, mistralai, resend, etc.)
  - Set up environment variables configuration (.env.example)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Set up Supabase database and migrations
  - [x] 2.1 Create initial database schema migration
    - Write SQL migration for users, profiles, reports, biomarkers, biomarker_definitions, user_health_markdown, lhm_history, report_embeddings, notification_prefs tables
    - Add proper indexes for performance (profiles_user, biomarkers_profile_name, biomarkers_profile_date, reports_profile, embeddings_vector)
    - Enable pgvector extension for embeddings
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 2.2 Create Row Level Security (RLS) policies
    - Write RLS policies for all tables to ensure users can only access their own data
    - Test RLS policies with different user scenarios
    - _Requirements: 1.4, 1.5_
  
  - [x] 2.3 Seed biomarker definitions
    - Create migration to populate biomarker_definitions table with common biomarkers (diabetes, kidney, liver, lipid, thyroid, blood count panels)
    - Include display names, categories, units, and reference ranges
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [x] 2.4 Set up Supabase client and type generation
    - Configure Supabase client with service role and anon keys
    - Generate TypeScript types from database schema
    - Create database client wrapper with connection pooling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement authentication middleware and user management
  - [x] 3.1 Create authentication middleware
    - Implement authMiddleware to verify Supabase JWT tokens
    - Extract user information from token and attach to request object
    - Handle authentication errors gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 3.2 Create user repository
    - Implement UserRepository with methods to create, find, and update users
    - Sync Supabase Auth users with application users table
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 3.3 Create auth handler
    - Implement session endpoint to return current user info
    - Handle Supabase Auth errors
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Implement profile management
  - [x] 4.1 Create profile model and validation schemas
    - Define Profile TypeScript interface
    - Create Zod schemas for create and update operations
    - Define relationship and gender enums
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.2 Implement profile repository
    - Create ProfileRepository with CRUD methods using Supabase client
    - Implement findByUserId, findById, create, update, delete methods
    - Handle cascade deletes for profile-related data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.3 Implement profile service
    - Create ProfileService with business logic for profile operations
    - Implement authorization checks (users can only access their own profiles)
    - Auto-create default profile on user signup
    - Initialize skeleton LHM when profile is created
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.4 Create profile handler and routes
    - Implement ProfileHandler with methods for list, create, get, update, delete
    - Set up Express routes with authentication and validation middleware
    - Add proper error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Implement file upload and storage
  - [x] 5.1 Set up Supabase Storage client
    - Configure storage bucket for PDF reports
    - Implement upload, download, and delete methods
    - Set up proper access policies
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.2 Create report repository
    - Implement ReportRepository with CRUD methods
    - Handle report status transitions (pending → processing → done/failed)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.3 Implement report upload handler
    - Set up multer middleware for file uploads
    - Validate file type (PDF only) and size (max 10MB)
    - Generate secure filenames and upload to Supabase Storage
    - Create report record in database
    - Enqueue background job for OCR processing
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.4 Create report management endpoints
    - Implement list, get, and delete report endpoints
    - Add authorization checks (users can only access their own reports)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. Set up background job queue with BullMQ
  - [x] 6.1 Configure Redis and BullMQ
    - Set up Redis connection with proper configuration
    - Create job queue with retry and error handling settings
    - Configure worker concurrency limits
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [x] 6.2 Create job queue utilities
    - Implement queue wrapper with methods to enqueue jobs
    - Add job status tracking and monitoring
    - Set up exponential backoff for retries
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [-] 7. Implement Mistral API clients
  - [x] 7.1 Create Mistral OCR client
    - Implement OCR API integration to extract text from PDFs
    - Handle API errors and rate limiting
    - Add retry logic with exponential backoff
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 7.2 Create Mistral Chat client
    - Implement chat completion API for LLM operations
    - Support streaming responses
    - Handle context window management
    - _Requirements: 4.4, 6.2, 9.4, 9.5_
  
  - [x] 7.3 Create Mistral Embed client
    - Implement embedding API for vector generation
    - Batch embedding requests for efficiency
    - _Requirements: 10.2, 10.3_

- [x] 8. Implement biomarker extraction and normalization
  - [x] 8.1 Create biomarker normalizer utility
    - Implement biomarker alias mapping table (FBS → fasting_blood_sugar, etc.)
    - Create normalization function with rule-based matching
    - Add LLM fallback for unknown biomarker names
    - _Requirements: 5.1, 5.2_
  
  - [x] 8.2 Create biomarker repository
    - Implement BiomarkerRepository with methods to store and query biomarkers
    - Add methods to fetch biomarkers by profile and date range
    - Join with biomarker_definitions for reference ranges
    - _Requirements: 4.4, 5.3, 5.4, 5.5_
  
  - [x] 8.3 Implement biomarker extraction service
    - Parse OCR markdown output with LLM to extract structured biomarker data
    - Normalize biomarker names using the normalizer utility
    - Store biomarkers in database with profile association
    - _Requirements: 4.3, 4.4, 5.1, 5.2_

- [x] 9. Implement report processing job
  - [x] 9.1 Create process-report job handler
    - Fetch report from database and PDF from storage
    - Call Mistral OCR API to extract text
    - Store raw OCR markdown in report record
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 9.2 Extract biomarkers from OCR output
    - Use LLM with structured output prompt to extract biomarkers as JSON
    - Extract report date if not provided by user
    - Normalize biomarker names
    - Store biomarkers in database
    - _Requirements: 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 9.3 Trigger LHM update
    - Enqueue update-lhm job with profile ID and new biomarkers
    - Update report status to "done" or "failed"
    - _Requirements: 4.5, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 9.4 Implement error handling and retries
    - Handle OCR API failures with retries
    - Log errors for debugging
    - Update report status appropriately
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.3, 15.4_

- [x] 10. Implement Living Health Markdown (LHM) system
  - [x] 10.1 Create LHM repository
    - Implement LHMRepository with methods to create, read, update LHM documents
    - Store LHM versions in lhm_history table
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 10.2 Implement LHM initialization
    - Create skeleton LHM template following lhm.md structure
    - Initialize LHM when profile is created
    - _Requirements: 6.1_
  
  - [x] 10.3 Implement LHM merge logic
    - Create LLM prompts for first report and subsequent report merges (following lhm.md patterns)
    - Update Current Health Snapshot with latest values and status
    - Append new rows to Historical Trends tables
    - Regenerate Key Observations section
    - Update metadata (last updated, report count, etc.)
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 10.4 Create LHM validator
    - Validate LHM structure (all required sections present)
    - Check for data loss (old dates still present)
    - Verify new data is included
    - Check token count limits
    - _Requirements: 6.5_
  
  - [x] 10.5 Implement LHM compression
    - Detect when LHM exceeds 4000 tokens
    - Compress older historical entries while preserving recent data
    - Maintain exact markdown structure
    - _Requirements: 6.5_
  
  - [x] 10.6 Create update-lhm job handler
    - Fetch current LHM and new biomarkers
    - Call LLM with merge prompt
    - Validate generated LHM
    - Save new version and archive old version
    - Trigger embedding generation job
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Implement dashboard API
  - [x] 11.1 Create dashboard service
    - Fetch profile's LHM document
    - Get latest biomarker values with status (normal/high/low)
    - Calculate days since last report
    - Join biomarkers with biomarker_definitions for reference ranges
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 11.2 Create dashboard handler
    - Implement getDashboard endpoint with profile_id query parameter
    - Return LHM, latest biomarkers, and metadata
    - Add caching for performance
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Implement biomarker trend analysis
  - [x] 12.1 Create biomarker trend service
    - Query all historical values for a specific biomarker and profile
    - Join with biomarker_definitions for reference ranges
    - Calculate trend direction (improving/worsening/stable)
    - Order by report date ascending
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 12.2 Create biomarker trend handler
    - Implement getBiomarkerTrend endpoint with biomarker name and profile_id
    - Return time series data with values, dates, status, and reference ranges
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13. Implement RAG embeddings system
  - [x] 13.1 Create embedding repository
    - Implement methods to store and query embeddings with pgvector
    - Add vector similarity search functionality
    - Filter embeddings by profile_id
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 13.2 Implement text chunking utility
    - Split OCR markdown into chunks of max 500 tokens
    - Preserve context at chunk boundaries
    - _Requirements: 10.1_
  
  - [x] 13.3 Create generate-embeddings job handler
    - Fetch report OCR markdown
    - Chunk text into segments
    - Generate embeddings using Mistral Embed API
    - Store embeddings with profile and report associations
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 13.4 Implement embedding cleanup
    - Delete embeddings when report is deleted
    - _Requirements: 10.5_

- [x] 14. Implement RAG-powered Q&A system
  - [x] 14.1 Create profile detection utility
    - Implement keyword matching to detect profile from question (e.g., "mom" → mother relationship)
    - Handle ambiguous cases by using currently selected profile
    - _Requirements: 9.1_
  
  - [x] 14.2 Implement chat service
    - Detect target profile from question
    - Fetch profile's LHM as primary context
    - Optionally perform vector search for specific details
    - Build LLM prompt with health data context
    - Stream response to client
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 14.3 Create chat handler
    - Implement streaming chat endpoint
    - Handle Server-Sent Events (SSE) for streaming responses
    - Add error handling for LLM failures
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. Implement email notification system
  - [x] 15.1 Set up Resend email client
    - Configure Resend API client
    - Create email templates for monthly digest
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 15.2 Create notification preferences repository
    - Implement methods to get and update notification preferences
    - Initialize preferences on user signup
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 15.3 Implement monthly digest service
    - Fetch all profiles for a user
    - Get LHM for each profile
    - Calculate days since last report per profile
    - Generate family-wide summary using LLM
    - Prioritize profiles with concerning values
    - _Requirements: 11.2, 11.3, 11.4_
  
  - [x] 15.4 Create send-digest job handler
    - Query users with email_digest_enabled = true
    - Generate digest content for each user
    - Send email via Resend
    - Update last_sent_at timestamp
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 15.5 Set up cron job for monthly digest
    - Configure cron schedule (1st of every month)
    - Enqueue send-digest jobs for all eligible users
    - _Requirements: 11.1, 11.5_
  
  - [x] 15.6 Create notification settings endpoints
    - Implement get and update notification preferences handlers
    - Add validation for digest frequency values
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 16. Implement error handling and logging
  - [x] 16.1 Create error classes
    - Define AppError base class and specific error types (ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ExternalServiceError)
    - Include status codes and error codes
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 16.2 Create error middleware
    - Implement global error handler for Express
    - Map errors to appropriate HTTP status codes
    - Log errors with stack traces
    - Return consistent error response format
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 16.3 Set up logging infrastructure
    - Configure structured logging with Winston or Pino
    - Add request logging middleware
    - Log all external API calls
    - _Requirements: 14.4, 14.5_
  
  - [x] 16.4 Implement retry utility
    - Create withRetry helper with exponential backoff
    - Configure retry logic for external service calls
    - _Requirements: 14.5, 15.3, 15.4_

- [x] 17. Set up Express server and routing
  - [x] 17.1 Create main application entry point
    - Initialize Express app with middleware (helmet, cors, body-parser)
    - Set up request logging
    - Configure error handling
    - _Requirements: All_
  
  - [x] 17.2 Implement service initialization
    - Create dependency injection setup
    - Initialize all repositories, services, and handlers
    - Set up database connections
    - _Requirements: All_
  
  - [x] 17.3 Create router configuration
    - Define all API routes with proper HTTP methods
    - Apply authentication middleware to protected routes
    - Apply validation middleware to endpoints
    - Bind handler methods to routes
    - _Requirements: All_
  
  - [x] 17.4 Add health check endpoint
    - Implement /health endpoint for monitoring
    - Check database connectivity
    - Check Redis connectivity
    - Return service status
    - _Requirements: All_

- [ ] 18. Create development and deployment configuration
  - [x] 18.1 Set up development environment
    - Create docker-compose.yml for local PostgreSQL and Redis
    - Add development scripts to package.json (dev, build, test)
    - Configure nodemon for hot reloading
    - _Requirements: All_
  
  - [-] 18.2 Create Dockerfile
    - Write multi-stage Dockerfile for production builds
    - Optimize image size
    - Configure proper Node.js version
    - _Requirements: All_
  
  - [~] 18.3 Add environment configuration
    - Document all required environment variables
    - Create .env.example file
    - Add environment validation on startup
    - _Requirements: All_
  
  - [~] 18.4 Set up CI/CD pipeline
    - Configure GitHub Actions or similar for automated testing
    - Add linting and type checking to CI
    - Set up automated deployments
    - _Requirements: All_

- [ ] 19. Documentation and testing setup
  - [~] 19.1 Create API documentation
    - Document all endpoints with request/response examples
    - Add authentication requirements
    - Document error codes and responses
    - _Requirements: All_
  
  - [~] 19.2 Write README
    - Add project overview and architecture description
    - Document setup instructions
    - Add development workflow guide
    - Include deployment instructions
    - _Requirements: All_
  
  - [~] 19.3 Set up testing framework
    - Configure Jest for unit and integration tests
    - Set up test database
    - Create test utilities and helpers
    - _Requirements: All_
