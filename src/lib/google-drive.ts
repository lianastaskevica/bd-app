import { google } from 'googleapis';
import { prisma } from './prisma';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Get OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Generate authorization URL
export function getAuthorizationUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to get refresh token
    state: state,
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get authenticated Drive client for a user
export async function getDriveClient(userId: string) {
  const integration = await prisma.googleIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    throw new Error('Google Drive not connected');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: integration.refreshToken,
    access_token: integration.accessToken || undefined,
  });

  // Refresh token if expired
  if (integration.tokenExpiry && new Date(integration.tokenExpiry) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens in DB
    await prisma.googleIntegration.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token || null,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    });
    
    oauth2Client.setCredentials(credentials);
  }

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Extract folder ID from Google Drive URL
export function extractFolderId(urlOrId: string): string {
  // If already a clean ID, return it
  if (!urlOrId.includes('/') && !urlOrId.includes('?')) {
    return urlOrId;
  }

  // Extract from URL patterns:
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  const folderMatch = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return folderMatch[1];
  }

  throw new Error('Invalid folder URL or ID');
}

// List files in a folder
export async function listFilesInFolder(
  userId: string,
  folderId: string,
  pageToken?: string
) {
  const drive = await getDriveClient(userId);

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,modifiedTime,createdTime,size,md5Checksum,webViewLink), nextPageToken',
    pageToken: pageToken,
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return {
    files: response.data.files || [],
    nextPageToken: response.data.nextPageToken,
  };
}

// Get folder metadata
export async function getFolderMetadata(userId: string, folderId: string) {
  const drive = await getDriveClient(userId);

  const response = await drive.files.get({
    fileId: folderId,
    fields: 'id,name,mimeType',
    supportsAllDrives: true,
  });

  return response.data;
}

// Download/export file content based on mime type
export async function getFileContent(
  userId: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  const drive = await getDriveClient(userId);

  try {
    // Google Docs - export as plain text
    if (mimeType === 'application/vnd.google-apps.document') {
      const response = await drive.files.export(
        {
          fileId: fileId,
          mimeType: 'text/plain',
        },
        { responseType: 'text' }
      );
      return response.data as string;
    }

    // Google Sheets - export as CSV
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const response = await drive.files.export(
        {
          fileId: fileId,
          mimeType: 'text/csv',
        },
        { responseType: 'text' }
      );
      return response.data as string;
    }

    // Plain text, PDFs, Word docs, etc. - download directly
    if (
      mimeType === 'text/plain' ||
      mimeType === 'application/pdf' ||
      mimeType.includes('word') ||
      mimeType.includes('text')
    ) {
      const response = await drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        { responseType: 'text' }
      );
      return response.data as string;
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  } catch (error: any) {
    throw new Error(`Failed to get file content: ${error.message}`);
  }
}

// Sync a specific folder for a user
export async function syncFolder(userId: string, folderId: string) {
  const results = {
    total: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [] as string[],
  };

  try {
    let pageToken: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const { files, nextPageToken } = await listFilesInFolder(userId, folderId, pageToken);
      
      for (const file of files) {
        results.total++;

        try {
          // Check if file exists in our DB
          const existingFile = await prisma.driveFile.findUnique({
            where: { googleFileId: file.id! },
          });

          const fileModifiedTime = new Date(file.modifiedTime!);

          // Skip if already imported and not modified
          if (
            existingFile &&
            existingFile.status === 'imported' &&
            existingFile.modifiedTime >= fileModifiedTime
          ) {
            results.skipped++;
            continue;
          }

          // Try to download content
          let content: string | null = null;
          let status = 'pending';
          let errorMessage: string | null = null;

          try {
            content = await getFileContent(userId, file.id!, file.mimeType!);
            status = 'imported';
          } catch (error: any) {
            status = 'error';
            errorMessage = error.message;
            results.errors++;
            results.errorMessages.push(`${file.name}: ${error.message}`);
          }

          // Upsert file record
          await prisma.driveFile.upsert({
            where: { googleFileId: file.id! },
            create: {
              userId,
              googleFileId: file.id!,
              name: file.name!,
              mimeType: file.mimeType!,
              modifiedTime: fileModifiedTime,
              size: file.size ? BigInt(file.size) : null,
              md5Checksum: file.md5Checksum || null,
              webViewLink: file.webViewLink || null,
              rawText: content,
              importedAt: status === 'imported' ? new Date() : null,
              status,
              errorMessage,
            },
            update: {
              name: file.name!,
              mimeType: file.mimeType!,
              modifiedTime: fileModifiedTime,
              size: file.size ? BigInt(file.size) : null,
              md5Checksum: file.md5Checksum || null,
              webViewLink: file.webViewLink || null,
              rawText: content,
              importedAt: status === 'imported' ? new Date() : null,
              status,
              errorMessage,
            },
          });

          if (existingFile) {
            results.updated++;
          } else {
            results.imported++;
          }
        } catch (error: any) {
          results.errors++;
          results.errorMessages.push(`${file.name}: ${error.message}`);
          console.error(`Error processing file ${file.name}:`, error);
        }
      }

      pageToken = nextPageToken || undefined;
      hasMore = !!nextPageToken;
    }

    // Update last sync time
    await prisma.driveSource.updateMany({
      where: { userId, folderId },
      data: { lastSync: new Date() },
    });

    return results;
  } catch (error: any) {
    throw new Error(`Sync failed: ${error.message}`);
  }
}

// Sync all folders for a user
export async function syncAllFolders(userId: string) {
  const sources = await prisma.driveSource.findMany({
    where: { userId, status: 'active' },
  });

  const results = {
    totalFolders: sources.length,
    successfulFolders: 0,
    failedFolders: 0,
    totalFiles: 0,
    importedFiles: 0,
    updatedFiles: 0,
    skippedFiles: 0,
    errors: 0,
    errorMessages: [] as string[],
  };

  for (const source of sources) {
    try {
      const folderResult = await syncFolder(userId, source.folderId);
      results.successfulFolders++;
      results.totalFiles += folderResult.total;
      results.importedFiles += folderResult.imported;
      results.updatedFiles += folderResult.updated;
      results.skippedFiles += folderResult.skipped;
      results.errors += folderResult.errors;
      results.errorMessages.push(...folderResult.errorMessages);
    } catch (error: any) {
      results.failedFolders++;
      results.errorMessages.push(`Folder ${source.folderName || source.folderId}: ${error.message}`);
      console.error(`Error syncing folder ${source.folderId}:`, error);
    }
  }

  return results;
}


