# Production Environment Variables Guide

## Required Environment Variables for Production

### 1. Database Configuration
```bash
DATABASE_URL="postgresql://guna_sekaran:G06lVmhMYfDkPNv3VMUHkFAT5WUIjanW@dpg-d54nt6muk2gs73bfm4dg-a.virginia-postgres.render.com/chat_db_wqnk"
```
**Note:** You already have this configured in Render.

### 2. NextAuth Configuration
```bash
# Your production URL
NEXTAUTH_URL="https://your-app-name.onrender.com"

# Generate a secure random secret (run this command):
# openssl rand -base64 32
NEXTAUTH_SECRET="<your-generated-secret-here>"
```

### 3. Email Configuration (For OTP & Password Reset)

#### Option A: Using Gmail (Recommended for getting started)

```bash
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
```

**How to get Gmail App Password:**
1. Go to your Google Account: https://myaccount.google.com/
2. Enable 2-Factor Authentication (if not already enabled)
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Create a new app password for "Mail"
5. Copy the 16-character password (no spaces)
6. Use this as `EMAIL_PASSWORD` (NOT your regular Gmail password)

#### Option B: Using Other SMTP Providers

**SendGrid:**
```bash
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_USER="apikey"
EMAIL_PASSWORD="<your-sendgrid-api-key>"
```

**Mailgun:**
```bash
EMAIL_HOST="smtp.mailgun.org"
EMAIL_PORT="587"
EMAIL_USER="<your-mailgun-smtp-username>"
EMAIL_PASSWORD="<your-mailgun-smtp-password>"
```

**Amazon SES:**
```bash
EMAIL_HOST="email-smtp.us-east-1.amazonaws.com"
EMAIL_PORT="587"
EMAIL_USER="<your-ses-smtp-username>"
EMAIL_PASSWORD="<your-ses-smtp-password>"
```

### 4. Node Environment
```bash
NODE_ENV="production"
```

---

## Complete Production .env File Example

```bash
# Database (Already configured in Render)
DATABASE_URL="postgresql://guna_sekaran:G06lVmhMYfDkPNv3VMUHkFAT5WUIjanW@dpg-d54nt6muk2gs73bfm4dg-a.virginia-postgres.render.com/chat_db_wqnk"

# NextAuth
NEXTAUTH_URL="https://your-app-name.onrender.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-gmail-app-password"

# Environment
NODE_ENV="production"
```

---

## Setting Environment Variables in Render.com

1. **Go to your Render Dashboard**
2. **Select your app** (chat-app-clon)
3. **Click "Environment"** in the left sidebar
4. **Add each variable:**
   - Click "Add Environment Variable"
   - Enter KEY and VALUE
   - Click "Save Changes"

### Variables to Add in Render:

| Key | Value | Notes |
|-----|-------|-------|
| `NEXTAUTH_URL` | `https://your-app-name.onrender.com` | Replace with your actual Render URL |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | Keep this secret! |
| `EMAIL_HOST` | `smtp.gmail.com` | Or your SMTP provider |
| `EMAIL_PORT` | `587` | Standard SMTP port |
| `EMAIL_USER` | `your-email@gmail.com` | Your email address |
| `EMAIL_PASSWORD` | `your-app-password` | Gmail App Password (16 chars) |
| `NODE_ENV` | `production` | Sets production mode |

---

## Database Migration for Production

Before deploying, you need to add the `PasswordReset` table to your production database:

### Option 1: Using Render Shell (Recommended)

1. In Render Dashboard, go to your PostgreSQL database
2. Click "Connect" → "External Connection"
3. Copy the connection string
4. Create a migration script (already exists: `scripts/create-password-reset-table.js`)
5. Run it against production:

```bash
# Temporarily set production database URL
export DATABASE_URL="your-production-database-url"
node scripts/create-password-reset-table.js
```

### Option 2: Using Prisma Migrate

Alternatively, you can use Prisma's migrate deploy in your build command:

Update your Render build command to:
```bash
npm install && npx prisma generate && npx prisma db push && npm run build
```

---

## Testing Email Functionality in Production

1. **Deploy with email credentials configured**
2. **Test Registration Flow:**
   - Go to `/register`
   - Enter a real email address
   - Check email inbox for OTP code
   - Complete registration

3. **Test Password Reset:**
   - Go to `/login`
   - Click "Forgot password?"
   - Enter email address
   - Check email inbox for reset link
   - Click link and set new password

---

## Security Best Practices

1. ✅ **Never commit `.env` file to Git** (already in `.gitignore`)
2. ✅ **Use strong, unique `NEXTAUTH_SECRET`** (min 32 characters)
3. ✅ **Use Gmail App Passwords**, not your actual password
4. ✅ **Enable 2FA** on your Gmail account
5. ✅ **Rotate credentials** if they're ever exposed
6. ✅ **Use environment variables** in Render, not hardcoded values

---

## Troubleshooting

### Email Not Sending

**Check these:**
1. `EMAIL_USER` and `EMAIL_PASSWORD` are correct
2. Gmail App Password is 16 characters (no spaces)
3. 2FA is enabled on Gmail account
4. Check Render logs for error messages
5. Try sending a test email manually using the same credentials

### OTP Not Appearing in Console

In production (`NODE_ENV=production`), OTPs are only sent via email, not logged to console.

### Reset Link Not Working

1. Check that `NEXTAUTH_URL` is set correctly in production
2. Verify token hasn't expired (1 hour limit)
3. Check browser console for errors
4. Verify `PasswordReset` table exists in production database

---

## Next Steps

1. **Generate `NEXTAUTH_SECRET`:**
   ```bash
   openssl rand -base64 32
   ```

2. **Set up Gmail App Password** (if using Gmail)

3. **Add all environment variables to Render**

4. **Run database migration** to add `PasswordReset` table

5. **Deploy your app** and test both flows

6. **Monitor logs** in Render dashboard for any errors

---

## Support

If you encounter issues:
- Check Render logs: Dashboard → Your App → Logs
- Verify database connection: Ensure `PasswordReset` table exists
- Test locally first with production-like .env settings
- Check email provider's SMTP documentation
