# Deployment Guide

This app uses Socket.io with a custom Node.js server, which requires a platform that supports persistent connections.

## ⚠️ Important: Vercel Not Supported

This app **cannot be deployed to Vercel** because it uses a custom server with Socket.io for real-time messaging. Vercel only supports serverless functions.

## Recommended Platforms

### Option 1: Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `CGunasekaran/chat-app-clon`
4. Add environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Random secret (generate with: `openssl rand -base64 32`)
   - `NEXTAUTH_URL` - Your deployed app URL (e.g., `https://your-app.railway.app`)
   - `NODE_ENV` - `production`
5. Railway will automatically detect the build and start commands
6. Add a PostgreSQL database from Railway's plugin marketplace
7. Deploy!

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: chat-app
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`
5. Add environment variables (same as above)
6. Add a PostgreSQL database from Render's dashboard
7. Deploy!

### Option 3: Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Add PostgreSQL: `heroku addons:create heroku-postgresql:essential-0`
5. Set environment variables:
   ```bash
   heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32)
   heroku config:set NEXTAUTH_URL=https://your-app-name.herokuapp.com
   heroku config:set NODE_ENV=production
   ```
6. Deploy: `git push heroku main`

## Environment Variables Required

```env
DATABASE_URL="postgresql://username:password@host:5432/database"
NEXTAUTH_SECRET="generate-random-secret-key"
NEXTAUTH_URL="https://your-deployed-domain.com"
NODE_ENV="production"
```

## Database Setup

After deployment, you need to push the Prisma schema to your production database:

```bash
npx prisma db push
```

Or if using migrations:

```bash
npx prisma migrate deploy
```

## Creating Admin User

After deployment, you can create an admin user by:

1. Register a user through the app UI
2. Use the database console to update the user:
   ```sql
   UPDATE "User" SET "isAdmin" = true WHERE "email" = 'your-email@example.com';
   ```

Or use the provided script (requires SSH access to your server):

```bash
node scripts/make-admin.js
```

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly formatted
- Check that your database allows connections from your deployment platform
- For Railway: Use the internal DATABASE_URL provided by Railway

### Authentication Not Working
- Verify `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your deployed domain exactly
- Check browser console for CORS errors

### Socket.io Not Connecting
- Ensure your platform supports WebSocket connections
- Check that the app is using the correct protocol (wss:// for HTTPS sites)

## Alternative: Deploy Without Socket.io (Vercel Compatible)

If you must use Vercel, you would need to:
1. Remove the custom server.js
2. Replace Socket.io with polling or webhooks
3. Use Vercel's API routes for real-time updates
4. Consider using Pusher, Ably, or similar services for real-time features

This would require significant code changes.
