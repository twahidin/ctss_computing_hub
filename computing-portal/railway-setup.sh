#!/bin/bash

# Railway Setup Script for Computing Portal
# This script helps you set up the project on Railway using the Railway CLI

echo "🚂 Computing Portal - Railway Setup Script"
echo "=========================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo ""
    echo "Please install it first:"
    echo "  npm install -g @railway/cli"
    echo "  or"
    echo "  brew install railway"
    echo ""
    exit 1
fi

echo "✅ Railway CLI is installed"
echo ""

# Check if logged in
echo "Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Please log in to Railway:"
    railway login
fi

echo ""
echo "✅ Authenticated with Railway"
echo ""

# Initialize project
echo "Do you want to create a new Railway project? (y/n)"
read -r create_project

if [ "$create_project" = "y" ]; then
    echo "Creating new Railway project..."
    railway init
    echo ""
fi

# Check for environment variables
echo "📝 Setting up environment variables..."
echo ""

# Generate NEXTAUTH_SECRET if not exists
if [ ! -f .env ]; then
    echo "Generating NEXTAUTH_SECRET..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "Generated: $NEXTAUTH_SECRET"
    echo ""
else
    echo ".env file already exists"
    echo ""
fi

# Prompt for required variables
echo "Please provide the following environment variables:"
echo ""

echo "1. ANTHROPIC_API_KEY (get from https://console.anthropic.com/):"
read -r anthropic_key

echo ""
echo "2. MongoDB URI (leave empty to use Railway MongoDB plugin):"
read -r mongodb_uri

echo ""
echo "3. Your Railway app URL (e.g., https://your-app.railway.app):"
echo "   (You can update this after first deployment)"
read -r nextauth_url

# Set environment variables
echo ""
echo "Setting environment variables in Railway..."

if [ -n "$anthropic_key" ]; then
    railway variables set ANTHROPIC_API_KEY="$anthropic_key"
fi

if [ -n "$mongodb_uri" ]; then
    railway variables set MONGODB_URI="$mongodb_uri"
else
    echo "⚠️  Remember to add MongoDB plugin and set MONGODB_URI reference"
fi

if [ -n "$nextauth_url" ]; then
    railway variables set NEXTAUTH_URL="$nextauth_url"
fi

if [ -n "$NEXTAUTH_SECRET" ]; then
    railway variables set NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
fi

railway variables set NODE_ENV="production"

echo ""
echo "✅ Environment variables set!"
echo ""

# Deploy
echo "Do you want to deploy now? (y/n)"
read -r deploy_now

if [ "$deploy_now" = "y" ]; then
    echo "Deploying to Railway..."
    railway up
    echo ""
    echo "✅ Deployment initiated!"
    echo ""
    echo "Check your deployment status:"
    echo "  railway status"
    echo ""
    echo "View logs:"
    echo "  railway logs"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add MongoDB plugin in Railway dashboard if not done"
echo "2. Link MONGODB_URI to MongoDB plugin"
echo "3. Update NEXTAUTH_URL with your actual Railway URL"
echo "4. Test your deployment"
echo ""
echo "Useful commands:"
echo "  railway status  - Check deployment status"
echo "  railway logs    - View application logs"
echo "  railway open    - Open Railway dashboard"
echo "  railway run npm run dev - Run locally with Railway env vars"
echo ""

