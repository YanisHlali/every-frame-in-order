import "dotenv/config";
import { firestore } from "@/config/firebase";
import admin from "firebase-admin";

const FieldValue = admin.firestore.FieldValue;

const SERIES_ID = process.env.SERIES_ID;

export interface EpisodeData {
  episodeNumber: number;
  folderIds: string[];
  totalFiles: number;
  lastIndex: number;
  indexFolder: number;
}

export async function getSeriesDoc() {
  if (!SERIES_ID) {
    throw new Error("❌ La variable d'environnement SERIES_ID est requise.");
  }

  const doc = await firestore.collection("series").doc(SERIES_ID).get();
  return doc.data() as {
    current: {
      seasonId: string;
      episodeId: string;
    };
  };
}

export async function getCurrentEpisodeDoc(): Promise<EpisodeData> {
  if (!SERIES_ID) {
    throw new Error("❌ La variable d'environnement SERIES_ID est requise.");
  }

  const { current } = await getSeriesDoc();

  const doc = await firestore
    .collection("series")
    .doc(SERIES_ID)
    .collection("seasons")
    .doc(current.seasonId)
    .collection("episodes")
    .doc(current.episodeId)
    .get();

  return doc.data() as EpisodeData;
}

export async function getIndexFolder(): Promise<number> {
  const ep = await getCurrentEpisodeDoc();
  return ep.indexFolder ?? 0;
}

export async function getLastIndex(): Promise<number> {
  const ep = await getCurrentEpisodeDoc();
  return ep.lastIndex ?? 0;
}

export async function getTotalFiles(): Promise<number> {
  const ep = await getCurrentEpisodeDoc();
  return ep.totalFiles ?? 0;
}

export async function getFolderIds(): Promise<string[]> {
  const ep = await getCurrentEpisodeDoc();
  return ep.folderIds ?? [];
}

export async function getFolderId(): Promise<string> {
  const ep = await getCurrentEpisodeDoc();
  const folderId = ep.folderIds?.[ep.indexFolder];
  if (!folderId) throw new Error("❌ Aucun dossier Drive disponible.");
  return folderId;
}

export async function nextLastIndex(): Promise<void> {
  if (!SERIES_ID) {
    throw new Error("❌ La variable d'environnement SERIES_ID est requise.");
  }

  const { current } = await getSeriesDoc();
  const ref = firestore
    .collection("series")
    .doc(SERIES_ID)
    .collection("seasons")
    .doc(current.seasonId)
    .collection("episodes")
    .doc(current.episodeId);

  await ref.update({
    lastIndex: FieldValue.increment(1),
  });
}

export async function resetLastIndex(): Promise<void> {
  if (!SERIES_ID) {
    throw new Error("❌ La variable d'environnement SERIES_ID est requise.");
  }

  const { current } = await getSeriesDoc();
  const ref = firestore
    .collection("series")
    .doc(SERIES_ID)
    .collection("seasons")
    .doc(current.seasonId)
    .collection("episodes")
    .doc(current.episodeId);

  await ref.update({ lastIndex: 0 });
}

export async function nextIndexFolder(): Promise<void> {
  if (!SERIES_ID) {
    throw new Error("❌ La variable d'environnement SERIES_ID est requise.");
  }

  const { current } = await getSeriesDoc();
  const ref = firestore
    .collection("series")
    .doc(SERIES_ID)
    .collection("seasons")
    .doc(current.seasonId)
    .collection("episodes")
    .doc(current.episodeId);

  await ref.update({
    indexFolder: FieldValue.increment(1),
  });
}
