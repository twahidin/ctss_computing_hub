# 🚂 Quick Start: Deploy to Railway in 10 Minutes

This is the fastest way to get your Computing Portal running on Railway.

## Method 1: Using Railway Dashboard (Recommended for Beginners)

### Step 1: Prepare Your API Key (2 minutes)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up/login and create an API key
3. Copy the key (starts with `sk-ant-api03-`)

### Step 2: Deploy to Railway (3 minutes)

1. Go to [Railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose this repository
5. Railway will detect the Dockerfile and start building

### Step 3: Add MongoDB (1 minute)

1. In your Railway project, click **"New"**
2. Select **"Database"** → **"Add MongoDB"**
3. Railway provisions a MongoDB instance automatically

### Step 4: Configure Environment Variables (4 minutes)

Click on your web service → **"Variables"** tab → Add these:

#### 1. MONGODB_URI
- Click **"New Variable"** → **"Add Reference"**
- Select your MongoDB service → Choose `MONGO_URL`

#### 2. NEXTAUTH_SECRET
Generate locally:
```bash
openssl rand -base64 32
```
Copy the output and paste as the value

#### 3. ANTHROPIC_API_KEY
Paste your Anthropic API key from Step 1

#### 4. NEXTAUTH_URL
- First deployment: Use `https://${{RAILWAY_PUBLIC_DOMAIN}}`
- After deployment: Update to your actual URL (e.g., `https://computing-portal-production.up.railway.app`)

### Step 5: Deploy & Test! ✅

1. Railway will automatically redeploy with new variables
2. Wait for build to complete (~2-3 minutes)
3. Click on your app URL in Railway dashboard
4. Register an account and test features!

---

## Method 2: Using Railway CLI (For Advanced Users)

### Prerequisites
```bash
# Install Railway CLI
npm install -g @railway/cli

# Or with Homebrew
brew install railway
```

### Quick Deploy
```bash
# 1. Login to Railway
railway login

# 2. Initialize project
railway init

# 3. Add MongoDB (do this in Railway dashboard)

# 4. Set environment variables
railway variables set ANTHROPIC_API_KEY="your-key-here"
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
# Link MONGODB_URI in dashboard to MongoDB service

# 5. Deploy
railway up

# 6. Open your app
railway open
```

---

## Method 3: One-Click Deploy (Coming Soon)

Click this button to deploy with one click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/computing-portal)

---

## Verify Deployment

After deployment, test these features:

✅ **Registration/Login**
- Go to your app URL
- Register a new account
- Login successfully

✅ **Python Lab**
- Navigate to Python Lab
- Write and run simple Python code
- Check output appears

✅ **Spreadsheet**
- Open Spreadsheet feature
- Create a simple formula
- Verify it calculates correctly

✅ **AI Tutor**
- Go to AI Tutor page
- Ask a question like "What is a variable?"
- Verify you get a response

✅ **Syllabus**
- Browse syllabus modules
- Check content loads properly

---

## Common Issues & Quick Fixes

### Build Fails
**Error**: "Cannot find module..."
```bash
# Locally, ensure package-lock.json exists
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Database Connection Error
**Error**: "MongooseError: Connection failed"
- Go to Variables tab
- Verify `MONGODB_URI` is a **reference** to your MongoDB service
- Don't manually type the connection string

### NextAuth Error
**Error**: "NEXTAUTH_URL must be provided"
- Make sure `NEXTAUTH_URL` is set
- Use your full Railway URL with `https://`
- Update after first deployment if using `${{RAILWAY_PUBLIC_DOMAIN}}`

### AI Tutor Not Working
**Error**: "Invalid API key" or no response
- Check `ANTHROPIC_API_KEY` is correct
- Verify you have credits at https://console.anthropic.com/
- Check Railway logs for detailed error

---

## View Logs

**In Railway Dashboard:**
1. Click on your service
2. Go to "Deployments" tab
3. Click latest deployment
4. View build and runtime logs

**Using CLI:**
```bash
railway logs
```

---

## Update Your App

**Automatic (Recommended):**
- Push to GitHub
- Railway auto-deploys

**Manual:**
```bash
railway up
```

---

## Cost Estimate

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month credit (good for testing)
- **Developer Plan**: $20/month credit (recommended)

Typical usage:
- Next.js app: ~$3-5/month
- MongoDB: ~$2-5/month
- **Total**: ~$5-10/month

---

## Next Steps

After successful deployment:

1. ✅ **Custom Domain**: Add your own domain in Railway settings
2. ✅ **Monitoring**: Set up Railway monitoring/alerts
3. ✅ **Backups**: Configure MongoDB backups
4. ✅ **Seed Data**: Run `npm run seed` to add initial course content
5. ✅ **Invite Users**: Share your app URL with students!

---

## Support & Resources

- 📚 [Full Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- ✅ [Deployment Checklist](./DEPLOY_CHECKLIST.md)
- 🚂 [Railway Docs](https://docs.railway.app/)
- 🤖 [Anthropic Docs](https://docs.anthropic.com/)

---

## Need Help?

1. Check the logs in Railway dashboard
2. Review [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed troubleshooting
3. Verify all environment variables are set correctly
4. Test locally first with Docker: `docker-compose up`

---

**Happy Teaching! 🎓**

