import {
  getIndexFolder,
  getLastIndex,
  nextLastIndex,
  nextIndexFolder,
  resetLastIndex,
  getCurrentEpisodeDoc,
  getFolderIds,
} from "@/services/firestoreService";
import { getNextFrameFile } from "@/services/driveService";
import { tweetImage } from "@/services/tweetService";
import { nextEpisode } from "@/services/episodeService";

export async function startScheduledTweeting(): Promise<void> {
  try {
    let file: { id: string; name: string } | null = null;

    while (!file) {
      const [indexFolder, lastIndex, folderIds] = await Promise.all([
        getIndexFolder(),
        getLastIndex(),
        getFolderIds(),
      ]);

      try {
        file = await getNextFrameFile();
      } catch (err) {
        console.warn(`⚠️ Fichier introuvable pour l'index ${lastIndex} dans le dossier ${indexFolder}.`);

        const moreFoldersAvailable = indexFolder + 1 < folderIds.length;
        if (moreFoldersAvailable) {
          console.log(`📦 Aucun fichier trouvé, passage au dossier ${indexFolder + 1}`);
          await nextIndexFolder();
          await resetLastIndex();
        } else {
          console.log("🎬 Tous les dossiers terminés. Passage à l’épisode suivant.");
          await nextEpisode();
        }
      }
    }

    const lastIndex = await getLastIndex();

    try {
      await tweetImage(file, lastIndex);
      await nextLastIndex();

      if (lastIndex + 1 >= 100) {
        console.log("↪️ Dernière frame du dossier atteinte, passage au suivant.");
        await nextIndexFolder();
        await resetLastIndex();
      }
    } catch (err) {
      console.warn("⚠️ Tweet échoué, index non avancé.");
      return;
    }

    const episode = await getCurrentEpisodeDoc();
    console.log(`📌 Episode ${episode.episodeNumber} – dossier ${episode.indexFolder} – frame ${episode.lastIndex}`);
  } catch (error) {
    console.error("❌ Erreur dans le scheduler :", error);
  }
}

