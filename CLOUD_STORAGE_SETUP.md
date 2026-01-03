# Cloud Storage Setup Guide

This guide will help you set up Cloudflare R2 for persistent file storage, so your photos and files don't disappear when the app redeploys.

## Why Cloud Storage?

Render (and similar platforms) use **ephemeral storage** - any files uploaded to the filesystem are deleted when your service restarts or redeploys. Cloud storage solves this by storing files externally.

## Option 1: Cloudflare R2 (Recommended)

Cloudflare R2 is S3-compatible storage with:
- **10 GB free storage**
- No egress fees (unlike AWS S3)
- Very affordable pricing after free tier
- Easy setup

### Step-by-Step Setup:

#### 1. Create Cloudflare Account & R2 Bucket

1. Go to https://dash.cloudflare.com/
2. Sign up or log in
3. Click **R2** in the left sidebar (under "Storage")
4. Click **Create bucket**
5. Name your bucket: `gladneyfamilymemories` (or any name you prefer)
6. Click **Create bucket**

#### 2. Create API Token

1. In R2, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Give it a name: `GladneyFamilyMemories Upload`
4. Set permissions: **Admin Read & Write**
5. (Optional) You can restrict it to your specific bucket for better security
6. Click **Create API Token**

7. **IMPORTANT**: Copy these values immediately (you won't see them again):
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint URL** (looks like: `https://xxxxx.r2.cloudflarestorage.com`)

#### 3. Configure Your App on Render

1. Go to https://dashboard.render.com
2. Select your **GladneyFamilyMemories** service
3. Click **Environment** in the left sidebar
4. Add these environment variables:

```
USE_CLOUD_STORAGE = true
S3_ENDPOINT_URL = https://xxxxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID = your-access-key-here
S3_SECRET_ACCESS_KEY = your-secret-key-here
S3_BUCKET_NAME = gladneyfamilymemories
```

5. Click **Save Changes**

Your service will automatically redeploy with cloud storage enabled!

#### 4. (Optional) Set Up Custom Domain

To serve files from your own domain (like `files.gladneyfamilytree.com`):

1. In Cloudflare R2, go to your bucket settings
2. Click **Settings** → **Public access**
3. Enable **Public access** (or configure specific access rules)
4. Set up a custom domain in Cloudflare:
   - Go to your Cloudflare DNS settings
   - Add a CNAME record pointing to your R2 bucket
5. Add to Render environment variables:
   ```
   S3_PUBLIC_URL = https://files.gladneyfamilytree.com
   ```

---

## Option 2: AWS S3

If you prefer AWS S3 instead:

1. Create an S3 bucket in AWS Console
2. Create an IAM user with S3 permissions
3. Set these environment variables on Render:

```
USE_CLOUD_STORAGE = true
S3_ENDPOINT_URL = https://s3.amazonaws.com  (or leave blank for default)
S3_ACCESS_KEY_ID = your-aws-access-key
S3_SECRET_ACCESS_KEY = your-aws-secret-key
S3_BUCKET_NAME = your-bucket-name
S3_PUBLIC_URL = https://your-bucket.s3.amazonaws.com  (optional)
```

---

## Testing

After setup:

1. Upload a photo to your Photo Gallery
2. Redeploy your app on Render
3. Check if the photo is still there - it should persist!

---

## Troubleshooting

### Photos still disappearing?
- Check that `USE_CLOUD_STORAGE=true` is set in Render environment variables
- Verify your API credentials are correct
- Check Render logs for any error messages about S3/R2

### Upload errors?
- Verify the endpoint URL is correct
- Check that your API token has read & write permissions
- Ensure the bucket name matches exactly

### Need help?
Open an issue on the repository with your error logs (remove any sensitive credentials first!)
