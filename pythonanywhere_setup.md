# PythonAnywhere Git Setup - Fix for Existing Directory

## If you get "destination path 'stats' already exists" error:

### Option 1: Remove existing directory and clone fresh (Recommended)

Run these commands in your PythonAnywhere Bash console:

```bash
cd ~
# First, let's see what's in the existing stats directory
ls -la stats/

# If it contains important data you want to keep, back it up:
mv stats stats_backup_$(date +%Y%m%d)

# Now clone your GitHub repository
git clone https://github.com/meidav/stats.git

# Verify the clone worked
cd stats
ls -la
git status
```

### Option 2: Initialize git in existing directory

If you want to keep the existing directory and just connect it to GitHub:

```bash
cd ~/stats

# Initialize git repository
git init

# Add your GitHub repository as the remote origin
git remote add origin https://github.com/meidav/stats.git

# Fetch the latest changes from GitHub
git fetch origin

# Set up the main branch to track the remote
git branch -u origin/main main

# If you need to pull the latest changes (this will merge)
git pull origin main
```

### Option 3: Clone to a different directory name

```bash
cd ~
git clone https://github.com/meidav/stats.git stats-app
cd stats-app
```

## After successful setup:

1. **Verify your repository is properly connected:**
   ```bash
   cd ~/stats  # or ~/stats-app if you used option 3
   git remote -v
   git status
   ```

2. **Update your web app configuration:**
   - Go to the PythonAnywhere Web tab
   - Update your web app's source code path to point to the correct directory
   - For example: `/home/yourusername/stats/` or `/home/yourusername/stats-app/`

3. **Test a deployment:**
   ```bash
   # Make sure you're in the right directory
   cd ~/stats  # or ~/stats-app
   
   # Test pulling changes
   git pull origin main
   
   # Reload your web app
   touch /var/www/yourusername_pythonanywhere_com_wsgi.py
   ```

## Next Steps After Git Setup:

Once git is properly set up, continue with Step 3 in the deploy_setup.md file to configure GitHub Secrets for automated deployment.

