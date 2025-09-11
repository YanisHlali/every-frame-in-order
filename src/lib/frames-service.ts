import admin from 'firebase-admin';
import { getFirestore, getContentId } from './firebase';
import { getFilesFromFolder, getImageUrl } from './drive';
import { handleApiError } from './error-utils';
import { Frame, Pagination, ContentData, FramesApiResponse } from '../types';

export interface FramesServiceOptions {
  season?: string;
  episode?: string;
  page?: number;
  limit?: number;
}

export class FramesService {
  private db?: admin.firestore.Firestore;
  private contentId?: string;

  private getDb() {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  private getContentId() {
    if (!this.contentId) {
      this.contentId = getContentId();
    }
    return this.contentId;
  }

  async getFrames(options: FramesServiceOptions = {}): Promise<FramesApiResponse> {
    const {
      season,
      episode,
      page = 1,
      limit
    } = options;

    try {
      const contentDoc = await this.getDb().collection('content').doc(this.getContentId()).get();
      
      if (!contentDoc.exists) {
        throw new Error('Series data not found');
      }

      const contentData = contentDoc.data() as ContentData | undefined;
      
      if (!contentData?.items) {
        throw new Error('No episodes found');
      }

      const frames: Frame[] = [];
      
      const seasonsToProcess = season ? 
        { [season]: contentData.items[season] } : 
        contentData.items;

      for (const [seasonKey, seasonData] of Object.entries(seasonsToProcess)) {
        if (!seasonData || typeof seasonData !== 'object') continue;
        
        const episodesToProcess = episode ? 
          { [episode]: seasonData.episodes?.[episode] } : 
          seasonData.episodes || {};

        for (const [episodeId, episodeData] of Object.entries(episodesToProcess)) {
          if (!episodeData || typeof episodeData !== 'object') continue;
          
          if (!episodeData.folderIds || !Array.isArray(episodeData.folderIds)) continue;

          const folderPromises = episodeData.folderIds.map(async (folderId: string, folderIndex: number) => {
            try {
              const files = await getFilesFromFolder(folderId);
              
              return files.map((file, fileIndex) => {
                if (!file.id || !file.name) return null;
                
                const frameMatch = file.name.match(/frame_(\d+)/);
                const frameNumber = frameMatch ? 
                  parseInt(frameMatch[1]) : 
                  (folderIndex * 100) + fileIndex + 1;

                const imageUrl = getImageUrl(file.id);

                return {
                  id: file.id,
                  url: imageUrl,
                  seasonKey,
                  episodeId,
                  frameNumber,
                  folderId,
                  folderIndex
                };
              }).filter(frame => frame !== null);
            } catch (driveError) {
              console.error(`Error fetching folder ${folderId}:`, driveError);
              return [];
            }
          });

          const folderResults = await Promise.all(folderPromises);
          folderResults.forEach(folderFrames => {
            frames.push(...folderFrames);
          });
        }
      }

      frames.sort((a, b) => {
        if (a.seasonKey !== b.seasonKey) {
          return a.seasonKey.localeCompare(b.seasonKey);
        }
        if (a.episodeId !== b.episodeId) {
          return a.episodeId.localeCompare(b.episodeId);
        }
        return a.frameNumber - b.frameNumber;
      });

      const totalFrames = frames.length;
      let paginatedFrames: Frame[];
      let pagination: Pagination;

      if (limit === undefined) {
        paginatedFrames = frames;
        pagination = {
          currentPage: 1,
          totalPages: 1,
          totalFrames,
          framesPerPage: totalFrames,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 1,
          endIndex: totalFrames
        };
      } else {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        paginatedFrames = frames.slice(startIndex, endIndex);

        const totalPages = Math.ceil(totalFrames / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        pagination = {
          currentPage: page,
          totalPages,
          totalFrames,
          framesPerPage: limit,
          hasNextPage,
          hasPrevPage,
          startIndex: startIndex + 1,
          endIndex: Math.min(startIndex + limit, totalFrames)
        };
      }

      return {
        success: true,
        frames: paginatedFrames,
        pagination,
        filters: {
          season: season || null,
          episode: episode || null
        },
        debug: {
          method: 'direct strategy',
          note: 'Images served directly from GoogleUserContent CDN'
        }
      };

    } catch (error) {
      const errorResponse = handleApiError(error, 'Failed to fetch frames');
      return {
        success: false,
        message: errorResponse.message,
        frames: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalFrames: 0,
          framesPerPage: limit || 0,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 0,
          endIndex: 0
        },
        filters: {
          season: season || null,
          episode: episode || null
        }
      };
    }
  }
}

export const framesService = new FramesService();