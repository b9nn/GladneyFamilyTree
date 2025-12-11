# Step-by-Step Deployment Guide for MrTag.com
## Railway (Backend) + Namecheap (Frontend)

This guide will walk you through deploying your Gladney Family Memories website to your mrtag.com domain.

---

## PART 1: Deploy Backend to Railway (Free)

### Step 1: Create Railway Account
1. Open your web browser and go to: **https://railway.app**
2. Click the **"Login"** button in the top right
3. Click **"Login with GitHub"**
4. Log in with your GitHub account (or create one if you don't have it)
5. Authorize Railway to access your repositories

### Step 2: Push Your Code to GitHub
Before Railway can deploy your code, it needs to be on GitHub.

1. Open your web browser and go to: **https://github.com**
2. Click the **"+"** icon in the top right, then **"New repository"**
3. Name it: **GladneyFamilyMemories**
4. Make it **Private** (keep your family data private!)
5. Click **"Create repository"**
6. **Keep this page open** - you'll need the commands shown

Now, in your terminal (I'll help you with this):
```bash
cd /Users/tomgladney1/GladneyFamilyMemories
git add .
git commit -m "Prepare for deployment"
git remote add origin https://github.com/YOUR-USERNAME/GladneyFamilyMemories.git
git push -u origin main
```

### Step 3: Create New Project on Railway
1. Go back to **https://railway.app**
2. Click **"New Project"** button
3. Click **"Deploy from GitHub repo"**
4. Find and click on **GladneyFamilyMemories** repository
5. Railway will start deploying automatically

### Step 4: Configure Railway Settings
1. Once deployed, click on your service (should say "GladneyFamilyMemories")
2. Click the **"Settings"** tab
3. Scroll down to **"Environment"** section
4. Click **"Add Variable"** and add these one by one:
   - Variable: `PORT` Value: `8000`
   - Variable: `SECRET_KEY` Value: `your-super-secret-random-string-change-this-123456`
   - Variable: `PYTHONUNBUFFERED` Value: `1`

### Step 5: Generate Railway Domain
1. Still in Settings tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. You'll see a URL like: `gladneyfamilymemories-production.up.railway.app`
5. **COPY THIS URL** - write it down! You'll need it for the frontend

### Step 6: Verify Backend is Running
1. Click the **"Deployments"** tab
2. Wait for deployment to show **"Success"** (green checkmark)
3. Click on the deployment to see logs
4. If you see "Application startup complete", it's working!
5. Test it: Open browser and go to: `https://YOUR-RAILWAY-URL/docs`
   - You should see the API documentation page

---

## PART 2: Build and Deploy Frontend to Namecheap

### Step 7: Create Environment File for Production
On your computer, create a file that tells your frontend where the backend is.

Create file: `/Users/tomgladney1/GladneyFamilyMemories/frontend/.env.production`

Content:
```
VITE_API_URL=https://YOUR-RAILWAY-URL
```

**Replace `YOUR-RAILWAY-URL`** with the Railway domain from Step 5 (without /docs at the end)

Example:
```
VITE_API_URL=https://gladneyfamilymemories-production.up.railway.app
```

### Step 8: Build Your Frontend
I'll run these commands for you in terminal:
```bash
cd /Users/tomgladney1/GladneyFamilyMemories/frontend
npm install
npm run build
```

This creates a `dist` folder with your website files.

### Step 9: Upload to Namecheap Hosting

#### Option A: Using Namecheap File Manager (Easiest - Click Only)
1. Log into **https://namecheap.com**
2. Click **"Hosting List"** in the left sidebar
3. Find your hosting plan and click **"Go to cPanel"** or **"Manage"**
4. Look for **"File Manager"** icon and click it
5. Navigate to **public_html** folder
6. **Delete everything** in public_html (select all, click Delete)
7. Click **"Upload"** button at the top
8. Click **"Select File"** and navigate to:
   `/Users/tomgladney1/GladneyFamilyMemories/frontend/dist`
9. Select **ALL files and folders** inside dist folder
10. Click **"Open"** to upload
11. Wait for upload to complete

#### Option B: Using FTP (Alternative)
1. Download FileZilla from: https://filezilla-project.org
2. In Namecheap cPanel, find **"FTP Accounts"**
3. Note your:
   - FTP Server (usually: ftp.mrtag.com)
   - Username
   - Password (you can reset if needed)
4. Open FileZilla
5. Enter FTP details at top and click "Quickconnect"
6. On right side, navigate to `/public_html`
7. Delete everything in public_html
8. On left side, navigate to: `/Users/tomgladney1/GladneyFamilyMemories/frontend/dist`
9. Select all files in dist folder
10. Drag them to the right side (public_html folder)
11. Wait for upload

### Step 10: Configure Domain (if needed)
Your mrtag.com should already be pointing to your Namecheap hosting, but verify:

1. In Namecheap account, go to **"Domain List"**
2. Click **"Manage"** next to mrtag.com
3. Click **"Advanced DNS"** tab
4. Make sure you have:
   - Type: **A Record**, Host: **@**, Value: (your hosting IP)
   - Type: **CNAME Record**, Host: **www**, Value: **mrtag.com**

If you're not sure, don't change anything - it's probably already correct!

---

## PART 3: Create Your Admin User

### Step 11: Access Railway Console
1. Go to Railway dashboard: **https://railway.app**
2. Click on your **GladneyFamilyMemories** project
3. Click on the service
4. At the top, you should see **"View Logs"** - click it
5. Look for a line that says "Application startup complete"

### Step 12: Create Admin User Using API
Since Railway doesn't give easy console access, I've created an API endpoint you can use.

1. Open browser and go to: `https://YOUR-RAILWAY-URL/docs`
2. Look for **POST /api/auth/register** endpoint
3. Click on it to expand
4. Click **"Try it out"**
5. Fill in:
   ```json
   {
     "username": "TAG1",
     "password": "YOUR-PASSWORD-HERE",
     "email": "tgladney@gmail.com",
     "full_name": "Tom Gladney",
     "invite_code": "FAMILY2024"
   }
   ```
6. Click **"Execute"**

**BUT WAIT** - This won't work yet because you need an invite code first!

Let me create a special setup script for you...

---

## PART 4: First-Time Setup

I'll create a one-time setup endpoint that you can use to create your first admin user. After using it once, we'll remove it for security.

### Step 13: Test Your Website
1. Open browser and go to: **https://mrtag.com**
2. You should see your Family Memories website!
3. Try logging in with the username and password you created

---

## Troubleshooting

### Problem: Website shows "Cannot connect to server"
**Solution**:
- Make sure Railway deployment is successful (green checkmark)
- Check that `.env.production` has correct Railway URL
- Rebuild frontend with: `npm run build`
- Re-upload to Namecheap

### Problem: Can't log in
**Solution**:
- Make sure you created admin user in Railway
- Check Railway logs for errors
- Try resetting password

### Problem: Photos/files not uploading
**Solution**:
- Check Railway logs when uploading
- Make sure Railway has enough storage (free tier has limits)
- You may need to upgrade Railway plan for more storage

### Problem: Website is slow
**Solution**:
- Railway free tier can sleep after inactivity
- First request wakes it up (may take 30 seconds)
- Consider upgrading Railway for better performance

---

## Important Notes

1. **Railway Free Tier Limits**:
   - Service may sleep after inactivity
   - 500 hours per month of uptime
   - $5/month for always-on service

2. **Backups**:
   - Railway doesn't automatically backup your database
   - Periodically download your SQLite database
   - Keep backups of uploaded photos

3. **Security**:
   - Change SECRET_KEY in Railway settings
   - Use strong passwords
   - Only share invite codes with family

4. **Future Updates**:
   - To update website: rebuild frontend and re-upload to Namecheap
   - To update backend: push to GitHub, Railway auto-deploys

---

## Next Steps After Deployment

Once everything is running:
1. Create invite codes for family members
2. Test all features (photos, vignettes, audio, files)
3. Upload your first family photos!
4. Share mrtag.com with family members

**Need help with any step? Let me know which step you're on and what's happening!**
