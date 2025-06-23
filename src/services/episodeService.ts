import "dotenv/config";
import { firestore } from "@/config/firebase";

const SERIES_ID = process.env.SERIES_ID;

export async function nextEpisode(): Promise<void> {
  if (!SERIES_ID) {
    throw new Error("❌ La variable d'environnement SERIES_ID est manquante.");
  }
  const seriesRef = firestore.collection("series").doc(SERIES_ID);
  const seriesDoc = await seriesRef.get();

  if (!seriesDoc.exists) throw new Error("📛 Document série introuvable");

  const current = seriesDoc.data()?.current;
  const seasonId = current?.seasonId;
  const episodeId = current?.episodeId;

  const episodesRef = seriesRef
    .collection("seasons")
    .doc(seasonId)
    .collection("episodes");
  const allEpisodes = await episodesRef.listDocuments();
  const currentIndex = allEpisodes.findIndex((d) => d.id === episodeId);

  if (currentIndex === -1) {
    throw new Error("❌ Épisode courant non trouvé.");
  }

  if (currentIndex + 1 >= allEpisodes.length) {
    console.log(
      "✅ Tous les épisodes sont terminés. Passage à la saison suivante."
    );
    return await nextSeason();
  }

  const nextEpisodeRef = allEpisodes[currentIndex + 1];
  const nextEpisodeId = nextEpisodeRef.id;

  await seriesRef.update({
    "current.episodeId": nextEpisodeId,
  });

  await nextEpisodeRef.update({
    lastIndex: 0,
    indexFolder: 0,
  });

  console.log("🎞️ Passage à l’épisode suivant");
}

export async function nextSeason(): Promise<void> {
  if (!SERIES_ID) {
    throw new Error("❌ La variable d'environnement SERIES_ID est manquante.");
  }
  const seriesRef = firestore.collection("series").doc(SERIES_ID);
  const seriesDoc = await seriesRef.get();
  if (!seriesDoc.exists) throw new Error("📛 Document série introuvable");

  const current = seriesDoc.data()?.current;
  const seasonId = current?.seasonId;

  const seasonsRef = seriesRef.collection("seasons");
  const allSeasons = await seasonsRef.listDocuments();
  const currentSeasonIndex = allSeasons.findIndex((d) => d.id === seasonId);

  if (currentSeasonIndex === -1) {
    throw new Error("❌ Saison courante non trouvée.");
  }

  if (currentSeasonIndex + 1 >= allSeasons.length) {
    console.log("✅ Toutes les saisons sont terminées.");
    return;
  }

  const nextSeasonRef = allSeasons[currentSeasonIndex + 1];
  const nextSeasonId = nextSeasonRef.id;

  const episodesRef = nextSeasonRef.collection("episodes");
  const episodes = await episodesRef.listDocuments();
  if (episodes.length === 0) {
    throw new Error("❌ Aucune épisode trouvée dans la saison suivante.");
  }

  const firstEpisodeRef = episodes[0];

  await seriesRef.update({
    "current.seasonId": nextSeasonId,
    "current.episodeId": firstEpisodeRef.id,
  });

  await firstEpisodeRef.update({
    lastIndex: 0,
    indexFolder: 0,
  });

  console.log(`🎬 Passage à la saison suivante : ${nextSeasonId}`);
}
