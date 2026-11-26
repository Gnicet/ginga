import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { accountApi } from "./accounts.mjs";
import { roomApi } from "./rooms.mjs";

test("cadastro, sessão persistente, perfil, rodas e revogação", async (t) => {
  process.env.PRACA_DATA_DIR = mkdtempSync(join(tmpdir(), "praca-auth-test-"));
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
  const cookie = signup.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  const session = cookie.split(";")[0];
  const user = (await signup.json()).account;
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
  assert.equal((await login.json()).account.id, user.id);
  assert.notEqual(login.headers.get("set-cookie").split(";")[0], session);
});
