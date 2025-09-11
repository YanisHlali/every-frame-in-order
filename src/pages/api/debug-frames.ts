import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore, getContentId } from '../../lib/firebase';
import { getFilesFromFolder } from '../../lib/drive';
import { handleApiError, logError } from '../../lib/error-utils';
import { ContentData, Episode } from '../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { folderId } = req.query;
    
    const db = getFirestore();
    const contentId = getContentId();
    
    console.log('Debug - contentId:', contentId);
    
    const contentDoc = await db.collection('content').doc(contentId).get();
    
    if (!contentDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Series data not found',
        debug: { contentId, exists: false }
      });
    }

    const contentData = contentDoc.data() as ContentData | undefined;
    console.log('Debug - contentData keys:', Object.keys(contentData || {}));
    
    if (folderId) {
      console.log('Debug - testing specific folder:', folderId);
      
      try {
        const files = await getFilesFromFolder(folderId as string);
        console.log(`Debug - found ${files.length} files in folder ${folderId}`);

        const debugFrames = files.map((file, index) => {
          const directUrl = `https://drive.google.com/uc?id=${file.id}&export=download`;
          const viewUrl = file.webViewLink;
          const thumbnailUrl = file.thumbnailLink;
          const openUrl = `https://drive.google.com/file/d/${file.id}/view`;
          const ucUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
          
          return {
            id: file.id,
            name: file.name,
            urls: {
              direct: directUrl,
              view: viewUrl,
              thumbnail: thumbnailUrl,
              open: openUrl,
              uc: ucUrl
            },
            frameNumber: index + 1
          };
        });

        return res.status(200).json({
          success: true,
          debug: {
            folderId,
            filesFound: files.length,
            frames: debugFrames
          }
        });

      } catch (driveError) {
        logError('Drive API Error', driveError, { folderId });
        const errorResponse = handleApiError(driveError, 'Drive API error');
        return res.status(500).json({
          success: false,
          message: errorResponse.message,
          debug: {
            folderId,
            ...errorResponse
          }
        });
      }
    }

    if (!contentData?.items) {
      return res.status(404).json({ 
        success: false, 
        message: 'No episodes found',
        debug: { 
          contentId, 
          contentDataKeys: Object.keys(contentData || {}),
          hasItems: !!contentData?.items
        }
      });
    }

    let firstEpisode: (Episode & { seasonKey: string; episodeId: string }) | null = null;
    let firstFolderId: string | null = null;
    
    for (const [seasonKey, seasonData] of Object.entries(contentData?.items || {})) {
      if (!seasonData || typeof seasonData !== 'object') continue;
      
      const episodesToProcess = seasonData.episodes || {};

      for (const [episodeId, episodeData] of Object.entries(episodesToProcess)) {
        if (!episodeData || typeof episodeData !== 'object') continue;
        
        if (episodeData.folderIds && Array.isArray(episodeData.folderIds) && episodeData.folderIds.length > 0) {
          firstEpisode = { 
            seasonKey, 
            episodeId, 
            episodeNumber: episodeData.episodeNumber || 0,
            folderIds: episodeData.folderIds,
            totalFiles: episodeData.totalFiles || 0,
            lastIndex: episodeData.lastIndex || 0,
            indexFolder: episodeData.indexFolder || 0
          };
          firstFolderId = episodeData.folderIds[0];
          break;
        }
      }
      if (firstEpisode) break;
    }

    if (!firstEpisode || !firstFolderId) {
      return res.status(404).json({
        success: false,
        message: 'No episode with folderIds found',
        debug: {
          totalSeasons: Object.keys(contentData?.items || {}).length
        }
      });
    }

    console.log('Debug - testing first folder:', firstFolderId);

    try {
      const files = await getFilesFromFolder(firstFolderId);
      console.log(`Debug - found ${files.length} files in first folder`);

      return res.status(200).json({
        success: true,
        debug: {
          episode: {
            seasonKey: firstEpisode.seasonKey,
            episodeId: firstEpisode.episodeId,
            totalFiles: firstEpisode.totalFiles,
            totalFolders: firstEpisode.folderIds.length
          },
          firstFolderId,
          filesInFolder: files.length,
          sampleFiles: files.map(file => ({
            id: file.id,
            name: file.name,
            directUrl: `https://drive.google.com/uc?id=${file.id}&export=download`,
            ucUrl: `https://drive.google.com/uc?export=view&id=${file.id}`,
            thumbnailUrl: file.thumbnailLink
          }))
        }
      });

    } catch (driveError) {
      logError('Drive Error for first folder', driveError, { firstFolderId });
      const errorResponse = handleApiError(driveError, 'Drive API error for first folder');
      return res.status(500).json({
        success: false,
        message: errorResponse.message,
        debug: {
          firstFolderId,
          ...errorResponse
        }
      });
    }

  } catch (error) {
    logError('General Debug API Error', error);
    const errorResponse = handleApiError(error, 'Internal server error');
    
    return res.status(500).json({
      success: false,
      message: errorResponse.message,
      debug: errorResponse
    });
  }
}