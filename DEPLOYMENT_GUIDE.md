# Deployment Guide for GitHub Pages + Railway

This guide will help you deploy your Family Memories website with:
- **Frontend** on GitHub Pages (mrtag.com)
- **Backend** on Railway (free hosting)

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Login" and sign in with GitHub
3. Authorize Railway to access your GitHub repositories

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `GladneyFamilyMemories` repository
4. Railway will detect it's a Python project

### Step 3: Configure the Service
1. Click on the deployed service
2. Go to "Settings" tab
3. Under "Deploy", set:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 4: Get Your Backend URL
1. Go to "Settings" tab
2. Under "Networking" section, click "Generate Domain"
3. Copy the generated URL (something like: `https://your-app.up.railway.app`)
4. **SAVE THIS URL** - you'll need it for the frontend!

### Step 5: Create Admin User
1. In Railway, go to your service
2. Click on "Variables" tab
3. We'll run a command to create your admin user:
   - Go to the "Deployments" tab
   - Find the latest deployment
   - Click on it and look for logs
   - We need to access the Railway CLI or use the one-time setup endpoint (see Option B below)

**Option A: Using Railway CLI** (requires installing Railway CLI on your computer)
```bash
railway login
railway link
railway run python make_admin.py create TAG1 tgladney@gmail.com YOUR_PASSWORD "Tom Gladney"
```

**Option B: One-time Setup Endpoint** (easier - I'll create this for you)
- I'll add a special endpoint you can visit once to create your admin account
- After using it once, we'll remove it for security

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Create Environment File
Create a file `.env.production` in the `frontend` folder with:
```
VITE_API_URL=https://your-app.up.railway.app
```
Replace `https://your-app.up.railway.app` with YOUR Railway URL from Part 1, Step 4

### Step 2: Update GitHub Pages Configuration
Your frontend is already set up for GitHub Pages deployment.

### Step 3: Deploy
1. Commit all changes:
   ```bash
   git add .
   git commit -m "Configure for Railway backend deployment"
   git push
   ```

2. Deploy frontend to GitHub Pages:
   ```bash
   cd frontend
   npm run build
   npm run deploy
   ```

## Part 3: Verify Everything Works

1. Visit https://mrtag.com
2. Try logging in with:
   - Username: TAG1
   - Password: (the password you set in Part 1, Step 5)

## Troubleshooting

### Backend not responding
- Check Railway logs in the "Deployments" tab
- Make sure the domain was generated in Railway settings
- Verify CORS settings include your frontend URL

### Frontend can't connect to backend
- Check that `.env.production` has the correct Railway URL
- Rebuild and redeploy frontend
- Check browser console for errors

### Can't log in
- Make sure you created the admin user (Part 1, Step 5)
- Check Railway logs for authentication errors

## Need Help?
If you get stuck, let me know which step you're on and what error you're seeing!
