import { db } from "./accounts.mjs";
import { targetInfo, resolveReport } from "./community.mjs";

const [command = "listar",id] = process.argv.slice(2);
const s = db();
if (command === "listar") {
  for (const r of s.prepare("SELECT id,kind,target,room,reason,created FROM reports ORDER BY created").iterate())
    console.log(JSON.stringify({...r, content:targetInfo(s,r.kind,r.target,r.room)?.description ?? "Conteúdo indisponível"}));
} else if (id && ["agir","arquivar"].includes(command)) {
  s.exec("BEGIN IMMEDIATE");
  try {
    resolveReport(s,id,command);
    s.exec("COMMIT");
    console.log("Denúncia resolvida.");
  } catch (error) {
    s.exec("ROLLBACK");
    throw error;
  }
} else throw Error("Use listar, agir ID ou arquivar ID.");
