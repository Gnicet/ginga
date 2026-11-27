import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { accountApi } from "./accounts.mjs";
import { DatabaseSync } from "node:sqlite";
import { roomApi } from "./rooms.mjs";
import rules from "./src/data/regras.json" with { type: "json" };

test("cadastro, sessão persistente, perfil, rodas e revogação", async (t) => {
  process.env.PRACA_DATA_DIR = mkdtempSync(join(tmpdir(), "praca-auth-test-"));
  const legacy = new DatabaseSync(join(process.env.PRACA_DATA_DIR,"contas.sqlite"));
  legacy.exec(`CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,city TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
    INSERT INTO accounts VALUES('legacy','antiga@example.test','Antiga','Belém','','');`);
  legacy.close();
  const server = createServer((req, res) =>
    accountApi(req, res, () =>
      roomApi(req, res, () => {
        res.writeHead(404);
        res.end();
      }),
    ),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const origin = "http://127.0.0.1:" + server.address().port;
  const call = (path, data, cookie = "") =>
    fetch(origin + path, {
      method: data ? "POST" : "GET",
      headers: { "Content-Type": "application/json", cookie },
      body: data ? JSON.stringify(data) : undefined,
    });
  const form = {
    name: "Ana",
    city: "Recife • PE",
    email: "ANA@example.test",
    password: randomUUID(),
  };
  assert.equal((await call("/api/rodas")).status, 401);
  assert.equal(
    (await call("/api/conta/cadastro", { ...form, password: "curta" })).status,
    400,
  );
  const signup = await call("/api/conta/cadastro", form);
  assert.equal(signup.status, 200);
  const migrated = new DatabaseSync(join(process.env.PRACA_DATA_DIR,"contas.sqlite"));
  assert.equal(migrated.prepare("SELECT name FROM accounts WHERE id='legacy'").get().name,"Antiga");
  assert.equal(migrated.prepare("SELECT count(*) AS total FROM rule_acceptances WHERE account='legacy'").get().total,0);
  migrated.close();
  const cookie = signup.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  const session = cookie.split(";")[0];
  const user = (await signup.json()).account;
  assert.equal(user.acceptedRules,null);
  assert.equal(user.email, "ana@example.test");
  assert.equal((await call("/api/conta/cadastro", form)).status, 409);
  assert.equal(
    (await call("/api/conta/entrar", { ...form, password: "errada" })).status,
    401,
  );
  assert.equal(
    (await (await call("/api/conta/sessao", undefined, session)).json()).account
      .id,
    user.id,
  );
  const restart = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import {currentAccount} from './accounts.mjs'; if(currentAccount({headers:{cookie:process.env.TEST_COOKIE}})?.name!=='Ana')process.exit(1)",
    ],
    { env: { ...process.env, TEST_COOKIE: session } },
  );
  assert.equal(restart.status, 0);
  assert.equal(
    (await call("/api/conta/perfil", { name: "Ana Luz" }, session)).status,
    200,
  );
  const draft = {id:randomUUID(),name:"Ana",message:{id:randomUUID(),text:"Antes do aceite"}};
  assert.equal((await call("/api/rodas/cafe",draft,session)).status,428);
  assert.equal((await call("/api/conta/aceitar-regras",{version:"antiga"},session)).status,409);
  assert.equal((await call("/api/conta/aceitar-regras",{version:rules.version})).status,401);
  for (let attempt = 0; attempt < 2; attempt++) {
    const accepted = await call("/api/conta/aceitar-regras",{version:rules.version},session);
    assert.equal((await accepted.json()).account.acceptedRules,rules.version);
  }
  const chat = await call(
    "/api/rodas/cafe",
    {
      id: randomUUID(),
      name: "Outro nome",
      message: { id: randomUUID(), text: "Olá!" },
    },
    session,
  );
  assert.equal((await chat.json()).messages.at(-1).name, "Ana Luz");
  assert.equal((await call("/api/conta/sair", {}, session)).status, 200);
  assert.equal((await call("/api/rodas", undefined, session)).status, 401);
  assert.equal(
    (await (await call("/api/conta/sessao", undefined, session)).json())
      .account,
    null,
  );
  const login = await call("/api/conta/entrar", form);
  const restored = (await login.json()).account;
  assert.equal(restored.id,user.id);
  assert.equal(restored.acceptedRules,rules.version);
  assert.notEqual(login.headers.get("set-cookie").split(";")[0], session);
  const active = login.headers.get("set-cookie").split(";")[0];
  const issue = (password) => call("/api/conta/codigo", { password }, active);
  assert.equal((await issue("incorreta")).status, 403);
  const old = (await (await issue(form.password)).json()).code;
  const code = (await (await issue(form.password)).json()).code;
  assert.match(code, /^[0-9a-f]{32}$/);
  const reset = { email: form.email, password: randomUUID(), code };
  const recover = (data) => call("/api/conta/recuperar", data);
  assert.equal((await recover({ ...reset, code: old })).status, 400);
  assert.equal((await recover({ ...reset, email: "outro@example.test" })).status, 400);
  assert.equal((await recover({ ...reset, password: "curta" })).status, 400);
  const raced = await Promise.all([recover(reset), recover(reset)]);
  assert.deepEqual(raced.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await call("/api/rodas", undefined, active)).status, 401);
  assert.equal((await call("/api/conta/entrar", form)).status, 401);
  assert.equal((await (await call("/api/conta/entrar", reset)).json()).account.id, user.id);
});
