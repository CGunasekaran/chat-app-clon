# Email Setup Guide for Production

## Problem: Gmail SMTP Connection Timeout

Gmail blocks SMTP connections from cloud servers (like Render) even with App Passwords. This causes `ETIMEDOUT` errors.

## ✅ SOLUTION: Use Resend (Recommended)

Resend is the easiest and most reliable option for Next.js apps on Render.

### Step 1: Sign up for Resend

1. Go to https://resend.com/signup
2. Sign up for FREE account (3,000 emails/month free)
3. Verify your email address

### Step 2: Create API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name it: "Chat App Production"
4. Copy the API key (starts with `re_...`)

### Step 3: Add Domain (Optional but Recommended)

**Option A: Use Resend's test domain (Quick Start)**
- From: `onboarding@resend.dev`
- No setup needed, works immediately
- Limited to 100 emails/day

**Option B: Add your own domain (Recommended for production)**
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records shown (MX, TXT for SPF, TXT for DKIM)
5. Wait for verification (usually < 5 minutes)
6. Use: `noreply@yourdomain.com` as sender

### Step 4: Update Environment Variables in Render

1. Go to your Render Dashboard
2. Select your Chat App service
3. Go to "Environment" tab
4. Update these variables:

```
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USER=resend
EMAIL_PASSWORD=re_YourAPIKeyHere
EMAIL_FROM=onboarding@resend.dev
```

**If using your own domain:**
```
EMAIL_FROM=noreply@yourdomain.com
```

### Step 5: Redeploy

Click "Manual Deploy" → "Deploy latest commit" in Render

---

## Alternative: SendGrid (If you prefer)

### Step 1: Sign up for SendGrid

1. Go to https://signup.sendgrid.com/
2. Free tier: 100 emails/day forever
3. Verify your email and phone number

### Step 2: Create API Key

1. Go to Settings → API Keys
2. Create API Key with "Full Access"
3. Copy the key (starts with `SG.`)

### Step 3: Verify Sender Identity

1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter your email address
4. Check your email and verify

### Step 4: Update Environment Variables

```
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.YourAPIKeyHere
EMAIL_FROM=your-verified-email@gmail.com
```

---

## Testing Email Delivery

After updating environment variables and redeploying:

1. Go to https://chat-app-o97w.onrender.com/register
2. Enter your email
3. Click "Send Verification Code"
4. Check Render logs - you should see:
   ```
   🔐 OTP for youremail@example.com: 123456
   ✅ OTP email sent successfully to youremail@example.com (MessageID: ...)
   ```
5. Check your inbox (and spam folder)

---

## Current Issue (Gmail)

```
❌ Error sending OTP email: Error: Connection timeout
  code: 'ETIMEDOUT'
  command: 'CONN'
```

**Why this happens:**
- Gmail's SMTP blocks connections from cloud servers
- Even with App Passwords, Gmail flags Render's IP as suspicious
- Gmail is designed for personal use, not transactional emails

**Why Resend/SendGrid works:**
- Purpose-built for transactional emails
- Whitelisted by email providers
- Better deliverability (99%+ inbox rate)
- No connection timeouts
- Built for cloud platforms

---

## Quick Comparison

| Provider | Free Tier | Setup Time | Reliability |
|----------|-----------|------------|-------------|
| **Resend** | 3,000/month | 5 minutes | ⭐⭐⭐⭐⭐ |
| **SendGrid** | 100/day | 10 minutes | ⭐⭐⭐⭐ |
| Gmail SMTP | Unlimited* | 5 minutes | ⭐ (blocks cloud) |

*Gmail limits: 500/day, often blocked on cloud servers

---

## Recommended: Use Resend

For the fastest setup with best results:

1. Sign up at https://resend.com
2. Create API key
3. Update Render env vars:
   ```
   EMAIL_HOST=smtp.resend.com
   EMAIL_PORT=587
   EMAIL_USER=resend
   EMAIL_PASSWORD=re_YourAPIKey
   EMAIL_FROM=onboarding@resend.dev
   ```
4. Redeploy

**Total time: 5 minutes**
**Success rate: 99.9%**
