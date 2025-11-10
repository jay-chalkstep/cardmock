# Figma OAuth Setup Guide

## Step 1: Create a Figma OAuth App

1. Go to [Figma Developer Settings](https://www.figma.com/developers/apps)
2. Click **"Create a new app"** or **"New app"**
3. Fill in the app details:
   - **App name**: Aiproval (or your preferred name)
   - **App description**: Design approval and collaboration platform
   - **App website**: `https://app.aiproval.com` (or your production URL)
   - **App icon**: Upload an icon (optional)

4. After creating the app, go to the **"OAuth"** tab
5. Configure OAuth settings:
   - **Redirect URI**: 
     - For production: `https://app.aiproval.com/api/integrations/figma/callback`
     - For local development: `http://localhost:3000/api/integrations/figma/callback`
   - **Note**: Figma OAuth doesn't use scopes in the traditional sense. Permissions are configured at the app level in Figma's app settings. Make sure your app has the necessary permissions enabled in the Figma Developer Dashboard.

6. Save the OAuth settings
7. Copy your **Client ID** and **Client Secret** from the OAuth tab

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
  - For production: Use `https://app.aiproval.com/api/integrations/figma/callback`
  - Make sure the redirect URI in Figma matches exactly (including protocol and trailing slash)

### Error: "Invalid client secret"
- **Cause**: `FIGMA_CLIENT_SECRET` is not set or is incorrect
- **Solution**: Verify the secret is correct and matches your Figma app

## Additional Notes

- The redirect URI must match exactly between your Figma app settings and your environment
- For local development, use `http://localhost:3000`
- For production, use your actual domain (e.g., `https://app.aiproval.com`)
- You can add multiple redirect URIs in Figma if you need both local and production support

