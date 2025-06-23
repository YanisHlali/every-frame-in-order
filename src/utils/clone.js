require("dotenv/config");
require("tsconfig-paths/register");
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "NodeNext",
    moduleResolution: "NodeNext",
  },
});

const { cloneFirestoreDoc } = require("./cloneFirestoreDoc.ts");
const SERIES_ID = process.env.SERIES_ID;

cloneFirestoreDoc(`series/${SERIES_ID}`, `series/${SERIES_ID}-test`)
  .then(() => {
    console.log("✅ Clonage terminé.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erreur lors du clonage :", err);
    process.exit(1);
  });
