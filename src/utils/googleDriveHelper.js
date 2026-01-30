/**
 * Google Drive Helper
 * Uploads PDFs to Google Drive and returns public shareable links
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Path to service account credentials JSON file
const CREDENTIALS_PATH = path.join(__dirname, '../../config/google-drive-credentials.json');

// Google Drive folder ID where PDFs will be uploaded (set after creating folder)
let FOLDER_ID = null;

// Load folder ID from config
const configPath = path.join(__dirname, '../../config/google-drive-config.json');
try {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    FOLDER_ID = config.folderId || null;
  }
} catch (e) {
  console.error('Failed to load Google Drive config:', e.message);
}

/**
 * Get authenticated Google Drive client
 */
function getDriveClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('Google Drive credentials not found at:', CREDENTIALS_PATH);
    return null;
  }
  
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  return google.drive({ version: 'v3', auth });
}

/**
 * Upload a file to Google Drive
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Name for the file in Drive
 * @returns {Object} - { success, fileId, webViewLink, webContentLink }
 */
async function uploadToDrive(filePath, fileName) {
  try {
    const drive = getDriveClient();
    if (!drive) {
      return { success: false, error: 'Google Drive not configured' };
    }
    
    if (!FOLDER_ID) {
      return { success: false, error: 'Google Drive folder ID not configured' };
    }
    
    // Upload file
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID]
    };
    
    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath)
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });
    
    const fileId = response.data.id;
    
    // Make file publicly accessible
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    // Get updated file info with public links
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, webViewLink, webContentLink'
    });
    
    return {
      success: true,
      fileId: fileInfo.data.id,
      webViewLink: fileInfo.data.webViewLink,
      webContentLink: fileInfo.data.webContentLink
    };
    
  } catch (error) {
    console.error('Google Drive upload error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Set the Google Drive folder ID
 * @param {string} folderId - The folder ID from Google Drive URL
 */
function setFolderId(folderId) {
  FOLDER_ID = folderId;
  
  // Save to config file
  const configDir = path.join(__dirname, '../../config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify({ folderId }, null, 2));
  console.log('Google Drive folder ID saved:', folderId);
}

/**
 * Check if Google Drive is configured
 */
function isConfigured() {
  return fs.existsSync(CREDENTIALS_PATH) && FOLDER_ID !== null;
}

module.exports = {
  uploadToDrive,
  setFolderId,
  isConfigured,
  getDriveClient
};
