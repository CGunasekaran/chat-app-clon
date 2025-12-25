# Migrate from Render Database to Neon

## Step 1: Create Neon Database

1. **Go to [neon.tech](https://neon.tech)**
2. **Sign up** with GitHub (no credit card needed)
3. **Create a new project**:
   - Project name: `whatsapp-clone-db`
   - Region: Choose closest to your users (e.g., US East, Europe)
   - PostgreSQL version: 16 (latest)
4. **Copy the connection string** from the dashboard
   - It looks like: `postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
   - Save this - you'll need it!

---

## Step 2: Export Data from Render Database

Run this command locally to backup your current Render database:

```bash
# Export all data from Render
pg_dump "postgresql://guna_sekaran:TJa2JKCL6xqbfNR8Qs0kX4VnLfJ8lqXo@dpg-d54nt6muk2gs73bfm4dg-a.virginia-postgres.render.com:5432/chat_db_wqnk" > render_backup.sql
```

**Note**: You might need to install `pg_dump` if not already installed:
- **macOS**: `brew install postgresql`
- **Already installed**: Skip this step

---

## Step 3: Import Data to Neon

Once you have your Neon connection string, import the backup:

```bash
# Import to Neon database
psql "YOUR_NEON_CONNECTION_STRING" < render_backup.sql
```

Replace `YOUR_NEON_CONNECTION_STRING` with the one from Neon dashboard.

---

## Step 4: Update Vercel Environment Variables

1. **Go to [vercel.com](https://vercel.com/dashboard)**
2. **Select your project** → Settings → Environment Variables
3. **Update** `DATABASE_URL`:
   - Old value: `postgresql://guna_sekaran:...@dpg-d54nt6muk2gs73bfm4dg-a.virginia-postgres.render.com...`
   - New value: `YOUR_NEON_CONNECTION_STRING`
4. **Click Save**
5. **Redeploy** your app:
   - Go to Deployments tab
   - Click "..." on latest deployment → Redeploy

---

## Step 5: Verify the Migration

After redeployment, test your app:

1. **Login** to your Vercel app
2. **Check if**:
   - ✅ Users can log in
   - ✅ Messages load
   - ✅ New messages can be sent
   - ✅ Groups are visible
   - ✅ Voice calls work

---

## Step 6: Clean Up (Optional)

Once everything works on Neon:

1. **Download a final backup** from Render (just in case)
2. **Delete Render database** to avoid charges after free month
3. **Remove Render service** if no longer needed

---

## Troubleshooting

### If pg_dump fails with connection error:
```bash
# Try with explicit port
pg_dump "postgresql://guna_sekaran:TJa2JKCL6xqbfNR8Qs0kX4VnLfJ8lqXo@dpg-d54nt6muk2gs73bfm4dg-a.virginia-postgres.render.com:5432/chat_db_wqnk?sslmode=require" > render_backup.sql
```

### If import fails with "database not empty":
```bash
# Drop and recreate schema, then import
psql "YOUR_NEON_CONNECTION_STRING" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "YOUR_NEON_CONNECTION_STRING" < render_backup.sql
```

### If Vercel deployment fails:
- Check Vercel logs for database connection errors
- Verify DATABASE_URL is correctly set
- Try manual deployment: `vercel --prod`

---

## Neon Connection Pooling (Recommended)

For better performance with serverless (Vercel), use Neon's pooled connection:

1. In Neon dashboard, copy the **"Pooled connection"** string
2. It has `-pooler` in the hostname: `ep-xxx-xxx-pooler.region.aws.neon.tech`
3. Use this as your `DATABASE_URL` in Vercel

This prevents connection exhaustion issues common with serverless.

---

## Benefits After Migration

✅ **Free forever** - No time limit on database
✅ **Better performance** - Neon is optimized for serverless
✅ **Auto-scaling** - Database scales with usage
✅ **No cold starts** - Faster than Render free tier
✅ **Built-in backups** - Neon keeps daily backups

---

Last Updated: December 25, 2024
