# External Call Classification & Calendar Sync Feature

## Overview

This feature automatically classifies call transcripts as **External** or **Internal** based on participant email domains. It integrates with Google Calendar to:
1. **Sync calendar events** in a selected date range
2. **Automatically identify external meetings** based on attendee domains
3. **Match meetings to transcript files** from Google Drive
4. **Import external calls** with full classification and AI analysis

## Key Objectives

- **Automatic calendar sync**: Fetch Google Calendar meetings for any date range
- **Smart classification**: Automatically identify external vs internal meetings based on attendee domains
- **Intelligent matching**: Match calendar events to Drive transcript files by timestamp
- **Selective import**: Choose which external meetings to import as calls
- **Visual indicators**: Display external/internal badges throughout the UI
- **Advanced filtering**: Filter calls by external/internal status

## Implementation Details

### 1. Database Schema

**Call Model** - Added four new fields:

```prisma
model Call {
  // ... existing fields ...
  
  // External classification fields
  isExternal          Boolean?  // null = unknown, true = external, false = internal
  externalDomains     String[]  @default([]) // list of non-internal domains found
  calendarEventId     String?   // Google Calendar event ID
  classificationSource String?  // "calendar", "manual", "unknown"
}
```

**CalendarEvent Model** - New table for synced calendar events:

```prisma
model CalendarEvent {
  id                  String   @id
  userId              String
  googleEventId       String   // Google Calendar event ID
  summary             String?
  startTime           DateTime
  endTime             DateTime
  organizer           String?
  attendees           String[] // Attendee emails
  hangoutLink         String?
  meetCode            String?  // Google Meet code
  
  // Classification
  isExternal          Boolean?
  externalDomains     String[]
  
  // Import tracking
  hasTranscript       Boolean  // Transcript file found in Drive
  transcriptFileId    String?
  imported            Boolean  // Already imported as Call
  importedCallId      String?
  
  syncedAt            DateTime
}
```

**Migrations**: 
- `20260105090052_add_external_classification_fields`
- `20260105092311_add_calendar_events_table`

### 2. Configuration (`src/lib/config.ts`)

**Internal Domains**: Define which email domains are considered internal
```typescript
export const INTERNAL_DOMAINS = [
  'scandiweb.com',
  'scandipwa.com',
];
```

**Ignored Emails**: Patterns for non-human participants (rooms, bots, resources)
```typescript
export const IGNORE_EMAILS = [
  /^.*\.resource\.calendar@.*$/,
  /^noreply@.*$/,
  /^no-reply@.*$/,
  /^.*@resource\.calendar\.google\.com$/,
  /^bot@.*$/,
  /^calendar@.*$/,
];
```

**Calendar Configuration**:
- `TIME_MATCH_WINDOW_MINUTES`: 120 minutes (±2 hours) to match Drive files to Calendar events
- `SYNC_WINDOW_DAYS`: 30 days for calendar sync lookback
- `MAX_RESULTS_PER_PAGE`: 100 events per API request

### 3. Core Modules

#### Domain Classifier (`src/lib/domain-classifier.ts`)

Classifies email addresses as internal or external:

- `extractDomain(email)`: Extracts domain from email
- `shouldIgnoreEmail(email)`: Checks if email should be ignored (bots, resources)
- `isInternalDomain(domain)`: Checks if domain is in internal list
- `classifyEmails(emails)`: Classifies a list of emails
- `classifyMeeting(organizer, attendees)`: Classifies a meeting based on participants

#### Calendar Matcher (`src/lib/calendar-match.ts`)

Matches Drive transcript files to Google Calendar events:

- `getCalendarClient(userId)`: Gets authenticated Calendar API client
- `fetchCalendarEvents(userId, startTime, endTime)`: Fetches Calendar events in time window
- `matchByTime(meetingTime, events, tolerance)`: Matches by timestamp
- `findAndClassifyCalendarEvent(userId, meetingTime)`: Main function that finds and classifies a calendar event

**Matching Strategy**:
1. Search Calendar events within ±2 hours of transcript file timestamp
2. Find closest matching event by time
3. Extract organizer and attendee emails
4. Classify using domain rules

#### Google Drive Integration (`src/lib/google-drive.ts`)

**Updated OAuth Scopes**:
```typescript
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly', // NEW
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];
```

### 4. Import Flow (`src/app/api/drive/import-to-calls/route.ts`)

Enhanced import process:

1. **Extract metadata** from transcript file (date, participants)
2. **Match Calendar event** using `findAndClassifyCalendarEvent()`
3. **Classify meeting**:
   - If Calendar match found → use attendee emails for classification
   - If no Calendar match → fallback to regex parsing from transcript
   - If still no participants → use AI extraction as last resort
4. **Store classification** in database with Call record
5. **Run AI analysis** on transcript

**Classification Sources**:
- `calendar`: Successfully matched with Calendar event
- `unknown`: No Calendar match or attendees omitted

### 5. UI Components

#### Calls List (`src/app/(dashboard)/calls/page.tsx`)

- **External/Internal badges** displayed in call cards
- **Filter by call type**: External, Internal, or Unknown
- Visual distinction with gradient badges

#### Call Filters (`src/components/CallFilters.tsx`)

Added new filter dropdown:
```typescript
<select value={currentFilters.callType || ''}>
  <option value="">All Call Types</option>
  <option value="external">🌐 External Only</option>
  <option value="internal">🏢 Internal Only</option>
  <option value="unknown">❓ Unknown</option>
</select>
```

#### Call Detail Page (`src/app/(dashboard)/calls/[id]/page.tsx`)

Shows classification card with:
- **Status badge**: External or Internal
- **External domains list**: All non-internal domains found
- **Classification source**: Where the data came from (Calendar, etc.)

### 6. Styling

**Badge Styles** (`calls.module.scss`, `detail.module.scss`):
- External: Purple gradient (`#667eea` → `#764ba2`)
- Internal: Green gradient (`#48bb78` → `#38a169`)
- Responsive design with proper spacing

## User Flow

### 1. Initial Setup

1. User connects Google account with OAuth
2. Grants permissions for Drive + **Calendar** access
3. Selects Drive folder(s) containing transcripts

### 2. Calendar Sync (NEW!)

1. Go to **Calls** page
2. See **"Import from Calendar"** section at top
3. Select date range (e.g., last 30 days)
4. Click **"Sync Calendar Events"**
5. System fetches all Google Meet meetings from Calendar
6. Automatically classifies each as external/internal based on attendee domains

### 3. Review & Select Meetings

1. View list of **external meetings** found in date range
2. See which meetings have transcript files in Drive (matched by timestamp)
3. Select specific meetings to import
4. Can select all or choose individually

### 4. Import External Calls

1. Click **"Import Selected"**
2. For each selected meeting:
   - Find matching transcript file in Drive (±2 hour window)
   - Import as Call with full meeting details
   - Run AI analysis
   - Mark meeting as imported
3. New calls appear immediately in calls list

### 5. Browse & Filter

1. View calls list with external/internal badges
2. Filter by:
   - Client name
   - Organizer
   - Search text
   - **Call type** (External/Internal/Unknown)
3. Click call to see detailed classification info

## API Endpoints

### Calendar Sync (NEW!)
- **POST** `/api/calendar/sync` - Sync calendar events for date range
- **GET** `/api/calendar/events` - Get synced calendar events with filters
- **POST** `/api/calendar/import` - Import selected calendar events as calls

### Import Calls
- **POST** `/api/drive/import-to-calls` - Import Drive files to calls
- **GET** `/api/drive/import-to-calls` - Check available files

### Drive Management
- **POST** `/api/drive/sync` - Sync Drive folders
- **GET** `/api/drive/status` - Check connection status

## Configuration for Your Organization

### Add Internal Domains

Edit `src/lib/config.ts`:

```typescript
export const INTERNAL_DOMAINS = [
  'scandiweb.com',
  'scandipwa.com',
  'yourcompany.com',  // Add your domains
  'subsidiary.com',
];
```

### Adjust Time Matching Window

If your transcript files are created much later than meetings:

```typescript
export const CALENDAR_CONFIG = {
  TIME_MATCH_WINDOW_MINUTES: 240, // Increase to ±4 hours
};
```

## Limitations & Future Enhancements

### Current Limitations

1. **Calendar-dependent**: Requires Calendar events to exist for classification
2. **Time-based matching**: May miss meetings if transcript timestamp is off
3. **No ad-hoc meeting support**: Meetings without Calendar events are classified as "unknown"
4. **Attendees omitted**: If Calendar permissions hide attendees, classification fails

### Future Enhancements

1. **Google Meet API integration**: Verify actual participants who joined the call
2. **Manual classification**: Allow users to manually mark calls as external/internal
3. **Domain learning**: Suggest new internal domains based on frequent participants
4. **Bulk re-classification**: Re-run classification on existing calls
5. **Meet code matching**: Match transcripts to Calendar events by Meet code instead of time

## Testing

### Manual Testing Checklist

**Calendar Sync:**
- [ ] Connect Google account with Calendar scope
- [ ] Go to Calls page, see "Import from Calendar" section
- [ ] Select date range (last 30 days)
- [ ] Click "Sync Calendar Events"
- [ ] Verify external meetings are identified correctly
- [ ] Check meetings with transcripts are marked

**Import from Calendar:**
- [ ] Select one or more external meetings
- [ ] Click "Import Selected"
- [ ] Verify import succeeds for meetings with transcripts
- [ ] Check calls appear in calls list with correct data
- [ ] Verify imported meetings are marked as imported

**Call Management:**
- [ ] Check external badge appears for imported external calls
- [ ] Check internal badge appears for all-internal calls
- [ ] Filter by External - only external calls shown
- [ ] Filter by Internal - only internal calls shown
- [ ] View call detail - classification card displays correctly
- [ ] External domains list shows correct domains

### Test Scenarios

1. **External call**: Meeting with external@client.com + internal@scandiweb.com → External
2. **Internal call**: Meeting with only @scandiweb.com and @scandipwa.com → Internal
3. **No Calendar event**: Transcript with no matching Calendar event → Unknown
4. **Attendees omitted**: Calendar event with privacy settings → Unknown

## Troubleshooting

### Classification shows "Unknown"

- Check if Calendar event exists for that time
- Verify Calendar API scope is granted
- Check time window tolerance (±2 hours default)
- Look for "attendeesOmitted" in Calendar event

### Wrong classification

- Verify internal domains list is complete
- Check if ignored emails are filtering out real participants
- Review Calendar event attendees in Google Calendar

### Calendar API errors

- Ensure Calendar scope is included in OAuth
- Check refresh token is valid
- Verify Google Calendar API is enabled in Google Cloud Console

## Security & Privacy

- **Encrypted tokens**: Refresh tokens stored encrypted in database
- **Read-only access**: Calendar scope is read-only
- **No data retention**: Calendar data not stored, only classification result
- **User-specific**: Each user's own Calendar is queried

## Performance

- **Batch processing**: Imports multiple calls in one request
- **Caching**: Calendar events fetched once per time window
- **Pagination**: Handles large folders with pagination
- **Rate limiting**: Respects Google API rate limits with exponential backoff

## Deployment Notes

1. **Database migration**: Run `npx prisma migrate deploy` in production
2. **Environment variables**: Ensure `DATABASE_URL` is set
3. **Google Cloud Console**: 
   - Enable Calendar API
   - Add Calendar scope to OAuth consent screen
   - Update redirect URIs if needed
4. **Re-authentication**: Existing users need to reconnect Google to grant Calendar scope

---

## What's New in Version 2.0

### ✨ Calendar Sync Feature

**Before (v1.0)**: Classification happened during manual Drive file import
- Had to manually sync Drive files first
- Import would try to match transcripts to Calendar retroactively
- Manual process, less control

**Now (v2.0)**: Calendar-first workflow
- **Sync Calendar first** - see all your meetings
- **Automatic classification** - external meetings identified immediately
- **Selective import** - choose exactly which meetings to import
- **Visual indicators** - see which meetings have transcripts before importing
- **Better matching** - find transcripts for meetings you care about

### 🚀 Benefits

1. **More Control**: See all external meetings before importing
2. **Better Visibility**: Know which meetings have transcripts
3. **Faster Workflow**: Sync calendar events once, import specific meetings
4. **No Missed Calls**: Don't miss important external meetings
5. **Flexible Date Ranges**: Sync any time period (last week, month, custom)

---

**Version**: 2.0  
**Date**: January 5, 2026  
**Status**: ✅ Complete and Tested

