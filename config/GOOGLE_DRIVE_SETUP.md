# Google Drive Integration Setup

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "New Project"
3. Name it: `DoctorPod-PDF-Storage`
4. Click "Create"

## Step 2: Enable Google Drive API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Name: `doctorpod-pdf-uploader`
4. Click "Create and Continue"
5. Role: Select "Basic" → "Editor"
6. Click "Done"

## Step 4: Generate Key File

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Download the file
6. **Rename it to `google-drive-credentials.json`**
7. **Place it in the `config/` folder** of this project

## Step 5: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder: `DoctorPod-Prescriptions`
3. Right-click → Share → "Anyone with the link" → "Viewer"
4. Copy the folder URL (e.g., `https://drive.google.com/drive/folders/1ABC123...`)
5. The folder ID is the part after `/folders/` (e.g., `1ABC123...`)

## Step 6: Share Folder with Service Account

1. In Google Drive, right-click the folder → Share
2. Add the service account email (found in your JSON file as `client_email`)
   - Example: `doctorpod-pdf-uploader@doctorpod-123.iam.gserviceaccount.com`
3. Give it "Editor" access
4. Click "Share"

## Step 7: Configure Folder ID in App

Option A: Create config file manually:
```json
// config/google-drive-config.json
{
  "folderId": "YOUR_FOLDER_ID_HERE"
}
```

Option B: Use API endpoint:
```bash
curl -X POST http://localhost:3000/admin/set-drive-folder \
  -H "Content-Type: application/json" \
  -d '{"folderId": "YOUR_FOLDER_ID_HERE"}'
```

## Verification

1. Restart the server
2. Generate a prescription PDF
3. Check the console for "PDF uploaded to Google Drive: ..."
4. The WhatsApp message will now contain the Google Drive link

## Troubleshooting

- **"Google Drive credentials not found"**: Place `google-drive-credentials.json` in `config/` folder
- **"Google Drive folder ID not configured"**: Set the folder ID as described in Step 7
- **"Permission denied"**: Make sure the service account email is added as Editor to the folder
