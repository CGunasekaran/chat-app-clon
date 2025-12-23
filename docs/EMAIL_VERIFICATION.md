# Email Verification with OTP

This document explains the email verification feature implemented in the registration flow.

## Overview

Users must verify their email address using a One-Time Password (OTP) before completing registration. This ensures that only users with valid email addresses can create accounts.

## Registration Flow

### Step 1: Email Submission
1. User enters their email address on the registration page
2. System checks if the email is already registered
3. If valid, a 6-digit OTP is generated and sent to the email
4. OTP expires in 10 minutes

### Step 2: OTP Verification
1. User receives the OTP via email
2. User enters the 6-digit code on the verification page
3. System validates the OTP
4. If correct, user proceeds to complete registration
5. A 60-second countdown prevents OTP spam

### Step 3: Complete Registration
1. User enters their full name and password
2. System creates the user account
3. Verified email records are cleaned up
4. User is automatically logged in and redirected to chat

## Technical Implementation

### Database Model

```prisma
model EmailVerification {
  id        String   @id @default(cuid())
  email     String
  otp       String
  createdAt DateTime @default(now())
  expiresAt DateTime
  verified  Boolean  @default(false)
  
  @@index([email])
}
```

### API Endpoints

#### 1. Send OTP: `POST /api/auth/send-otp`
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

**Features:**
- Generates a 6-digit random OTP
- Deletes any existing unverified OTPs for the email
- Sends HTML email with styled OTP display
- OTP valid for 10 minutes

#### 2. Verify OTP: `POST /api/auth/verify-otp`
**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

**Validation:**
- Checks if OTP matches
- Verifies OTP hasn't expired
- Marks verification as completed

#### 3. Register: `POST /api/auth/register`
**Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

**Enhanced Validation:**
- Requires verified email (must have completed OTP verification)
- Verification must be less than 1 hour old
- Cleans up verification records after successful registration

### Email Service

Located in `lib/email.ts`, uses Nodemailer for sending emails.

**Development Mode:**
- Logs OTP to console for easy testing
- Skips actual email sending if credentials not configured

**Production Mode:**
- Sends HTML-formatted emails via SMTP
- Styled OTP display in email
- Professional email template

### UI Components

**Progress Indicator:**
- 3-step visual progress bar
- Shows current step (Email → Verify → Details)

**OTP Input:**
- Large, centered 6-digit input field
- Automatic formatting (numbers only)
- Resend timer (60 seconds)

**Security Features:**
- Email uniqueness check before sending OTP
- OTP expiration (10 minutes)
- Verification expiration for registration (1 hour)
- Rate limiting via resend timer

## Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-specific-password"
```

### Gmail Setup

1. Enable 2-Factor Authentication on your Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use the generated 16-character password in `EMAIL_PASSWORD`

### Other Email Providers

- **Outlook/Office365:** `smtp.office365.com:587`
- **Yahoo:** `smtp.mail.yahoo.com:465`
- **SendGrid:** `smtp.sendgrid.net:587`
- **Mailgun:** `smtp.mailgun.org:587`

## Testing

### Development Testing

When email credentials are not configured:
1. Start the development server
2. Navigate to the registration page
3. Enter an email address
4. Check the terminal console for the OTP
5. Copy and paste the OTP from console

### Production Testing

1. Configure email credentials in environment variables
2. Test with a real email address
3. Check spam folder if email not received
4. Verify OTP expiration (10 minutes)
5. Test resend functionality

## Security Considerations

1. **OTP Expiration:** 10-minute window prevents replay attacks
2. **Single Use:** OTPs are deleted after successful registration
3. **Verification Window:** Email verification valid for 1 hour before registration
4. **Rate Limiting:** 60-second resend timer prevents spam
5. **Automatic Cleanup:** Old verification records are removed

## Error Handling

### Common Errors

- `"Valid email is required"`: Email format invalid
- `"User with this email already exists"`: Email already registered
- `"Invalid OTP"`: OTP incorrect or already used
- `"OTP has expired"`: More than 10 minutes since OTP sent
- `"Email not verified"`: Attempting registration without OTP verification
- `"Email verification expired"`: More than 1 hour since OTP verification

## Database Cleanup

The system automatically:
- Deletes unverified OTPs when new OTP is requested
- Removes all verification records after successful registration
- Expired OTPs remain in database but are rejected during verification

Consider adding a scheduled job to clean up expired records periodically.

## UI/UX Features

1. **Step Indicator:** Visual progress through registration
2. **Email Confirmation:** Shows entered email during verification
3. **Auto-formatting:** OTP input accepts only 6 digits
4. **Countdown Timer:** Shows time until resend available
5. **Loading States:** Disabled buttons during API calls
6. **Error Display:** Clear error messages with icons

## Migration from Old System

If you have existing users without email verification:
1. Existing users can still log in normally
2. They are not required to verify their email retroactively
3. Only new registrations require verification
4. Consider adding email verification for existing users as a separate feature

## Future Enhancements

Potential improvements:
- Email template customization
- SMS-based OTP as alternative
- Configurable OTP length
- Remember verified emails for re-registration
- Email change verification for existing users
- Batch cleanup job for expired verifications
