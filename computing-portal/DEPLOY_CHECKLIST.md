# Railway Deployment Checklist

Use this checklist to ensure a smooth deployment to Railway.

## Pre-Deployment Checklist

- [ ] Code is pushed to GitHub repository
- [ ] All dependencies are in `package.json`
- [ ] Have Anthropic API key ready
- [ ] Have Railway account (with GitHub connected)

## Railway Setup Checklist

- [ ] **Create Project**: New Project → Deploy from GitHub
- [ ] **Add MongoDB**: New → Database → Add MongoDB
- [ ] **Set Environment Variables**:
  - [ ] `MONGODB_URI` (reference to Railway MongoDB)
  - [ ] `NEXTAUTH_URL` (your Railway app URL)
  - [ ] `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
  - [ ] `ANTHROPIC_API_KEY` (from Anthropic console)

## Post-Deployment Checklist

- [ ] Build completed successfully (check build logs)
- [ ] App is accessible at Railway URL
- [ ] Can register a new account
- [ ] Can log in successfully
- [ ] Python Lab works
- [ ] Spreadsheet feature works
- [ ] AI Tutor responds (test with a question)
- [ ] Syllabus page loads correctly
- [ ] Dashboard shows progress

## Optional Enhancements

- [ ] Add custom domain
- [ ] Set up MongoDB backups
- [ ] Configure monitoring/alerts
- [ ] Add more users/test accounts
- [ ] Seed initial course data

## Quick Command Reference

```bash
# Generate NEXTAUTH_SECRET locally
openssl rand -base64 32

# Test build locally with Docker
docker build -t computing-portal .
docker run -p 3000:3000 -e MONGODB_URI=your_uri computing-portal

# View Railway logs (using Railway CLI)
railway logs

# Deploy manually (using Railway CLI)
railway up
```

## Environment Variables Quick Copy

```
MONGODB_URI=<from_railway_mongodb>
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=<generate_with_openssl>
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
NODE_ENV=production
```

## Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Build fails | Check `package-lock.json` is committed |
| DB connection fails | Verify `MONGODB_URI` references Railway MongoDB |
| NextAuth errors | Confirm `NEXTAUTH_URL` matches your Railway URL |
| 404 errors | Check build completed and `output: 'standalone'` in next.config.js |
| AI Tutor fails | Verify `ANTHROPIC_API_KEY` is valid and has credits |

---

📖 Full guide: See `RAILWAY_DEPLOYMENT.md`

