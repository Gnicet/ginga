import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { accountApi } from "./accounts.mjs";
import { roomApi } from "./rooms.mjs";
import { muralApi } from "./mural.mjs";

function listen() {
  const server = createServer((req, res) =>
    accountApi(req, res, () =>
      muralApi(req, res, () =>
        roomApi(req, res, () => {
          res.writeHead(404);
          res.end();
        }),
      ),
    ),
  );
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server)),
  );
}
if (process.argv.includes("--fixture")) {
  const server = await listen();
  process.send(server.address().port);
} else
  test("duas contas compartilham cartões, mídia e interações após reiniciar o servidor", async (t) => {
    let dir = mkdtempSync(join(tmpdir(), "praca-mural-"));
    let child, base;
    async function start() {
      child = spawn(
        process.execPath,
        [fileURLToPath(import.meta.url), "--fixture"],
        {
          env: { ...process.env, PRACA_DATA_DIR: dir },
          stdio: ["ignore", "ignore", "inherit", "ipc"],
        },
      );
      base = "http://127.0.0.1:" + (await once(child, "message"))[0];
    }
    async function stop() {
      if (child && child.exitCode === null) {
        const done = once(child, "exit");
        child.kill();
        await done;
      }
    }
    t.after(stop);
    await start();
    async function call(route, cookie, body) {
      return fetch(base + route, {
        method: body ? "POST" : "GET",
        headers: { cookie, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    async function user(name) {
      const r = await call("/api/conta/cadastro", "", {
        email: name + "@example.test",
        password: randomUUID(),
        name,
        city: "Belém • PA",
      });
      assert.equal(r.status, 200);
      return r.headers.get("set-cookie").split(";")[0];
    }
    const ana = await user("Ana"),
      bia = await user("Bia");
    const poll = {
      id: randomUUID(),
      title: "Qual fruta?",
      city: "Belém • PA",
      tribe: "Comida de Boteco",
      track: 1,
      paper: "sol",
      media: { kind: "enquete", options: ["Açaí", "Cupuaçu"] },
    };
    const send = (who, action) => call("/api/mural", who, action);
    const timeline = async (who) => (await call("/api/mural", who)).json();
    assert.equal(
      (await send("", { type: "publish", value: poll })).status,
      401,
    );
    assert.equal(
      (
        await send(ana, {
          type: "publish",
          value: { ...poll, author: "Outra pessoa" },
        })
      ).status,
      200,
    );
    for (const who of [ana, bia])
      assert.equal(
        (await send(who, { id: poll.id, type: "vote", value: 1 })).status,
        200,
      );
    await send(bia, { id: poll.id, type: "vote", value: 1 });
    await send(bia, { id: poll.id, type: "sticker", value: "palmas" });
    await send(bia, { id: poll.id, type: "saved", value: true });
    const note = { id: randomUUID(), text: "Cupuaçu na feira!" };
    await send(bia, { id: poll.id, type: "note", value: note });
    await send(bia, { id: poll.id, type: "note", value: note });
    const picture = {
      ...poll,
      id: randomUUID(),
      media: {
        kind: "visual",
        image:
          "data:image/jpeg;base64," +
          readFileSync("public/media/cafe.jpg").toString("base64"),
      },
    };
    const voice = {
      ...poll,
      id: randomUUID(),
      media: {
        kind: "voz",
        audio:
          "data:audio/wav;base64," +
          readFileSync("public/audio/causo.wav").toString("base64"),
      },
    };
    for (const c of [picture, voice])
      assert.equal(
        (await send(ana, { type: "publish", value: c })).status,
        200,
      );
    const seat = { id: randomUUID(), name: "Ana" };
    const roomReply = await call("/api/rodas/cafe", ana, {
      ...seat,
      message: { id: randomUUID(), text: "Oi da Praça!" },
    });
    assert.equal(roomReply.status, 200);
    const restored = mkdtempSync(join(tmpdir(), "praca-restored-"));
    const copy = spawnSync(
      process.execPath,
      ["backup.mjs", join(restored, "contas.sqlite")],
      { env: { ...process.env, PRACA_DATA_DIR: dir }, encoding: "utf8" },
    );
    assert.equal(copy.status, 0, copy.stderr);
    await stop();
    dir = restored;
    await start();
    const history = await (
      await call("/api/rodas/cafe", bia, { ...seat, id: randomUUID() })
    ).json();
    assert.equal(history.messages.at(-1).text, "Oi da Praça!");
    const a = await timeline(ana),
      b = await timeline(bia),
      card = b.cards.find((c) => c.id === poll.id);
    assert.equal(card.author, "Ana");
    assert.equal(card.mine, false);
    assert.equal(a.cards.find((c) => c.id === poll.id).mine, true);
    assert.deepEqual(card.media.counts, [0, 2]);
    assert.deepEqual(a.saved, []);
    assert.deepEqual(b.saved, [poll.id]);
    assert.equal(card.notes.length, 1);
    assert.equal(card.notes[0].name, "Bia");
    assert.equal(card.counts.palmas, 1);
    const media = b.cards.find((c) => c.id === picture.id).media.image;
    assert.equal(
      (await (await call(media, bia)).json()).src,
      picture.media.image,
    );
    assert.equal(
      (
        await (
          await call(b.cards.find((c) => c.id === voice.id).media.audio, bia)
        ).json()
      ).src,
      voice.media.audio,
    );
  });
