# Automated Calendar Sync Setup

This project uses **Vercel Cron Jobs** to automatically sync Google Calendar events daily.

## How It Works

The cron job runs every day at 2 AM UTC and:
1. Finds all users with Google Calendar connected
2. Syncs their calendar events from the last 7 days to next 7 days
3. Automatically detects external meetings
4. Searches for transcript files in Google Drive
5. Updates the database with new/changed events

## Configuration

### 1. Add Environment Variable

Add this to your Vercel project environment variables (or local `.env` for testing):

```bash
CRON_SECRET=your-random-secret-key-here
```

**Generate a secure random secret:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### 2. Vercel Configuration

The cron schedule is defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-calendars",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule Format (cron syntax):**
- `0 2 * * *` - Every day at 2:00 AM UTC
- `0 */6 * * *` - Every 6 hours
- `*/30 * * * *` - Every 30 minutes
- `0 0 * * 0` - Every Sunday at midnight

[Learn more about cron syntax](https://crontab.guru/)

### 3. Vercel Deployment

After pushing to GitHub:
1. Vercel automatically deploys your changes
2. The cron job is registered automatically
3. Cron starts running on the specified schedule

**Check cron status:**
- Go to your Vercel project dashboard
- Navigate to: Settings → Cron Jobs
- You should see `/api/cron/sync-calendars` listed

## Testing Locally

You can test the cron endpoint locally:

```bash
# Start the dev server
npm run dev

# In another terminal, call the endpoint
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/sync-calendars
```

## Manual Trigger (Testing on Vercel)

You can manually trigger the cron job:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/sync-calendars
```

## Monitoring

### View Cron Logs

1. Go to Vercel Dashboard → Your Project
2. Click "Logs" tab
3. Filter by `/api/cron/sync-calendars`

### Check Last Sync Status

The sync status is stored in the database:

```sql
SELECT 
  userId,
  googleEmail,
  lastSyncedAt,
  lastSyncStatus,
  lastSyncError
FROM GoogleIntegration
WHERE autoSyncEnabled = true;
```

### Response Format

The cron endpoint returns:

```json
{
  "success": true,
  "message": "Calendar sync completed",
  "results": {
    "total": 10,
    "success": 9,
    "failed": 1,
    "newEvents": 45,
    "updatedEvents": 12,
    "errors": [
      {
        "userId": "user123",
        "email": "user@example.com",
        "error": "Token expired"
      }
    ]
  },
  "timestamp": "2026-01-07T12:00:00.000Z"
}
```

## Database Schema

The sync tracking fields in `GoogleIntegration`:

```prisma
model GoogleIntegration {
  // ... other fields ...
  
  // Auto-sync settings
  autoSyncEnabled       Boolean   @default(true)
  lastSyncedAt          DateTime?
  lastSyncStatus        String?   // success, failed, partial
  lastSyncError         String?   @db.Text
}
```

## Disabling Auto-Sync for a User

Users can disable auto-sync (to be implemented in UI):

```typescript
await prisma.googleIntegration.update({
  where: { userId: 'user123' },
  data: { autoSyncEnabled: false },
});
```

## Troubleshooting

### Cron Not Running

1. **Check Vercel Dashboard:**
   - Settings → Cron Jobs → Verify it's listed
   
2. **Check CRON_SECRET:**
   - Environment Variables → Verify it's set
   - Make sure it's added to **Production** environment

3. **Check Logs:**
   - Look for errors in Vercel logs
   - Search for "Starting calendar sync cron job"

### Token Expiration

If users get "Token expired" errors:
- The refresh token flow should handle this automatically
- If persistent, user needs to reconnect Google account

### Rate Limiting

Google Calendar API has limits:
- 1,000,000 queries per day
- Current implementation adds 1-second delay between users
- For >100 users, consider implementing batch processing

## Vercel Plan Requirements

- **Hobby (Free):** 1 cron job, max 10 second execution
- **Pro:** Unlimited crons, max 300 second execution
- **Enterprise:** Custom limits

Our implementation uses `maxDuration: 300` (5 minutes) which requires **Pro plan** if syncing many users.

For Hobby plan, reduce to:
```typescript
export const maxDuration = 10; // 10 seconds max
```

## Future Enhancements

Consider adding:
1. User-configurable sync frequency
2. Webhook-based real-time sync (Google Calendar push notifications)
3. Selective sync (only specific calendars)
4. Retry logic for failed syncs
5. Email notifications for sync failures
6. UI to view sync history

