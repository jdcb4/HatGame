# Deployment Guide

## ⚠️ IMPORTANT: Railway is Production

**This app is deployed on Railway, NOT Vercel.**

Railway is the recommended platform for this Socket.IO-based multiplayer game because:
- ✅ Persistent servers (Socket.IO works perfectly)
- ✅ WebSocket connections work flawlessly
- ✅ Real-time multiplayer with no issues
- ✅ Simple deployment and management

**Vercel is NOT suitable** for this app because serverless functions don't support persistent Socket.IO connections (rooms don't persist between function invocations).

See `RAILWAY_DEPLOY.md` for deployment instructions.

---

# Vercel Deployment Guide (REFERENCE ONLY)

This guide is kept for reference but is **not recommended** for this multiplayer game.

## Prerequisites

1. ✅ GitHub account
2. ✅ Vercel account (free) - Sign up at https://vercel.com
3. ✅ MongoDB Atlas database (you already have this)
4. ✅ Git installed locally

## Preparation (Already Done! ✅)

The following has been configured for you:
- ✅ Socket.IO optimized for serverless (polling transport enabled)
- ✅ `vercel.json` configured with proper routing
- ✅ Server exports for Vercel compatibility
- ✅ `.gitignore` to prevent committing sensitive files
- ✅ `.vercelignore` to exclude unnecessary files from deployment

## Deployment Steps

### Step 1: Push Your Code to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   git init
   ```

2. **Add all files**:
   ```bash
   git add .
   ```

3. **Commit**:
   ```bash
   git commit -m "Prepare for Vercel deployment"
   ```

4. **Create a new repository on GitHub**:
   - Go to https://github.com/new
   - Name it something like `HatGame`
   - Don't initialize with README (you already have files)
   - Click "Create repository"

5. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/jdcb4/HatGame.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Easiest)

1. Go to https://vercel.com and sign in

2. Click **"Add New Project"**

3. Click **"Import Git Repository"**

4. Select your GitHub repository (you may need to grant Vercel access)

5. Configure your project:
   - **Framework Preset**: Leave as "Other" (auto-detected)
   - **Root Directory**: Leave blank (uses root)
   - **Build Command**: Leave default or set to `npm run build`
   - **Output Directory**: Leave default

6. **Add Environment Variables** (IMPORTANT!):
   Click "Environment Variables" and add these:

   | Name | Value |
   |------|-------|
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | Leave blank for now (will set after deployment) |

   Example MongoDB URI format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/thehatgame_db?retryWrites=true&w=majority
   ```

7. Click **"Deploy"**

8. Wait 2-3 minutes for deployment to complete

9. Once deployed, you'll get a URL like: `https://your-project-name.vercel.app`

10. **Update CLIENT_URL** (important for Socket.IO):
    - Go to your project settings in Vercel
    - Navigate to "Environment Variables"
    - Edit `CLIENT_URL` and set it to your deployed URL: `https://your-project-name.vercel.app`
    - Click "Save"
    - Redeploy (Vercel will prompt you)

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? **Your account**
   - Link to existing project? **N**
   - What's your project's name? **word-guesser** (or your choice)
   - In which directory is your code located? **./** (press Enter)

5. **Add environment variables**:
   ```bash
   vercel env add MONGODB_URI
   ```
   Paste your MongoDB connection string when prompted.

   ```bash
   vercel env add NODE_ENV
   ```
   Enter: `production`

6. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Step 3: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-project-name.vercel.app`)

2. **Test the game flow**:
   - ✅ Enter your name
   - ✅ Create a new game
   - ✅ Copy the game ID
   - ✅ Open in incognito/another browser
   - ✅ Join the game with the game ID
   - ✅ Start the game
   - ✅ Play a few rounds
   - ✅ Check if Socket.IO works (real-time updates)

3. **Watch for Socket.IO issues**:
   - ❌ Players disconnecting randomly
   - ❌ Game state not updating in real-time
   - ❌ "Connection timeout" errors
   - ❌ Slow/delayed updates

### Step 4: Monitor and Debug

#### View Logs:
1. Go to your Vercel project dashboard
2. Click "Deployments"
3. Click on your latest deployment
4. Click "Functions" to see serverless function logs
5. Look for any errors

#### Common Issues:

**Issue: Socket.IO connection fails**
- Check that `CLIENT_URL` environment variable is set correctly
- Check browser console for CORS errors
- Socket.IO may be using polling (expected on Vercel)

**Issue: Players disconnect after 10 seconds**
- This is Vercel's serverless limitation
- **Solution**: Switch to Railway (tell me and I'll help)

**Issue: MongoDB connection fails**
- Verify `MONGODB_URI` environment variable is correct
- Check MongoDB Atlas: Network Access allows all IPs (0.0.0.0/0)
- Check Database Access: User has read/write permissions

## Environment Variables Summary

Make sure these are set in Vercel:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/thehatgame_db?retryWrites=true&w=majority
NODE_ENV=production
CLIENT_URL=https://your-project-name.vercel.app
```

## Updating Your Deployment

After making changes locally:

```bash
git add .
git commit -m "Description of changes"
git push
```

Vercel will automatically redeploy! 🚀

## Rollback (if needed)

If something breaks:
1. Go to Vercel dashboard
2. Click "Deployments"
3. Find a previous working deployment
4. Click "⋯" → "Promote to Production"

## Need to Switch to Railway?

If Socket.IO doesn't work well on Vercel (disconnections, timeouts), just let me know and I'll help you set up Railway deployment, which handles WebSockets better.

## Support

If you encounter issues:
1. Check Vercel function logs
2. Check browser console for errors
3. Verify environment variables are set
4. Test locally first with `npm run dev`

---

**Your app is now ready to deploy!** 🎉

Just follow the steps above, and you should have a live game running in about 10 minutes.

