# 🚂 Railway Commands Quick Reference

## Installation

```bash
# Install Railway CLI
npm install -g @railway/cli

# Or with Homebrew (macOS/Linux)
brew install railway

# Verify installation
railway --version
```

---

## Authentication

```bash
# Login to Railway
railway login

# Check who you're logged in as
railway whoami

# Get your Railway token (for CI/CD)
railway whoami --token

# Logout
railway logout
```

---

## Project Management

```bash
# Initialize a new Railway project
railway init

# Link to an existing Railway project
railway link

# List all your Railway projects
railway list

# Show current project status
railway status

# Open Railway dashboard in browser
railway open
```

---

## Deployment

```bash
# Deploy your application
railway up

# Deploy in detached mode (don't wait for build)
railway up --detach

# Deploy a specific service
railway up --service web

# Redeploy the latest deployment
railway redeploy
```

---

## Environment Variables

```bash
# List all environment variables
railway variables

# Set a single variable
railway variables set KEY=value

# Set multiple variables
railway variables set KEY1=value1 KEY2=value2

# Delete a variable
railway variables delete KEY

# Load variables from .env file
railway variables set --env-file .env
```

---

## Logs & Debugging

```bash
# View application logs (live tail)
railway logs

# View logs for specific service
railway logs --service web

# View build logs
railway logs --build

# View logs with timestamp
railway logs --timestamps
```

---

## Running Commands

```bash
# Run a command with Railway environment variables
railway run npm run dev

# Run a command in a specific environment
railway run --environment production npm start

# Open a shell with Railway environment
railway shell

# Run database migrations
railway run npm run migrate
```

---

## Services & Plugins

```bash
# List all services in project
railway service list

# Add a new service
railway service create

# Delete a service
railway service delete

# Connect to MongoDB (if using plugin)
railway connect mongodb
```

---

## Domains

```bash
# List all domains
railway domain

# Add a custom domain
railway domain add yourdomain.com

# Remove a domain
railway domain remove yourdomain.com
```

---

## Environments

```bash
# List environments
railway environment

# Create a new environment
railway environment create staging

# Switch to an environment
railway environment use production
```

---

## Useful Combinations

```bash
# Quick deploy and view logs
railway up && railway logs

# Set variables and deploy
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32) && railway up

# Run development server with Railway variables
railway run npm run dev

# Deploy and open in browser
railway up && railway open

# Check status and view logs
railway status && railway logs
```

---

## Project-Specific Commands

### For This Computing Portal

```bash
# Deploy to Railway
railway up

# Set required environment variables
railway variables set \
  NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  ANTHROPIC_API_KEY=your-key-here \
  NEXTAUTH_URL=https://your-app.railway.app

# Run locally with Railway environment
railway run npm run dev

# View application logs
railway logs

# Open Railway dashboard
railway open

# Check deployment status
railway status
```

---

## Troubleshooting Commands

```bash
# Check if Railway CLI is working
railway --version

# Verify you're logged in
railway whoami

# Check current project
railway status

# View recent deployments
railway logs --build

# Force redeploy
railway redeploy

# Clear local Railway config
rm -rf .railway

# Re-link to project
railway link
```

---

## CI/CD Setup

```bash
# Get Railway token for GitHub Actions
railway whoami --token

# Add to GitHub Secrets as RAILWAY_TOKEN
# Then use in workflow:
# - name: Deploy
#   env:
#     RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
#   run: railway up --detach
```

---

## Common Workflows

### Initial Setup
```bash
railway login
railway init
railway variables set ANTHROPIC_API_KEY=your-key
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway up
```

### Daily Development
```bash
# Work locally with Railway env
railway run npm run dev

# Deploy changes
git push
railway up

# Check logs
railway logs
```

### Debugging Issues
```bash
# Check status
railway status

# View logs
railway logs

# Check environment variables
railway variables

# Redeploy
railway redeploy
```

---

## Help & Documentation

```bash
# Get help for any command
railway help
railway <command> --help

# Examples:
railway up --help
railway variables --help
railway logs --help
```

---

## Quick Reference Table

| Task | Command |
|------|---------|
| Login | `railway login` |
| Initialize project | `railway init` |
| Deploy | `railway up` |
| View logs | `railway logs` |
| Set variable | `railway variables set KEY=value` |
| Open dashboard | `railway open` |
| Check status | `railway status` |
| Run locally | `railway run npm run dev` |
| Redeploy | `railway redeploy` |

---

## Environment Variables for This Project

```bash
# Set all required variables at once
railway variables set \
  MONGODB_URI='${{MONGO_URL}}' \
  NEXTAUTH_URL='https://your-app.railway.app' \
  NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  ANTHROPIC_API_KEY='your-anthropic-key' \
  NODE_ENV='production'
```

Note: For `MONGODB_URI`, use the Railway dashboard to reference the MongoDB plugin instead of setting it manually.

---

## Resources

- 📚 [Railway CLI Docs](https://docs.railway.app/develop/cli)
- 🚂 [Railway Dashboard](https://railway.app/dashboard)
- 💬 [Railway Discord](https://discord.gg/railway)
- 📖 [Railway Blog](https://blog.railway.app/)

---

**Pro Tip**: Add `railway` to your shell aliases for faster access:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias rw='railway'
alias rwl='railway logs'
alias rwu='railway up'
alias rws='railway status'
```

Then use: `rw up`, `rwl`, etc.

