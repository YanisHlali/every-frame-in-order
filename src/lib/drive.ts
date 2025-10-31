import { google, drive_v3 } from 'googleapis';
import { DriveFile } from '../types';
import { logger } from './logger';

let driveClient: drive_v3.Drive | null = null;

export function initializeGoogleDrive(): drive_v3.Drive {
  if (driveClient) {
    return driveClient;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable is required');
  }

  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf-8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    driveClient = google.drive({ version: 'v3', auth });
    logger.info('Google Drive API initialized successfully');

    return driveClient;

  } catch (error) {
    logger.error('Failed to initialize Google Drive API', { error });
    throw new Error('Failed to initialize Google Drive API');
  }
}

export async function getFilesFromFolder(folderId: string): Promise<DriveFile[]> {
  const drive = initializeGoogleDrive();

  try {
    let allFiles: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/'`,
        orderBy: 'name',
        fields: 'files(id, name, webViewLink, webContentLink, thumbnailLink, mimeType), nextPageToken',
        pageSize: 1000,
        pageToken
      });

      const files = response.data.files || [];

      const mappedFiles: DriveFile[] = files
        .filter((file): file is drive_v3.Schema$File & { id: string; name: string } => {
          return !!(file.id && file.name);
        })
        .map((file) => ({
          id: file.id,
          name: file.name,
          webViewLink: file.webViewLink || undefined,
          webContentLink: file.webContentLink || undefined,
          thumbnailLink: file.thumbnailLink || undefined,
          mimeType: file.mimeType || undefined
        }));

      allFiles = allFiles.concat(mappedFiles);
      pageToken = response.data.nextPageToken || undefined;

    } while (pageToken);

    return allFiles;

  } catch (error) {
    logger.error('Error fetching files from folder', { folderId, error });
    throw error;
  }
}

export async function getFileStream(fileId: string) {
  const drive = initializeGoogleDrive();
  
  try {
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, {
      responseType: 'arraybuffer'
    });

    return {
      data: Buffer.from(response.data as ArrayBuffer),
      mimeType: response.headers['content-type'] || 'image/png'
    };

  } catch (error) {
    logger.error('Error getting file stream', { fileId, error });
    throw error;
  }
}

export function getImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}