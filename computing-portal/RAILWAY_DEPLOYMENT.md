# Railway Deployment Guide

This guide will help you deploy the Computing 7155 Learning Portal to Railway.

## Prerequisites

Before you begin, make sure you have:

1. ✅ A [Railway](https://railway.app) account (sign up with GitHub)
2. ✅ An [Anthropic API key](https://console.anthropic.com/) for the AI tutor
3. ✅ Your project code pushed to a GitHub repository (or use Railway CLI)

## Step-by-Step Deployment

### Step 1: Create a New Railway Project

1. Go to [Railway](https://railway.app) and log in
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your repository (authorize GitHub if needed)
5. Railway will detect the Dockerfile automatically

### Step 2: Add MongoDB Database

1. In your Railway project, click **"New"** → **"Database"** → **"Add MongoDB"**
2. Railway will automatically provision a MongoDB instance
3. Note: Railway will create a `MONGO_URL` environment variable automatically

### Step 3: Configure Environment Variables

Click on your app service, go to the **"Variables"** tab, and add these variables:

#### Required Variables:

```
MONGODB_URI
```
- Click on "New Variable" → "Add Reference" → Select your MongoDB service → Choose `MONGO_URL`
- This automatically links to your Railway MongoDB instance

```
NEXTAUTH_URL
```
- Value: Your Railway app URL (e.g., `https://computing-portal-production.up.railway.app`)
- You can find this in the "Settings" tab after first deployment
- Or set it to `https://${{RAILWAY_PUBLIC_DOMAIN}}` to use Railway's automatic domain

```
NEXTAUTH_SECRET
```
- Generate a secure secret by running this command locally:
  ```bash
  openssl rand -base64 32
  ```
- Copy the output and paste it as the value

```
ANTHROPIC_API_KEY
```
- Get your API key from https://console.anthropic.com/
- Value should look like: `sk-ant-api03-xxxxx...`

#### Optional Variables:

```
JUPYTERHUB_URL
```
- Only needed if you want full Python execution (advanced setup)
- Can be left empty for basic functionality

```
NODE_ENV
```
- Value: `production`
- (Usually set automatically by Railway)

### Step 4: Deploy!

1. After setting all environment variables, Railway will automatically trigger a deployment
2. Watch the build logs in the "Deployments" tab
3. The build process will:
   - Install dependencies
   - Build the Next.js application
   - Create a Docker container
   - Deploy to Railway's infrastructure

### Step 5: Access Your Application

1. Once deployed, go to the "Settings" tab
2. Under "Networking", you'll see your public URL
3. Click the URL to open your learning portal
4. You should see the login/registration page

### Step 6: Test the Deployment

1. Register a new account
2. Test the Python Lab
3. Test the Spreadsheet feature
4. Test the AI Tutor (requires valid Anthropic API key)
5. Check the syllabus browser

## Troubleshooting

### Build Fails

**Problem**: Docker build fails with "MODULE_NOT_FOUND"

**Solution**: Make sure all dependencies are in `package.json` and you have a `package-lock.json` file. Run locally:
```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Database Connection Fails

**Problem**: App crashes with "MongooseError: Connection failed"

**Solution**: 
- Check that `MONGODB_URI` is correctly set to reference the Railway MongoDB service
- Make sure the MongoDB service is running (check its logs)
- Verify the connection string format: `mongodb://...`

### NextAuth Errors

**Problem**: "NEXTAUTH_URL environment variable not set"

**Solution**: Make sure `NEXTAUTH_URL` is set to your full Railway app URL including `https://`

### AI Tutor Not Working

**Problem**: AI Tutor returns errors or doesn't respond

**Solution**: 
- Verify your `ANTHROPIC_API_KEY` is valid
- Check your Anthropic API credits at https://console.anthropic.com/
- Look at the Railway logs for specific error messages

### Viewing Logs

To debug any issues:
1. Go to your app service in Railway
2. Click on "Deployments"
3. Click on the latest deployment
4. View the build logs and runtime logs

## Custom Domain (Optional)

To add your own domain:

1. Go to your app service → "Settings"
2. Under "Networking", click "Add Custom Domain"
3. Enter your domain (e.g., `computing.yourdomain.com`)
4. Add the provided DNS records to your domain registrar
5. Wait for DNS propagation (can take up to 48 hours)

## Updating Your Application

To deploy updates:

1. Push changes to your GitHub repository
2. Railway will automatically detect the changes
3. A new deployment will trigger automatically
4. You can also manually trigger deployments from the Railway dashboard

## Cost Considerations

Railway offers:
- **Starter Plan**: $5/month credit (good for small projects)
- **Developer Plan**: $20/month credit (recommended for production)

Typical monthly usage for this app:
- Next.js app: ~$3-5/month
- MongoDB: ~$2-5/month
- Total: ~$5-10/month depending on traffic

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | ✅ Yes | MongoDB connection string | Reference to Railway MongoDB |
| `NEXTAUTH_URL` | ✅ Yes | Your app's public URL | `https://your-app.railway.app` |
| `NEXTAUTH_SECRET` | ✅ Yes | Secret for session encryption | Generate with OpenSSL |
| `ANTHROPIC_API_KEY` | ✅ Yes | API key for AI tutor | From Anthropic console |
| `JUPYTERHUB_URL` | ❌ No | JupyterHub endpoint (advanced) | Can be omitted |
| `NODE_ENV` | ❌ No | Node environment | `production` (auto-set) |

## Support

If you encounter issues:

1. Check Railway's [documentation](https://docs.railway.app/)
2. Review the build and runtime logs in Railway
3. Verify all environment variables are correctly set
4. Test the application locally with the same environment variables

## Next Steps

After successful deployment:

1. **Seed Initial Data** (if needed): Create a Railway cron job or one-off script to run `npm run seed`
2. **Monitor Usage**: Check Railway dashboard for resource usage
3. **Set Up Backups**: Configure MongoDB backups in Railway
4. **Add Custom Domain**: Follow the custom domain steps above
5. **Enable HTTPS**: Railway provides SSL automatically

---

Happy teaching! 🎓

