# PythonAnywhere Deployment Automation Setup

This guide will help you automate deployments from GitHub to PythonAnywhere using GitHub Actions.

## Prerequisites

1. Your code is already on GitHub
2. You have a PythonAnywhere account
3. Your Flask app is running on PythonAnywhere

## Setup Instructions

### Step 1: Enable API Access on PythonAnywhere

1. Log in to your PythonAnywhere account
2. Go to Account → API Token
3. Click "Create API Token" if you don't have one
4. Copy the token (you'll need it for GitHub)

### Step 2: Set Up Your PythonAnywhere Repository

If you haven't already connected your GitHub repo to PythonAnywhere:

1. Open a Bash console on PythonAnywhere
2. Clone your repository:
   ```bash
   cd ~
   git clone https://github.com/yourusername/stats.git
   ```
3. Set up your web app to point to this directory in the Web tab

### Step 3: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and Variables → Actions
3. Click "New repository secret" and add these secrets:

   - **PA_API_TOKEN**: Your PythonAnywhere API token from Step 1
   - **PA_USERNAME**: Your PythonAnywhere username
   - **PA_DOMAIN**: Your app domain (e.g., `yourusername.pythonanywhere.com`)

### Step 4: Test the Deployment

1. Make a small change to your code
2. Commit and push to the main branch:
   ```bash
   git add .
   git commit -m "Test automated deployment"
   git push origin main
   ```
3. Go to GitHub → Actions tab to watch the deployment process
4. Check your PythonAnywhere app to see the changes

## How It Works

- When you push to the main branch, GitHub Actions triggers
- The workflow pulls the latest code to your PythonAnywhere directory
- It then reloads your web app to apply the changes
- You'll see success/failure notifications in the Actions tab

## Alternative: Simple Deployment Script

If you prefer a simpler approach, you can manually run deployments using the included script:

```bash
# On PythonAnywhere console
cd ~/stats
git pull origin main
touch /var/www/yourusername_pythonanywhere_com_wsgi.py
```

## Troubleshooting

- **API calls failing**: Check that your PA_API_TOKEN is correct
- **Git pull failing**: Ensure your repo is properly cloned on PythonAnywhere
- **Changes not appearing**: Verify the web app is reloading correctly
- **Permission errors**: Make sure the git repository is in the correct directory

## Security Notes

- Never commit API tokens directly to your repository
- Use GitHub Secrets for sensitive information
- Consider setting up branch protection rules for production deployments
