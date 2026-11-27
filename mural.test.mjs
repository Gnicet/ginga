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
import rules from "./src/data/regras.json" with { type: "json" };

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
    const passwords = new Map();
    async function user(name) {
      passwords.set(name,randomUUID());
      const r = await call("/api/conta/cadastro", "", {
        email: name + "@example.test",
        password: passwords.get(name),
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
    for (const who of [ana,bia]) {
      const feed = (await (await call("/api/mural",who)).json()).cards;
      assert.equal((await send(who,{type:"saved",id:feed[0].id,value:false})).status,200);
      assert.equal((await send(who,{type:"publish",value:poll})).status,428);
      assert.equal((await call("/api/conta/aceitar-regras",who,{version:rules.version})).status,200);
    }
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
    const action = (who,route,fields) => call("/api/conta/"+route,who,fields);
    const anaId = card.owner, biaId = card.notes[0].owner;
    const friend = (who,target,verb,link) => action(who,"amizade",{action:verb,target,link});
    const friends = async who => (await timeline(who)).friends;
    const invite = async () => {
      assert.equal((await friend(ana,biaId,"convidar")).status,200);
      return (await friends(bia))[0].link;
    };
    assert.equal((await friend("",biaId,"convidar")).status,401);
    assert.equal((await friend(ana,anaId,"convidar")).status,400);
    let link = await invite();
    assert.equal(await invite(),link);
    assert.equal((await friend(bia,anaId,"convidar")).status,200);
    assert.deepEqual(await friends(bia),[{link,id:anaId,name:"Ana",status:"recebido"}]);
    assert.equal((await friend(ana,biaId,"aceitar",link)).status,409);
    assert.equal((await friend(bia,anaId,"recusar",link)).status,200);
    assert.deepEqual(await friends(ana),[]);
    link = await invite();
    assert.equal((await friend(ana,biaId,"cancelar",link)).status,200);
    const nextLink = await invite();
    assert.equal((await friend(bia,anaId,"aceitar",link)).status,409);
    assert.equal((await friend(bia,anaId,"aceitar",nextLink)).status,200);
    await stop();
    await start();
    assert.equal((await friends(ana))[0].status,"amigo");
    assert.equal((await friends(bia))[0].status,"amigo");
    assert.equal((await friend(ana,biaId,"desfazer",nextLink)).status,200);
    assert.deepEqual(await friends(bia),[]);
    link = await invite();
    assert.equal((await friend(bia,anaId,"aceitar",link)).status,200);
    const report = {kind:"cartao",target:picture.id,reason:"Spam ou golpe"};
    assert.equal((await action(bia,"denunciar",report)).status,200);
    assert.equal((await action(bia,"denunciar",report)).status,200);
    const moderate = (...args) => spawnSync(process.execPath,["moderate.mjs",...args],{env:{...process.env,PRACA_DATA_DIR:dir},encoding:"utf8"});
    const listing = moderate("listar");
    assert.equal(listing.status,0,listing.stderr);
    const ticket = JSON.parse(listing.stdout.trim());
    assert.equal(ticket.target,picture.id);
    assert.equal((await action(bia,"bloquear",{target:card.owner})).status,200);
    assert.deepEqual(await friends(ana),[]);
    assert.equal((await friend(ana,biaId,"convidar")).status,404);
    assert.equal((await friend(bia,anaId,"convidar")).status,404);
    assert.equal((await timeline(bia)).cards.some(c=>c.id===poll.id),false);
    assert.equal((await call(media,bia)).status,404);
    assert.equal((await send(bia,{id:poll.id,type:"vote",value:0})).status,404);
    assert.deepEqual((await timeline(ana)).cards.find(c=>c.id===poll.id).notes,[]);
    assert.deepEqual((await (await call("/api/rodas/cafe",bia,seat)).json()).messages,[]);
    assert.equal((await action(bia,"desbloquear",{target:card.owner})).status,200);
    assert.deepEqual(await friends(bia),[]);
    await invite();
    assert.equal((await call(media,bia)).status,200);
    assert.equal(moderate("agir",ticket.id).status,0);
    assert.equal((await call(media,bia)).status,404);
    assert.equal((await timeline(bia)).cards.some(c=>c.id===picture.id),false);
    const deletion = {email:"Ana@example.test",password:passwords.get("Ana"),confirm:"EXCLUIR"};
    assert.equal((await action("","excluir",{...deletion,password:"incorreta"})).status,403);
    assert.equal((await action("","excluir",deletion)).status,200);
    assert.deepEqual(await friends(bia),[]);
    assert.equal((await call("/api/mural",ana)).status,401);
    assert.equal((await timeline(bia)).cards.some(c=>c.owner===card.owner),false);
    assert.equal((await call(b.cards.find(c=>c.id===voice.id).media.audio,bia)).status,404);
    assert.deepEqual((await (await call("/api/rodas/cafe",bia,seat)).json()).messages,[]);
  });
