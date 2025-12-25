# Production Database Fix Guide

## Issue
The production app is failing with error: **"The column Message.isPriority does not exist in the current database"**

This happens because the production database has data but is missing the migration history, so new columns haven't been added.

---

## Solution Options (Free Tier Compatible)

### ⭐ **Option 1: Automatic Build-Time Migration (Recommended)**

The build script has been updated to automatically run migrations during deployment.

#### Steps:

1. **Commit and push the changes**
   ```bash
   git add .
   git commit -m "Add automatic database migration on build"
   git push
   ```

2. **Trigger deployment on Render**
   - Go to https://dashboard.render.com
   - Navigate to your web service
   - Click **"Manual Deploy"** → **"Deploy latest commit"**
   - OR just wait for auto-deploy if enabled

3. **Monitor the build logs**
   - Watch for: `prisma db push --skip-generate` in the logs
   - It should show: "Your database is now in sync with your Prisma schema"

4. **Verify the fix**
   - Once deployed, visit your app and test the smart replies feature
   - The database columns will be automatically added! ✅

---

### **Option 2: One-Time API Endpoint (Quick Fix)**

Use the special migration endpoint to fix the database immediately.

#### Steps:

1. **Deploy the API endpoint first**
   ```bash
   git add .
   git commit -m "Add migration API endpoint"
   git push
   ```
   Wait for deployment to complete.

2. **Visit the migration URL** in your browser:
   ```
   https://your-app-name.onrender.com/api/migrate-database?secret=migrate-db-2024
   ```
   
   Replace `your-app-name` with your actual Render app URL.

3. **You should see**:
   ```json
   {
     "success": true,
     "message": "Database migration completed!",
     "results": [
       "✅ Added isPriority column to Message table",
       "✅ Added hasMentions column to Message table",
       ...
     ]
   }
   ```

4. **Optional: Secure the endpoint**
   - Add `MIGRATION_SECRET` environment variable in Render
   - Use it in the URL: `?secret=your-custom-secret`

5. **Optional: Delete the endpoint** after use:
   - Remove `/app/api/migrate-database/route.ts`
   - Commit and push

---

### **Option 2: Baseline the Migration**

If you want to properly record the migration in Prisma's history:

1. **In Render Shell**, mark the migration as applied:
   ```bash
   npx prisma migrate resolve --applied "20251223163253_add_message_priority_and_mentions"
   ```

2. **Then deploy any pending migrations**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Finally, push the schema** (this actually adds the columns):
   ```bash
   npx prisma db push --skip-generate
   ```

---

### **Option 3: Manual SQL (Advanced)**

If the above methods don't work, you can run SQL directly:

1. **Access Render Database Shell**
   - Go to your PostgreSQL database in Render dashboard
   - Click **"Connect"** → **"External Connection"**
   - Use a PostgreSQL client like `psql` or `pgAdmin`

2. **Run these SQL commands**:
   ```sql
   -- Add missing columns to Message table
   ALTER TABLE "Message" 
   ADD COLUMN IF NOT EXISTS "isPriority" BOOLEAN NOT NULL DEFAULT false;

   ALTER TABLE "Message" 
   ADD COLUMN IF NOT EXISTS "hasMentions" BOOLEAN NOT NULL DEFAULT false;

   -- Create Mention table
   CREATE TABLE IF NOT EXISTS "Mention" (
     "id" TEXT NOT NULL,
     "messageId" TEXT NOT NULL,
     "userId" TEXT NOT NULL,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
   );

   -- Add indexes
   CREATE INDEX IF NOT EXISTS "Mention_messageId_idx" ON "Mention"("messageId");
   CREATE INDEX IF NOT EXISTS "Mention_userId_idx" ON "Mention"("userId");

   -- Add foreign keys (only if they don't exist)
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'Mention_messageId_fkey'
     ) THEN
       ALTER TABLE "Mention" 
       ADD CONSTRAINT "Mention_messageId_fkey" 
       FOREIGN KEY ("messageId") REFERENCES "Message"("id") 
       ON DELETE CASCADE ON UPDATE CASCADE;
     END IF;
   END $$;

   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'Mention_userId_fkey'
     ) THEN
       ALTER TABLE "Mention" 
       ADD CONSTRAINT "Mention_userId_fkey" 
       FOREIGN KEY ("userId") REFERENCES "User"("id") 
       ON DELETE CASCADE ON UPDATE CASCADE;
     END IF;
   END $$;
   ```

---

## After Applying the Fix

### 1. **Restart your Render service**
   - Go to your web service in Render dashboard
   - Click **"Manual Deploy"** → **"Clear build cache & deploy"**
   - OR just click **"Restart"** if you only ran the database scripts

### 2. **Test the smart replies feature**
   - Open your production app
   - Send a message and check if smart replies work
   - The error should be gone! ✅

### 3. **Verify in logs**
   - Check Render logs to ensure no more database errors
   - Look for successful API calls to `/api/smart-replies`

---

## Why This Happened

Your production database was created before the `isPriority` and `hasMentions` columns were added. The local database was updated through migrations, but production wasn't.

**The P3005 error** occurs because:
- Production database has tables and data
- But Prisma's `_prisma_migrations` table doesn't have a record of the migration
- Prisma Migrate refuses to run migrations on non-empty databases without a baseline

---

## Prevention for Future

To avoid this in the future:

1. **Always run migrations in production after deploying**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Add a build command** in Render:
   - Go to Settings → Build & Deploy
   - Add post-deploy command: `npx prisma migrate deploy`

3. **Use the deployment checklist** in `DEPLOYMENT.md` before each release

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npx prisma db push --skip-generate` | Force schema sync (quickest) |
| `npx prisma migrate deploy` | Apply pending migrations |
| `npx prisma migrate status` | Check migration status |
| `node scripts/add-missing-columns-production.js` | Run our custom fix script |

---

## Need Help?

If you encounter any issues:

1. Check Render logs for detailed error messages
2. Verify database connection in Render environment variables
3. Ensure `DATABASE_URL` is set correctly
4. Try the "Clear build cache & deploy" option

**Current Production Database:**
- Host: `dpg-d54nt6muk2gs73bfm4dg-a.virginia-postgres.render.com`
- Database: `chat_db_wqnk`
- Port: `5432`

---

Last Updated: December 25, 2024
