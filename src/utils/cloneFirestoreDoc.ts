import { firestore } from "@/config/firebase";

export async function cloneFirestoreDoc(fromPath: string, toPath: string) {
  console.log(`✅ Copié: ${fromPath} → ${toPath}`);
  const fromRef = firestore.doc(fromPath);
  const toRef = firestore.doc(toPath);

  const snapshot = await fromRef.get();

  if (!snapshot.exists) {
    throw new Error(`❌ Le document ${fromPath} n'existe pas`);
  }

  const data = snapshot.data();
  if (!data) {
    throw new Error(`❌ Aucune donnée dans ${fromPath}`);
  }

  await toRef.set(data);
  console.log(`✅ Copié: ${fromPath} → ${toPath}`);

  const subcollections = await fromRef.listCollections();

  for (const subcol of subcollections) {
    const docs = await subcol.get();
    for (const doc of docs.docs) {
      const subFromPath = `${fromPath}/${subcol.id}/${doc.id}`;
      const subToPath = `${toPath}/${subcol.id}/${doc.id}`;
      await cloneFirestoreDoc(subFromPath, subToPath);
    }
  }
  console.log("✅ Clonage terminé.");
}
