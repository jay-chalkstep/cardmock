# Testing Instructions for Aiproval Figma Integration

## Overview
Aiproval is a design approval and collaboration platform that allows users to import Figma frames directly into approval workflows.

## Access Instructions

**Create Your Own Account:**
1. Go to https://app.aiproval.com/sign-up
2. Sign up with any email address (you can use a test email)
3. Complete the registration process
4. You'll be automatically logged in and can proceed with testing

**Note:** Aiproval uses Clerk for authentication. You can sign up with:
- Email and password
- Google account
- Other social providers (if configured)

## Prerequisites
1. Access to a Figma account with at least one file containing frames
2. An Aiproval account (created via sign-up above)

## Testing Steps

### Step 1: Connect Figma Account
1. Log in to Aiproval at https://app.aiproval.com
2. Navigate to Settings → Integrations → Figma
3. Click "Connect Figma" button
4. Authorize the app when redirected to Figma's OAuth page
5. Verify you are redirected back to Aiproval with a success message
6. Verify the connection status shows "Connected"

### Step 2: Import Figma Frames
1. In Aiproval, navigate to Library → Assets tab
2. Click "Import from Figma" button (located above the "New Asset" button)
3. Enter a Figma file key (found in the Figma file URL: `figma.com/file/[FILE_KEY]/...`)
   - Example: If your Figma file URL is `https://www.figma.com/file/abc123xyz/My-Design`, the file key is `abc123xyz`
4. Click "Load Frames" to fetch frames from the file
5. Select one or more frames from the list (checkboxes)
6. Click "Next" to proceed to import settings
7. Choose a project and folder for the imported assets (optional)
8. Click "Import" and verify the frames are imported as assets

### Step 3: Verify Imported Assets
1. Check that imported assets appear in the Library → Assets tab
2. Open an imported asset and verify:
   - The image displays correctly
   - Figma metadata is shown in the sidebar (file ID, node IDs, "Open in Figma" link)
   - The asset can be assigned to projects and workflows
   - Clicking "Open in Figma" link opens the source file in Figma

### Step 4: Test Status Badge (if applicable)
1. In the Library → Assets list, verify that assets imported from Figma show a status badge
2. The badge should display the approval status (approved/pending/changes_requested) if the asset is in a workflow

## Expected Behavior
- OAuth connection should complete successfully without errors
- Users should be able to browse and select frames from their Figma files
- Imported frames should appear as assets in Aiproval with correct images
- Figma source information should be displayed on imported assets
- "Open in Figma" link should navigate to the correct Figma file

## Troubleshooting

### If you can't sign up:
- Verify the sign-up URL is accessible: https://app.aiproval.com/sign-up
- Check that Clerk authentication is properly configured
- Try using a different email address

### If OAuth connection fails:
- Verify the Figma app is set to "Public" audience (not "Private")
- Check that the redirect URI matches: `https://app.aiproval.com/api/integrations/figma/callback`
- Ensure the required scopes are configured in the Figma app settings

### If import fails:
- Verify you have access to the Figma file you're trying to import
- Check that the file key is correct (from the Figma file URL)
- Ensure the file contains frames (not just components or other elements)

## Notes
- The app requires `file_content:read` and `file_metadata:read` scopes
- Users must have access to the Figma files they want to import
- The integration works with both private and public Figma files
- Imported assets are stored in Aiproval and can be managed independently from the source Figma file

