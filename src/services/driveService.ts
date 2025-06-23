import fs from "fs";
import path from "path";
import axios from "axios";
import { driveService } from "@/config/googleDrive";
import { getFolderIds, getIndexFolder, getLastIndex } from "./firestoreService";

export async function downloadImage(
  fileId: string,
  filename: string
): Promise<string | null> {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
    });

    const filePath =
      process.env.NODE_ENV === "production"
        ? `/tmp/${filename}`
        : path.join(process.cwd(), "public", filename);

    fs.writeFileSync(filePath, Buffer.from(response.data));
    return filePath;
  } catch (error) {
    console.error("❌ Échec du téléchargement :", error);
    return null;
  }
}

export async function getFolderId(): Promise<string> {
  const folderIds = await getFolderIds();
  const indexFolder = await getIndexFolder();
  const folderId = folderIds[indexFolder];

  if (!folderId) {
    throw new Error(`❌ Aucun dossier trouvé à l'index ${indexFolder}`);
  }

  return folderId;
}

export async function getNextFrameFile(): Promise<{
  id: string;
  name: string;
}> {
  const folderIds = await getFolderIds();
  const indexFolder = await getIndexFolder();
  const folderId = folderIds[indexFolder];
  const lastIndex = await getLastIndex();

  if (!folderId) {
    throw new Error(`❌ Aucun dossier trouvé à l'index ${indexFolder}`);
  }

  const absoluteFrameIndex = indexFolder * 100 + lastIndex + 1;
  const paddedFrame = absoluteFrameIndex.toString().padStart(4, "0");
  const filename = `frame_${paddedFrame}.png`;

  console.log(
    `🔍 Recherche du fichier ${filename} dans le dossier ${folderId}`
  );

  const res = await driveService.files.list({
    q: `'${folderId}' in parents and name='${filename}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1,
  });

  const file = res.data.files?.[0];

  if (!file?.id || !file?.name) {
    throw new Error(`❌ Fichier ${filename} introuvable.`);
  }

  return { id: file.id, name: file.name };
}
