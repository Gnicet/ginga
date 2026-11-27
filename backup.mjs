import { backup, DatabaseSync } from "node:sqlite";
import { openSync, closeSync, chmodSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
if (process.argv.length !== 3)
  throw Error("Uso: node backup.mjs caminho/para/copia.sqlite");
const source = join(
  resolve(process.env.PRACA_DATA_DIR || join(homedir(), ".praca")),
  "contas.sqlite",
);
const destination = resolve(process.argv[2]);
const db = new DatabaseSync(source, { readOnly: true });
try {
  closeSync(openSync(destination, "wx", 0o600));
  try {
    await backup(db, destination);
    const copy = new DatabaseSync(destination, { readOnly: true });
    try {
      if (copy.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
        throw Error("Cópia inconsistente.");
    } finally {
      copy.close();
    }
    chmodSync(destination, 0o600);
    console.log("Backup verificado:", destination);
  } catch (error) {
    unlinkSync(destination);
    throw error;
  }
} finally {
  db.close();
}
