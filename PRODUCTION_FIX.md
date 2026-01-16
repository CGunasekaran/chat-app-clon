# Production Deployment Fix Guide

## Issues Fixed

### 1. ✅ Socket.IO Connection Issues
**Problem:** Socket.IO was hardcoded to `localhost:3000`  
**Fix:** Updated to use `window.location.origin` to automatically detect the correct URL in production

### 2. ✅ Server Configuration
**Problem:** Server was hardcoded to localhost and port 3000  
**Fix:** Now uses environment variables:
- `PORT` - Server port (defaults to 3000)
- `HOST` - Server hostname (defaults to 0.0.0.0 for production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

### 3. ✅ CORS Configuration
**Problem:** CORS was set to allow all origins (`*`)  
**Fix:** Now properly configured based on environment:
- Development: `http://localhost:3000`
- Production: Uses `NEXTAUTH_URL` or `ALLOWED_ORIGINS`

### 4. ✅ Next.js Configuration
**Problem:** Missing production optimizations  
**Fix:** Added:
- `output: 'standalone'` for better deployment
- Proper headers for Socket.IO endpoints
- Compression enabled
- Removed powered-by header for security

## Required Environment Variables for Production

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://username:password@host:5432/database"

# NextAuth (REQUIRED)
NEXTAUTH_URL="https://your-deployed-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Server Configuration
PORT="3000"
HOST="0.0.0.0"

# CORS Configuration (optional, defaults to NEXTAUTH_URL)
ALLOWED_ORIGINS="https://your-domain.com,https://www.your-domain.com"

# Email Configuration (for OTP)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-gmail-app-password"

# Environment
NODE_ENV="production"
```

## Deployment Steps

### Step 1: Set Environment Variables

**For Railway:**
1. Go to your Railway project
2. Click on "Variables" tab
3. Add all environment variables listed above
4. Make sure `NEXTAUTH_URL` matches your Railway domain exactly

**For Render:**
1. Go to your Render dashboard
2. Select your web service
3. Click "Environment" in left sidebar
4. Add all environment variables
5. Ensure `NEXTAUTH_URL` matches your Render domain

**For Heroku:**
```bash
heroku config:set NEXTAUTH_URL=https://your-app.herokuapp.com
heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32)
heroku config:set NODE_ENV=production
heroku config:set HOST=0.0.0.0
```

### Step 2: Push Updated Code

```bash
git add .
git commit -m "Fix production deployment - Socket.IO and server config"
git push origin main
```

### Step 3: Verify Deployment

1. Check deployment logs for:
   ```
   > Server ready on https://your-domain.com
   > Environment: production
   ```

2. Open browser console and check for:
   ```
   ✅ Socket connected: [socket-id]
   ```

3. Test real-time features:
   - Send a message
   - Check typing indicators
   - Try voice call

### Step 4: Database Setup (If First Deployment)

```bash
# SSH into your deployment or use platform's console
npx prisma db push
```

## Troubleshooting

### Issue: Socket.IO Not Connecting

**Check 1: CORS Configuration**
```bash
# Make sure NEXTAUTH_URL is set correctly
echo $NEXTAUTH_URL
# Should match your deployed domain exactly
```

**Check 2: WebSocket Support**
- Ensure your platform supports WebSockets
- Railway, Render, and Heroku all support WebSockets
- Vercel does NOT support Socket.IO (use different platform)

**Check 3: Browser Console**
Look for these errors:
- `CORS error` → Check `ALLOWED_ORIGINS` or `NEXTAUTH_URL`
- `Connection refused` → Check if server is running
- `404 on /socket.io/` → Server might not be starting correctly

### Issue: Authentication Not Working

**Check:**
1. `NEXTAUTH_URL` is set to your deployed domain (with https://)
2. `NEXTAUTH_SECRET` is set and not empty
3. Browser allows cookies from your domain

### Issue: Database Connection Errors

**Check:**
1. `DATABASE_URL` is correctly formatted
2. Database allows connections from your deployment platform
3. Database is running and accessible

```bash
# Test database connection
npx prisma db pull
```

### Issue: Email OTP Not Sending

**Check:**
1. Gmail App Password is correctly set (not regular password)
2. 2FA is enabled on Gmail account
3. `EMAIL_USER` is the full email address
4. Check deployment logs for email errors

## Platform-Specific Notes

### Railway
- Automatically detects `PORT` from environment
- Provides `RAILWAY_PUBLIC_DOMAIN` - use this for `NEXTAUTH_URL`
- WebSocket support: ✅ Built-in

### Render
- Automatically sets `PORT`
- Provides public URL - use for `NEXTAUTH_URL`
- WebSocket support: ✅ Built-in
- Free tier has some limitations

### Heroku
- Automatically sets `PORT`
- Requires `HOST=0.0.0.0`
- WebSocket support: ✅ Built-in
- May sleep after inactivity on free tier

### Vercel
- ❌ NOT SUPPORTED - Cannot use Socket.IO on Vercel
- Use Railway, Render, or Heroku instead

## Testing Checklist

After deployment, test these features:

- [ ] User registration with email OTP
- [ ] User login
- [ ] Create a group
- [ ] Send messages in group
- [ ] See typing indicators
- [ ] Upload files/images
- [ ] Make voice call
- [ ] Make video call
- [ ] Read receipts working
- [ ] Reactions working
- [ ] Real-time updates

## Common Environment Variable Mistakes

1. ❌ `NEXTAUTH_URL=http://...` → ✅ Use `https://` in production
2. ❌ `NEXTAUTH_URL=https://domain.com/` → ✅ Remove trailing slash
3. ❌ Using regular Gmail password → ✅ Use App Password
4. ❌ `NODE_ENV=dev` → ✅ Use `production`
5. ❌ Missing `NEXTAUTH_SECRET` → ✅ Generate with `openssl rand -base64 32`

## Need Help?

If you're still having issues:

1. Check deployment logs for errors
2. Check browser console for Socket.IO errors
3. Verify all environment variables are set
4. Make sure you're not deploying to Vercel
5. Test locally first with `NODE_ENV=production npm start`

## Changes Made to Codebase

1. **server.js**
   - Dynamic hostname and port configuration
   - Environment-based CORS setup
   - Added Socket.IO transports configuration
   - Better logging

2. **hooks/useSocket.ts**
   - Auto-detect correct URL from `window.location.origin`
   - Added reconnection logic
   - Better error handling
   - Multiple transport support

3. **next.config.ts**
   - Added standalone output mode
   - Socket.IO CORS headers
   - Production optimizations

4. **.env.example**
   - Added server configuration examples
   - Added ALLOWED_ORIGINS example

## Rollback Instructions

If something goes wrong:

```bash
git revert HEAD
git push origin main
```

Then check logs to understand what failed before trying again.
