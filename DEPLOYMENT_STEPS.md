# 🚀 Deployment Steps for New Features

## Important: Run These Steps After Each Deployment

### 1. Apply Database Migrations

The new AI categorization feature requires database schema changes. You need to run migrations on your production database.

**Option A: Via Vercel CLI (Recommended)**

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project (if not already linked)
vercel link

# Pull environment variables (including DATABASE_URL)
vercel env pull .env.production

# Run migrations against production
source .env.production
npx prisma migrate deploy
```

**Option B: Via Local Terminal with Production DATABASE_URL**

```bash
cd callinsight-ai

# Set production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url-here"

# Run migrations
npx prisma migrate deploy

# Unset the variable
unset DATABASE_URL
```

**Option C: Add Migration Script to package.json (Automated)**

Already done! Your `vercel-build` script runs migrations automatically:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

This means migrations should run automatically on each deployment. However, if you see errors, manually run:

```bash
# In Vercel dashboard > Project > Settings > Functions
# Or via Vercel CLI:
vercel env pull
source .env
npx prisma migrate deploy
```

### 2. Seed the 8 Fixed Categories

After migrations run successfully, seed the categories:

```bash
# Pull production env
vercel env pull .env.production
source .env.production

# Run the seed script
npx tsx prisma/seed-categories.ts
```

You should see:
```
🌱 Seeding fixed categories...
✅ Intro (Diagnostic) Call
✅ Problem & Requirements Discovery
✅ Ballpark Proposal
✅ Post Solution Discovery Proposal
✅ Decision & Commercial Alignment Call
✅ Delivery Health & Feedback Loop
✅ Roadmap Planning Session (Quarterly, bi-annual, or annual)
✅ Escalation & Recovery Session
✨ Done seeding categories!
```

### 3. Verify Deployment

Check your app at: https://your-app.vercel.app

Test:
1. ✅ App loads without errors
2. ✅ Can import a new call
3. ✅ AI category prediction appears
4. ✅ Confidence score displays
5. ✅ Can override category
6. ✅ Duplicate detection works

### Troubleshooting

**Error: Column "transcriptSummary" does not exist**
- ✅ Solution: Run `npx prisma migrate deploy`

**Error: No categories found**
- ✅ Solution: Run `npx tsx prisma/seed-categories.ts`

**Error: P1001 Can't reach database server**
- ✅ Check DATABASE_URL is correct
- ✅ Check database is running (Neon should be always-on)
- ✅ Check IP allowlist in Neon dashboard

**Error: P1012 Environment variable not found: DATABASE_URL**
- ✅ Make sure `.env` file exists
- ✅ Run `source .env` before commands
- ✅ Or run `vercel env pull` to get production vars

### Current Migrations

1. ✅ `20260106_add_duplicate_detection` - Duplicate call detection
2. ✅ `20260106_add_ai_category_prediction` - AI categorization

### After Seeding Categories

You can verify categories were created:

```bash
# Check categories in database
npx prisma studio

# Or via query
echo "SELECT name, isFixed FROM \"Category\";" | psql $DATABASE_URL
```

Expected output:
- 8 categories with `isFixed = true`
- Each has description (playbook definition)
- Each has color assigned

