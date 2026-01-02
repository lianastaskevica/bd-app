# 🚀 Vercel Deployment Instructions

## Quick Deploy Checklist

Follow these steps to deploy your CallInsight AI app to Vercel.

---

## Step 1: Go to Vercel

**Open this link**: https://vercel.com/new

- If not logged in, click "Sign up" and use your GitHub account
- Once logged in, you'll see "Import Git Repository"

---

## Step 2: Import Your Repository

1. Look for **"Import Git Repository"** section
2. Find `lianastaskevica/bd-app` in the list
3. Click **"Import"** next to it
4. You'll be taken to the project configuration page

---

## Step 3: Configure Project Settings

**Project Name**: `bd-app` (or your choice)

**Framework Preset**: Next.js (should auto-detect)

**Root Directory**: `./` (default)

**Build Command**: `npm run build` (default)

**Output Directory**: `.next` (default)

---

## Step 4: Add Environment Variables ⚠️ IMPORTANT

Click **"Environment Variables"** to expand the section.

For each variable below:
1. Enter the **Name** (left column)
2. Enter the **Value** (right column)
3. Keep **"Production, Preview, and Development"** selected
4. Click **"Add"**

### Copy these exactly:

**⚠️ IMPORTANT: Use your actual values from the local `ENVIRONMENT_VARIABLES.txt` file**

The values are stored locally and should NOT be committed to GitHub for security reasons.

#### Required Variables:

1. **DATABASE_URL** - Your Neon PostgreSQL connection string
2. **OPENAI_API_KEY** - Your OpenAI API key
3. **SESSION_SECRET** - Random secret string (generated with `openssl rand -base64 32`)
4. **ADMIN_EMAIL** - Admin login email
5. **ADMIN_PASSWORD** - Admin login password
6. **ADMIN_NAME** - Admin display name
7. **GOOGLE_CLIENT_ID** - Your Google OAuth Client ID
8. **GOOGLE_CLIENT_SECRET** - Your Google OAuth Client Secret
9. **GOOGLE_REDIRECT_URI** - Update after deployment with your Vercel URL

**To get your actual values**: Check the `ENVIRONMENT_VARIABLES.txt` file in your local project directory (NOT in GitHub)

**Note**: For Variable 9, just put "PLACEHOLDER-UPDATE-AFTER-DEPLOYMENT" for now. You'll update this after deployment with your actual Vercel URL.

---

## Step 5: Deploy

1. Review all settings
2. Click the big **"Deploy"** button
3. Wait 2-3 minutes while Vercel:
   - Clones your repository
   - Installs dependencies
   - Runs database migrations
   - Builds your app
   - Deploys to production

You'll see a progress screen with logs.

---

## Step 6: Get Your Deployment URL

After deployment succeeds, you'll see:

- **Congratulations! 🎉**
- Your app URL: `https://bd-app-xxxx.vercel.app`

**Copy this URL!**

---

## Step 7: Update Google OAuth Redirect URI

### Part A: Update in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth client: `CallInsight AI Web Client`
3. Under **"Authorized redirect URIs"**, click **"+ ADD URI"**
4. Add: `https://YOUR-VERCEL-URL.vercel.app/api/auth/google/callback`
   - Replace `YOUR-VERCEL-URL` with your actual URL from Step 6
5. Click **"SAVE"**

### Part B: Update in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your `bd-app` project
3. Go to **"Settings"** → **"Environment Variables"**
4. Find `GOOGLE_REDIRECT_URI`
5. Click **"Edit"**
6. Update value to: `https://YOUR-VERCEL-URL.vercel.app/api/auth/google/callback`
7. Click **"Save"**
8. Vercel will automatically redeploy (takes 1-2 minutes)

---

## Step 8: Test Your Deployment

1. Open your Vercel URL: `https://bd-app-xxxx.vercel.app`
2. Login with:
   - Email: `admin@scandiweb.com`
   - Password: `option123!`
3. Test features:
   - ✅ Dashboard loads
   - ✅ View calls
   - ✅ Upload a call (tests OpenAI integration)
   - ✅ Connect Google Drive (tests OAuth)

---

## ✅ Deployment Complete!

Your app is now live at: `https://YOUR-URL.vercel.app`

### Future Updates

Every time you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push
```

Vercel will automatically redeploy! 🚀

---

## Troubleshooting

### Build fails
- Check deployment logs in Vercel dashboard
- Verify all environment variables are set correctly

### Database connection error
- Check `DATABASE_URL` is correct
- Ensure it includes `?sslmode=require`

### Google Drive not connecting
- Verify `GOOGLE_REDIRECT_URI` matches your Vercel URL
- Check it's added to Google Cloud Console authorized URIs
- Ensure test user is added in Google Cloud Console

### OpenAI errors
- Verify `OPENAI_API_KEY` is correct
- Check your OpenAI account has credits

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Check deployment logs in Vercel dashboard
- Your GitHub repo: https://github.com/lianastaskevica/bd-app

