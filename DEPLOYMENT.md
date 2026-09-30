# 🚀 Deployment Guide: Deploy RupeeTrack to Render.com (Free)

This application is fully prepared and pre-configured for free deployment on **[Render.com](https://render.com/)**.

---

### Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com/) and log in (or create a free account).
2. Click the **"+"** icon in the top right and select **"New repository"**.
3. Name your repository (for example: `rupeetrack` or `expense-tracker`).
4. Leave it as **Public** (or Private).
5. **Do not** check "Initialize with README", .gitignore, or license (we already created them).
6. Click **"Create repository"**.

---

### Step 2: Push Your Local Code to GitHub

In your project folder (`c:\Users\User\Downloads\expense tracker antigravity`), open your PowerShell terminal and run:

```powershell
# 1. Link your GitHub repository (replace with your actual GitHub URL)
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<YOUR-REPO-NAME>.git

# 2. Push your code
git push -u origin main
```

*(If prompted, sign in with your GitHub credentials or Personal Access Token).*

---

### Step 3: Deploy on Render.com (Free Tier)

1. Go to **[dashboard.render.com](https://dashboard.render.com/)** and sign up / sign in (you can sign in with GitHub).
2. Click the **"New +"** button at the top and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and click **Next**.
4. Connect your GitHub account and select your newly created **`rupeetrack`** repository.
5. Fill in the deployment details (Render may auto-detect these from `render.yaml`):
   - **Name**: `rupeetrack` (or any custom name for your live URL)
   - **Region**: Choose the closest region (e.g. *Singapore* or *Frankfurt*)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: Select **Free**
6. Click **"Deploy Web Service"**.

---

### Step 4: Access Your Live Application

Render will build the dependencies and start the app. In about 1–2 minutes, Render will provide your public URL:
```
https://rupeetrack.onrender.com
```

You and your group members can now open this link on mobile phones, tablets, or laptops anywhere in the world! 🌐
