# 🚀 Production Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account (✅ Done - code is pushed)
- Vercel account (free)
- Production PostgreSQL database
- OpenAI API key

---

## Step 1: Set Up Production Database

Choose one of these free options:

### Option A: Neon (Recommended - Free tier available)

1. Go to https://neon.tech
2. Sign up with GitHub
3. Click **"Create Project"**
4. Choose a region close to your users
5. Click **"Create project"**
6. Copy the connection string (looks like):
   ```
   postgresql://username:password@host.neon.tech/dbname?sslmode=require
   ```

### Option B: Supabase (Free tier available)

1. Go to https://supabase.com
2. Create new project
3. Go to **Settings → Database**
4. Copy **Connection string** (URI format)

### Option C: Railway (Free tier - $5 credit/month)

1. Go to https://railway.app
2. Create new project
3. Add **PostgreSQL** service
4. Copy **DATABASE_URL** from variables

---

## Step 2: Deploy to Vercel

### 2.1 Connect to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** (use GitHub)
3. Click **"Add New Project"**
4. Import `scandiweb/callinsight-ai`
5. Click **"Import"**

### 2.2 Configure Environment Variables

In Vercel project settings, add these environment variables:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `DATABASE_URL` | Your production database connection string | From Step 1 (Neon/Supabase/Railway) |
| `OPENAI_API_KEY` | `sk-proj-iokvIYSf...` | Your current key or new production key |
| `SESSION_SECRET` | Random string | Generate with: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | `admin@scandiweb.com` | Admin login email |
| `ADMIN_PASSWORD` | Strong password | Choose a secure password |
| `ADMIN_NAME` | `Admin User` | Admin display name |

**To add environment variables in Vercel:**
1. Go to **Settings → Environment Variables**
2. Add each variable above
3. Select **Production, Preview, Development** (all environments)
4. Click **"Save"**

### 2.3 Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (~2 minutes)
3. Vercel will automatically:
   - Install dependencies
   - Run migrations (`prisma migrate deploy`)
   - Build the application
   - Deploy to production

---

## Step 3: Seed Production Database

After first deployment:

```bash
# Connect to production database
DATABASE_URL="your-production-db-url" npm run db:seed
```

Or use Vercel CLI:
```bash
vercel env pull .env.local
npm run db:seed
```

---

## Step 4: Access Your App

Your app will be available at:
- Production: `https://your-project.vercel.app`
- Custom domain: Can add in Vercel settings

**Login with:**
- Email: Value from `ADMIN_EMAIL`
- Password: Value from `ADMIN_PASSWORD`

---

## Alternative Deployment Options

### Deploy to Railway

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `scandiweb/callinsight-ai`
5. Add PostgreSQL service
6. Add environment variables (same as above)
7. Railway auto-deploys

### Deploy to Render

1. Go to https://render.com
2. New → **Web Service**
3. Connect GitHub repo
4. Build Command: `npm run build`
5. Start Command: `npm start`
6. Add PostgreSQL database
7. Add environment variables
8. Deploy

---

## Environment Variables Reference

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# OpenAI
OPENAI_API_KEY="sk-proj-..."

# Authentication
SESSION_SECRET="base64-random-string"
ADMIN_EMAIL="admin@scandiweb.com"
ADMIN_PASSWORD="secure-password"
ADMIN_NAME="Admin User"
```

### Optional Variables (for Google Drive Integration)

```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="https://your-domain.com/api/auth/google/callback"
```

To get Google OAuth credentials:
1. Go to https://console.cloud.google.com/
2. Create project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI

---

## Post-Deployment Checklist

- [ ] Database is connected (check Vercel logs)
- [ ] Migrations ran successfully
- [ ] Database is seeded with admin user
- [ ] Can login with admin credentials
- [ ] Test uploading a call
- [ ] Test AI analysis (OpenAI API works)
- [ ] (Optional) Google Drive integration works
- [ ] Custom domain configured (if needed)

---

## Troubleshooting

### "Can't reach database server"
- Check `DATABASE_URL` in environment variables
- Ensure connection string includes `?sslmode=require`
- Check database is running

### "OpenAI API Error"
- Verify `OPENAI_API_KEY` is correct
- Check OpenAI account has credits
- Check API key has proper permissions

### "Migration failed"
- Check database permissions
- Try manual migration: `npx prisma migrate deploy`
- Check Vercel deployment logs

### Build fails
- Check Node.js version (should be 18+)
- Verify `package.json` dependencies
- Check build logs in Vercel

---

## Updating Production

When you make changes:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Vercel auto-deploys** from `main` branch

3. **For database changes:**
   ```bash
   # Create migration
   npx prisma migrate dev --name your_change_name
   
   # Commit migration files
   git add prisma/migrations
   git commit -m "Add database migration"
   git push
   ```

---

## Monitoring & Logs

- **Vercel Dashboard:** View deployments and logs
- **Database GUI:** Use Prisma Studio or database provider's UI
- **Error tracking:** Consider adding Sentry or LogRocket

---

## Security Best Practices

✅ **DO:**
- Use strong passwords for `ADMIN_PASSWORD`
- Rotate `SESSION_SECRET` regularly
- Use separate OpenAI keys for dev/production
- Enable SSL for database (`?sslmode=require`)
- Set up custom domain with HTTPS

❌ **DON'T:**
- Commit `.env` files to git
- Share API keys publicly
- Use weak admin passwords
- Disable SSL for production database

---

## Cost Estimate

| Service | Free Tier | Paid (if needed) |
|---------|-----------|------------------|
| Vercel | Unlimited hobby projects | $20/mo Pro |
| Neon | 3GB storage, 1 project | $19/mo |
| OpenAI | Pay per use | ~$0.001/1K tokens |
| **Total** | **Free or ~$5-10/mo** | ~$40/mo |

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs
- Project Issues: https://github.com/scandiweb/callinsight-ai/issues

---

**Ready to deploy!** Follow the steps above or let me know which platform you'd like to use.

