import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { accountApi } from "./accounts.mjs";
import { muralApi } from "./mural.mjs";
import { roomApi } from "./rooms.mjs";

const assets = fileURLToPath(new URL("./dist/", import.meta.url));
if (!existsSync(new URL("./dist/index.html", import.meta.url)))
  throw Error("Execute npm run build antes de iniciar a Praça.");
const serve = sirv(assets, { etag: true });
const port = Number(process.env.PORT || 4173),
  host = process.env.HOST || "127.0.0.1";
createServer((req, res) => {
  accountApi(req, res, () =>
    muralApi(req, res, () =>
      roomApi(req, res, () =>
        serve(req, res, () => {
          res.writeHead(404);
          res.end();
        }),
      ),
    ),
  );
}).listen(port, host, () =>
  console.log("Praça em http://" + host + ":" + port),
);
