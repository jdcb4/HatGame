# Railway Deployment Guide for The Hat Game

Railway provides **persistent servers** which work perfectly with Socket.IO.

## Why Railway?
- ✅ **Persistent WebSocket connections** (Socket.IO works perfectly)
- ✅ **Always-on server** (no cold starts)
- ✅ **Simple deployment** (auto-detects your setup)
- ✅ **Free $5/month credits** (enough for testing)
- ✅ **Real-time multiplayer works flawlessly**

---

## Step 1: Create Railway Account (2 minutes)

1. Go to **https://railway.app**
2. Click **"Login"** or **"Start a New Project"**
3. Sign in with **GitHub** (easiest option)
4. You'll get **$5 free credits per month** (requires payment method, but won't be charged unless you exceed free tier)

---

## Step 2: Deploy from GitHub (5 minutes)

### Option A: Via Railway Dashboard (Recommended)

1. On Railway dashboard, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Grant Railway access to your GitHub if prompted
4. Select **"HatGame"** repository
5. Railway will automatically detect your Node.js app
6. Click **"Deploy Now"**

### Railway will automatically:
- Install dependencies (`npm install`)
- Build the client (`npm run build`)
- Start the server (`npm start`)

---

## Step 3: Add Environment Variables (3 minutes)

1. Once deployed, click on your project
2. Click the **"Variables"** tab
3. Click **"New Variable"** and add these:

```
MONGODB_URI=your_mongodb_atlas_connection_string_with_thehatgame_db
NODE_ENV=production
PORT=3002
```

**Example MongoDB URI format:**
```
mongodb+srv://username:password@cluster.mongodb.net/thehatgame_db?retryWrites=true&w=majority
```

4. Click **"Add"** for each variable

**Note:** `CLIENT_URL` will be set after we get your Railway URL

---

## Step 4: Get Your Railway URL (1 minute)

1. In your project, click on the **deployment**
2. Click **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Generate Domain"**
5. Railway will give you a URL like: `https://your-app.up.railway.app`
6. Copy this URL

---

## Step 5: Set CLIENT_URL (2 minutes)

1. Go back to **"Variables"** tab
2. Click **"New Variable"**
3. Add:
   - **Name**: `CLIENT_URL`
   - **Value**: Your Railway URL (e.g., `https://thehatgame-production.up.railway.app`)
4. Click **"Add"**
5. Railway will automatically redeploy with the new variable

---

## Step 6: Test Your Game! (5 minutes)

1. Visit your Railway URL
2. Create a game as Player 1
3. Open incognito/another browser
4. Join the game as Player 2
5. **Watch the player list update in real-time!** 🎉
6. Start the game and play

### Expected Results:
- ✅ Players see each other join immediately
- ✅ Game state syncs in real-time
- ✅ No disconnections
- ✅ Smooth gameplay
- ✅ Socket.IO works perfectly!

---

## Troubleshooting

### If deployment fails:
1. Check Railway build logs (click "Deployments" → latest deployment → "View Logs")
2. Make sure all environment variables are set
3. Check MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

### If app loads but doesn't work:
1. Check browser console for errors
2. Verify `CLIENT_URL` matches your Railway domain exactly
3. Check Railway app logs for server errors

---

## Cost Estimate

**Free Tier:**
- $5 credit per month
- ~550 hours of runtime
- For testing with 4 people occasionally: **FREE**

**If you exceed free tier:**
- ~$5-10/month for a small app with light usage
- You'll get email warnings before being charged

---

## Updating Your App

After making changes locally:

```bash
git add .
git commit -m "Your changes"
git push
```

Railway automatically redeploys on every push! 🚀

---

## You're Ready!

Once deployed to Railway, your game will work perfectly with multiple players in real-time! 🎮

**Next Steps:**
1. Sign up at https://railway.app
2. Deploy from GitHub
3. Add environment variables
4. Generate domain
5. Test with friends!

Total time: ~15 minutes

