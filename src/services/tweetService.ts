import fs from "fs";
import {
  getCurrentEpisodeDoc,
  getIndexFolder,
  getTotalFiles,
  getSeriesDoc,
} from "@/services/firestoreService";
import { downloadImage } from "./driveService";
import TwitterClient from "@/lib/twitterClient";

function extractSeasonNumber(seasonId: string): number {
  const match = seasonId.match(/season-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function tweetImage(
  file: { id: string; name: string },
  index: number
): Promise<void> {
  const [episodeData, folder, totalFiles, seriesData] = await Promise.all([
    getCurrentEpisodeDoc(),
    getIndexFolder(),
    getTotalFiles(),
    getSeriesDoc(),
  ]);

  const episode = episodeData.episodeNumber;
  const seasonId = seriesData.current.seasonId;
  const season = extractSeasonNumber(seasonId);

  const localImagePath = await downloadImage(file.id, file.name);
  if (!localImagePath) {
    console.error("❌ Image download failed.");
    return;
  }

  try {
    const seasonText = season < 10 ? `0${season}` : `${season}`;
    const episodeText = episode < 10 ? `0${episode}` : `${episode}`;
    const indexText = index + folder * 100 + 1;

    const tweetText = `Twin Peaks - S${seasonText}E${episodeText} - Frame ${indexText} of ${totalFiles}`;

    const twitter = new TwitterClient({
      debug: process.env.NODE_ENV !== "production",
    });

    await twitter.init();
    await twitter.tweetWithImages({
      content: tweetText,
      imagePaths: [localImagePath],
    });

    console.log(`✅ Tweeted: ${tweetText}`, new Date());
  } catch (error) {
    console.error("❌ Error tweeting image:", error);
    throw error;
  } finally {
    if (fs.existsSync(localImagePath)) {
      try {
        fs.unlinkSync(localImagePath);
        console.log(`🧹 Deleted image: ${localImagePath}`);
      } catch (err) {
        console.error("❌ Failed to delete image:", err);
      }
    }
  }
}

