# Quick Deploy Checklist ✅

## 1. Push to GitHub (5 minutes)
```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/jdcb4/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

## 2. Deploy on Vercel (5 minutes)
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repo
4. Add environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `NODE_ENV`: `production`
5. Click "Deploy"
6. Wait 2-3 minutes

## 3. Update CLIENT_URL (2 minutes)
1. After first deployment, get your Vercel URL
2. Go to Project Settings → Environment Variables
3. Add `CLIENT_URL` with your Vercel URL
4. Redeploy

## 4. Test (5 minutes)
- Open your Vercel URL
- Create a game
- Join from another browser/device
- Play a round
- Check if real-time updates work

## ⚠️ If Socket.IO doesn't work:
Tell me and I'll help you switch to Railway (takes 10 min).

---

**Total Time: ~15 minutes** 🚀

Full details in DEPLOYMENT.md

