# LHM Merge Logic Implementation

## Overview

This document describes the implementation of the Living Health Markdown (LHM) merge logic for the vitals-backend system. The LHM merge logic is responsible for updating a profile's health summary document with new biomarker data from uploaded reports.

## Architecture

### Components

1. **LHM Service** (`src/services/lhm.service.ts`)
   - Main service handling LHM operations
   - Implements merge logic using LLM
   - Validates generated LHM documents
   - Handles compression when needed

2. **LHM Repository** (`src/repositories/lhm.repository.ts`)
   - Database operations for LHM documents
   - Version management and history tracking
   - CRUD operations

3. **Update LHM Worker** (`src/workers/update-lhm.worker.ts`)
   - Background job processor
   - Orchestrates LHM update pipeline
   - Triggers compression and embeddings generation

4. **LHM Templates** (`src/constants/lhm-templates.ts`)
   - Skeleton template for new profiles
   - First report merge prompt
   - Subsequent report merge prompt

## Merge Flow

### Pipeline

```
Report Processing Complete
         ↓
Enqueue Update LHM Job
         ↓
Update LHM Worker
         ↓
1. Fetch report metadata (date, lab name)
2. Fetch biomarkers for report
3. Enrich biomarkers with definitions
4. Generate updated LHM using LLM
5. Validate generated LHM
6. Save to database (with version increment)
7. Check if compression needed
8. Enqueue embeddings generation
```

### First Report vs Subsequent Reports

The system uses different prompts depending on whether this is the first report or a merge:

**First Report:**
- Fills in empty skeleton LHM
- Creates initial Current Health Snapshot
- Initializes Historical Trends tables
- Generates first Key Observations
- Sets all trends to "→ New"

**Subsequent Reports:**
- Updates Current Health Snapshot with latest values
- Appends rows to Historical Trends tables
- Recalculates trends (improving/worsening/stable)
- Regenerates Key Observations based on all data
- Preserves historical data

## LLM Prompts

### First Report Prompt

The first report prompt instructs the LLM to:
1. Categorize biomarkers as 🔴 Needs Attention, 🟡 Borderline, or 🟢 Normal
2. Set all trends to "→ New"
3. Create first rows in Historical Trends panels
4. Generate Key Observations
5. Infer Known Conditions if obvious
6. Update Report Log and metadata

### Merge Prompt

The merge prompt instructs the LLM to:
1. Update Current Health Snapshot with latest values
2. Recategorize based on new values
3. Calculate trends by comparing with previous values
4. Append new rows to Historical Trends (keep last 10)
5. Regenerate Key Observations
6. Update Report Log and metadata
7. Preserve all historical data

## Biomarker Data Format

Biomarkers are enriched with definitions before being sent to the LLM:

```json
{
  "labName": "Thyrocare",
  "biomarkers": [
    {
      "name": "Fasting Blood Sugar",
      "nameNormalized": "fasting_blood_sugar",
      "displayName": "Fasting Blood Sugar",
      "value": 145,
      "unit": "mg/dL",
      "category": "diabetes",
      "refRangeLow": 70,
      "refRangeHigh": 110,
      "refRange": "70-110"
    }
  ]
}
```

## Validation

The LHM service validates generated documents to ensure:

1. **Structure Check**: All required sections present
   - Patient Profile
   - Current Health Snapshot
   - Historical Trends
   - Key Observations
   - Report Log

2. **Data Integrity**: New biomarker values appear in document

3. **Size Check**: Document doesn't exceed 8000 tokens

4. **No Data Loss**: Document hasn't shrunk by more than 30%

If validation fails, the update is rejected and logged for review.

## Compression

When an LHM exceeds 4000 tokens, compression is triggered:

1. Keep Current Health Snapshot in full
2. Keep last 4 entries per Historical Trends panel
3. Summarize older entries as single line
4. Keep Key Observations in full
5. Keep last 6 reports in Report Log
6. Maintain exact markdown structure

Compression uses a specialized LLM prompt to ensure no data loss.

## Error Handling

### Retry Strategy

- Failed LHM updates are retried up to 3 times
- Exponential backoff: 10s, 30s, 90s
- Compression failures don't fail the main job

### Logging

All operations are logged with context:
- Profile ID
- Report ID
- Biomarker count
- Token counts
- Error details

## Usage

### Programmatic Usage

```typescript
import { lhmService } from './services/lhm.service';

// Update LHM with new biomarkers
await lhmService.updateLHM(
  profileId,
  biomarkers,
  reportDate,
  labName
);

// Check if compression needed
const needsCompression = await lhmService.needsCompression(profileId);

// Compress LHM
if (needsCompression) {
  await lhmService.compressLHM(profileId);
}

// Get current LHM
const lhm = await lhmService.getLHM(profileId);

// Get version history
const history = await lhmService.getLHMHistory(profileId, 5);
```

### Queue Integration

The update-lhm worker is automatically triggered after report processing:

```typescript
// In process-report.worker.ts
await queueService.enqueueUpdateLHM({
  profileId,
  userId,
  reportId,
});
```

## Testing

### Unit Tests

Test the LHM merge logic with sample data:

```bash
npx tsx src/scripts/test-lhm-merge.ts
```

### Integration Tests

1. Upload a report through the API
2. Wait for processing to complete
3. Fetch the profile's LHM
4. Verify structure and content
5. Upload another report
6. Verify merge worked correctly

## Configuration

### Environment Variables

- `MISTRAL_API_KEY`: Required for LLM operations
- `SUPABASE_URL`: Database connection
- `SUPABASE_SERVICE_ROLE_KEY`: Database access
- `REDIS_URL`: Queue connection

### Token Limits

- Target LHM size: < 4000 tokens
- Warning threshold: 8000 tokens
- Compression trigger: 4000 tokens

### Worker Concurrency

- Update LHM worker: 2 concurrent jobs
- Reason: LLM calls are expensive and rate-limited

## Performance Considerations

### LLM Calls

- Each LHM update requires 1 LLM call
- Temperature: 0.3 (low for consistent formatting)
- Max tokens: 6000 (allow for large documents)
- Estimated time: 5-15 seconds per update

### Database Operations

- Version history is archived automatically
- Old versions kept indefinitely for audit
- Indexes on profile_id for fast retrieval

### Caching

- LHM documents can be cached for dashboard display
- Cache invalidation on update
- TTL: 10 minutes

## Future Enhancements

1. **Parallel Processing**: Process multiple profiles concurrently
2. **Smart Compression**: Use ML to identify important historical data
3. **Trend Analysis**: Add statistical trend detection
4. **Anomaly Detection**: Flag unusual biomarker changes
5. **Personalized Insights**: Tailor observations to user's health history

## References

- [LHM Design Spec](../../docs/lhm.md)
- [Requirements Document](../../.kiro/specs/vitals-backend/requirements.md)
- [Design Document](../../.kiro/specs/vitals-backend/design.md)
- [Task 10.3](../../.kiro/specs/vitals-backend/tasks.md)

## Changelog

### 2025-02-28
- Initial implementation of LHM merge logic
- Created LHM service with merge and compression
- Implemented update-lhm worker
- Added validation and error handling
- Created test scripts and documentation
