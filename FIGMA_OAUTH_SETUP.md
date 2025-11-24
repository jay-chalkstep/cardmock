# Figma OAuth Setup Guide

## Step 1: Create a Figma OAuth App

1. Go to [Figma Developer Settings](https://www.figma.com/developers/apps)
2. Click **"Create a new app"** or **"New app"**
3. Fill in the app details:
   - **App name**: CardMock (or your preferred name)
   - **App description**: Design approval and collaboration platform
   - **App website**: `https://app.cardmock.com` (or your production URL)
   - **App icon**: Upload an icon (optional)

4. After creating the app, go to the **"OAuth scopes"** tab
5. Configure OAuth scopes - Check the following scopes:
   - **Files** section:
     - ✅ `file_content:read` - "Read the contents of and render images from files"
     - ✅ `file_metadata:read` - "Read metadata of files"
   - (Optional) If you need comment functionality:
     - `file_comments:read` - "Read comments in accessible files"
     - `file_comments:write` - "Create, modify, and delete comments in accessible files"

6. Go to the **"OAuth credentials"** tab
7. Configure OAuth settings:
   - **Redirect URI**: 
     - For production: `https://app.cardmock.com/api/integrations/figma/callback`
     - For local development: `http://localhost:3000/api/integrations/figma/callback`
   - Copy your **Client ID** and **Client Secret** from this tab

8. Save the OAuth settings

## Step 2: Add Environment Variables

### Local Development (.env.local)

Add these to your `.env.local` file in the project root:

```bash
# Figma Integration
FIGMA_CLIENT_ID=your_figma_client_id_here
FIGMA_CLIENT_SECRET=your_figma_client_secret_here
```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - **Name**: `FIGMA_CLIENT_ID`
     - **Value**: Your Figma Client ID
     - **Environment**: Production, Preview, Development (select all)
   - **Name**: `FIGMA_CLIENT_SECRET`
     - **Value**: Your Figma Client Secret
     - **Environment**: Production, Preview, Development (select all)

4. Click **Save**
5. **Important**: Redeploy your application for the changes to take effect

## Step 3: Verify Setup

1. Restart your local development server:
   ```bash
   npm run dev
   ```

2. Navigate to Settings → Integrations → Figma
3. Click "Connect Figma"
4. You should be redirected to Figma's OAuth authorization page
5. After authorizing, you'll be redirected back to your app

## Step 4: For Figma App Reviewers

If you're submitting your app for Figma review, reviewers will need to create their own accounts:

### Public Sign-up Access
1. Ensure Clerk allows public sign-ups (this should be enabled by default)
2. Reviewers can create their own accounts at: `https://app.cardmock.com/sign-up`
3. No test account credentials needed - reviewers use their own email addresses

### Testing Instructions Template for Reviewers

Include this in your Figma app submission:

```
## Access Instructions

**Create Your Own Account:**
1. Go to https://app.cardmock.com/sign-up
2. Sign up with any email address (you can use a test email)
3. Complete the registration process
4. You'll be automatically logged in and can proceed with testing

**Note:** CardMock uses Clerk for authentication. You can sign up with:
- Email and password
- Google account
- Other social providers (if configured)
```

## Troubleshooting

### Error: "OAuth app with client id doesn't exist"
- **Cause**: `FIGMA_CLIENT_ID` is not set or is incorrect
- **Solution**: 
  - Verify the environment variable is set correctly
  - Restart your development server
  - For Vercel, ensure you've redeployed after adding the variables

### Error: "Invalid redirect URI"
- **Cause**: The redirect URI in your Figma app doesn't match your environment
- **Solution**: 
  - For local: Use `http://localhost:3000/api/integrations/figma/callback`
  - For production: Use `https://app.cardmock.com/api/integrations/figma/callback`
  - Make sure the redirect URI in Figma matches exactly (including protocol and trailing slash)

### Error: "Invalid scopes for app"
- **Cause**: The scopes requested don't match what's configured in your Figma app
- **Solution**: 
  - Go to your Figma app settings → OAuth scopes tab
  - Make sure `file_content:read` and `file_metadata:read` are checked
  - Save the settings and try again

### Error: "Invalid client secret"
- **Cause**: `FIGMA_CLIENT_SECRET` is not set or is incorrect
- **Solution**: Verify the secret is correct and matches your Figma app

## Additional Notes

- The redirect URI must match exactly between your Figma app settings and your environment
- For local development, use `http://localhost:3000`
- For production, use your actual domain (e.g., `https://app.cardmock.com`)
- You can add multiple redirect URIs in Figma if you need both local and production support

