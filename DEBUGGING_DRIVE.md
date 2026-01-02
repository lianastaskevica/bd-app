# 🐛 Debugging Google Drive Connection

## Quick Checklist

### 1. Check Browser Console for Errors

1. Press **F12** (or right-click → Inspect)
2. Go to **Console** tab
3. Click "Connect Google Drive"
4. **Look for red error messages**
5. Copy and share any errors you see

### 2. Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Click "Connect Google Drive"
3. Look for failed requests (red)
4. Click on any failed request
5. Check the **Response** tab
6. Share what error message you see

### 3. Verify Environment Variables in Vercel

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Check these exist with correct values:**

```
✅ DATABASE_URL
✅ OPENAI_API_KEY
✅ SESSION_SECRET
✅ NEXTAUTH_SECRET
✅ NEXTAUTH_URL
✅ ADMIN_EMAIL
✅ ADMIN_PASSWORD
✅ ADMIN_NAME
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET
✅ GOOGLE_REDIRECT_URI
```

**IMPORTANT:** After adding variables, did you **redeploy**?

### 4. Check Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials

Click on your OAuth client and verify you have these **4 redirect URIs**:

```
✅ http://localhost:3001/api/auth/google/callback
✅ http://localhost:3001/api/auth/callback/google
✅ https://bd-app-three.vercel.app/api/auth/google/callback
✅ https://bd-app-three.vercel.app/api/auth/callback/google
```

### 5. Test API Endpoints Manually

Try these URLs directly in your browser while logged in:

**Check auth status:**
```
https://bd-app-three.vercel.app/api/drive/status
```

Should return JSON. What does it say?

### 6. Check Vercel Deployment Logs

1. Go to: https://vercel.com/dashboard
2. Click your project
3. Go to **Deployments** tab
4. Click the latest deployment
5. Go to **Functions** tab
6. Look for errors in function logs

## Common Issues & Solutions

### Issue: "Unauthorized" or 401 Error

**Problem:** NextAuth session not working

**Solution:**
- Make sure `NEXTAUTH_SECRET` is set in Vercel
- Make sure `NEXTAUTH_URL` is set to your production URL
- Redeploy after adding variables
- Sign out and sign back in

### Issue: "redirect_uri_mismatch"

**Problem:** Redirect URI not configured in Google Cloud

**Solution:**
- Add all 4 redirect URIs to Google Cloud Console
- Click "SAVE"
- Try again immediately (no waiting needed)

### Issue: "Invalid request" or 400 Error

**Problem:** OAuth client ID/secret incorrect

**Solution:**
- Verify `GOOGLE_CLIENT_ID` in Vercel matches Google Cloud Console
- Verify `GOOGLE_CLIENT_SECRET` in Vercel matches Google Cloud Console
- Redeploy after fixing

### Issue: Connection works but shows "Not Connected"

**Problem:** Session userId doesn't match

**Solution:**
- This was the original issue - check if you're redirected back to integrations
- Should see success message after connecting
- Try refreshing the page

## Testing Steps

1. **Sign out completely**
2. **Sign in with Google** (not email/password)
3. **Go to Integrations**
4. **Click "Connect Google Drive"**
5. **Check what happens**

## What to Share

Please provide:
1. ✅ Browser console errors (if any)
2. ✅ Network tab failed request response (if any)
3. ✅ What you see after clicking "Connect Google Drive"
4. ✅ Do you get redirected to Google, or does it fail immediately?
5. ✅ If redirected to Google, do you successfully authorize?
6. ✅ After authorization, where do you end up?
7. ✅ What error message do you see (exact text)?

## Quick Fix Attempts

### Try 1: Clear Cookies and Sign In Again

1. Clear browser cookies for your site
2. Sign in with Google again
3. Try connecting Drive

### Try 2: Use Incognito/Private Window

1. Open incognito/private window
2. Go to your Vercel URL
3. Sign in with Google
4. Try connecting Drive
5. Does it work in incognito?

### Try 3: Check if Sign-In Works

1. Sign out
2. Click "Continue with Google"
3. Does Google sign-in work?
4. If yes: NextAuth is working
5. If no: Need to fix NextAuth first

## Need More Help?

Share the answers to the "What to Share" section above and I can help pinpoint the exact issue!

