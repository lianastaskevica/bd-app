# 🔐 Google OAuth Login Setup Guide

## What's Been Implemented

✅ Google OAuth Sign-In for multi-user support  
✅ Each user can connect their own Google Drive  
✅ All imported calls are visible to all users  
✅ Users can sign in with Google OR email/password  

---

## 🔧 Configuration Required

### Step 1: Update Google Cloud Console

You need to add **Sign-In** redirect URIs (in addition to the Drive integration URIs).

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth client: **"CallInsight AI Web Client"**
3. Under **"Authorized redirect URIs"**, add these **additional** URIs:

#### For Local Development:
```
http://localhost:3001/api/auth/callback/google
```

#### For Production (Vercel):
```
https://bd-app-three.vercel.app/api/auth/callback/google
```

4. Click **"SAVE"**

**Note:** You should now have **4 total redirect URIs**:
- `http://localhost:3001/api/auth/google/callback` (Drive integration - existing)
- `http://localhost:3001/api/auth/callback/google` (Sign-in - NEW)
- `https://bd-app-three.vercel.app/api/auth/google/callback` (Drive - existing)
- `https://bd-app-three.vercel.app/api/auth/callback/google` (Sign-in - NEW)

---

### Step 2: Update Vercel Environment Variables

Add these **new** environment variables to Vercel:

1. Go to: https://vercel.com/dashboard
2. Click your **`bd-app`** project
3. Go to **Settings → Environment Variables**
4. Add these **2 new variables**:

#### NEXTAUTH_SECRET
```
Name: NEXTAUTH_SECRET
Value: ZIS7xoHuLoPOwggD7hAkllPoai3v7JhL63o7WLCwQjw=
Environment: Production, Preview, Development
```

#### NEXTAUTH_URL
```
Name: NEXTAUTH_URL
Value: https://bd-app-three.vercel.app
Environment: Production, Preview, Development
```

5. Click **"Save"** for each

---

### Step 3: Redeploy Vercel

1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Wait ~2 minutes

---

## 🎉 After Deployment

### Test Google OAuth Sign-In:

1. Go to: **https://bd-app-three.vercel.app**
2. You'll see the updated login page with:
   - Email/Password login (existing admin user still works)
   - **"Continue with Google"** button (NEW!)
3. Click **"Continue with Google"**
4. Sign in with any Google account
5. You're now logged in! 🎉

### Test Multi-User Drive Integration:

1. User 1 logs in with Google
2. User 1 connects their Google Drive
3. User 1 imports calls from their Drive
4. User 2 logs in with a different Google account
5. User 2 can see User 1's calls ✅
6. User 2 can connect their own Drive
7. Both users' calls are visible to everyone ✅

---

## 🔐 Security Features

### User Isolation:
- Each user has their own Google Drive connection
- Drive credentials are stored per-user
- Users can only access files from their own connected Drive

### Shared Data:
- All imported calls are visible to all users
- This allows team collaboration
- Everyone can see analytics and insights

---

## 📊 User Management

### Existing Admin User:
- Email: `admin@scandiweb.com`
- Password: `option123!`
- Can still log in with email/password ✅

### New Google Users:
- Automatically created on first Google sign-in
- No password needed (OAuth only)
- Profile picture from Google account

### Mixed Authentication:
- Users can have both email/password AND Google OAuth
- Accounts are matched by email address
- If you sign in with Google using the same email as an existing user, they get linked

---

## 🎯 Key Differences

### Before (Single User):
- One admin account with hardcoded credentials
- All Drive files belonged to that one user

### After (Multi-User):
- Any Google account can sign in
- Each user can connect their own Drive
- All calls visible to everyone (team collaboration)

---

## 🐛 Troubleshooting

### "This app's request is invalid"
- Check that you added the new `/api/auth/callback/google` URI to Google Cloud Console
- Make sure you clicked "SAVE" after adding URIs

### Google Sign-In button doesn't work
- Verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set in Vercel
- Check Vercel deployment logs for errors
- Redeploy after adding environment variables

### Can't see imported calls from other users
- This is the expected behavior! All calls are visible to all users.
- Check the Calls page - you should see calls from all users

### Email/Password login still works?
- Yes! The admin user can still log in with email/password
- Both authentication methods work side-by-side

---

## 📝 Summary

**What to do:**
1. Add 2 new redirect URIs to Google Cloud Console
2. Add 2 new environment variables to Vercel (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
3. Redeploy Vercel
4. Test Google Sign-In!

**Total time:** ~5 minutes

---

## ✅ Complete Setup Checklist

- [ ] Add sign-in redirect URIs to Google Cloud Console
- [ ] Add `NEXTAUTH_SECRET` to Vercel
- [ ] Add `NEXTAUTH_URL` to Vercel
- [ ] Redeploy Vercel
- [ ] Test Google Sign-In on production
- [ ] Test Drive connection as multiple users
- [ ] Verify all calls are visible to all users

---

**Once you complete these steps, your multi-user Google OAuth login will be live!** 🚀

