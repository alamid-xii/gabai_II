import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { createPasswordResetHandlers } from "./passwordResetController.js";

function setup() {
  const state = { reset: null, link: null };
  const user = { id: 1, email: "student@example.com", authProvider: "password", isActive: true,
    async update(values) { Object.assign(this, values); } };
  const handlers = createPasswordResetHandlers({
    User: { findOne: async ({ where }) => where.email === user.email ? user : null, findByPk: async () => user },
    PasswordReset: {
      async upsert(values) { state.reset = { ...values, async destroy() { state.reset = null; } }; },
      async findOne({ where }) {
        return state.reset?.tokenHash === where.tokenHash && state.reset.expiresAt > where.expiresAt[Op.gt] ? state.reset : null;
      },
      async destroy() { state.reset = null; },
    },
    sequelize: { transaction: async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } }) },
    sendPasswordResetEmail: async (_user, link) => { state.link = link; return true; },
  });
  async function call(handler, body) {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
    await handlers[handler]({ body }, res);
    return res;
  }
  return { state, user, call };
}

test("password recovery stores only a token hash, replaces links, hashes passwords and prevents reuse", async () => {
  process.env.EMAIL_USER = "test@example.com";
  process.env.EMAIL_PASSWORD = "test-only";
  const { state, user, call } = setup();
  const sent = await call("forgotPassword", { email: " STUDENT@example.com " });
  assert.equal(sent.statusCode, 200);
  const first = new URL(state.link).searchParams.get("token");
  assert.equal(state.reset.tokenHash, crypto.createHash("sha256").update(first).digest("hex"));
  await call("forgotPassword", { email: user.email });
  assert.equal((await call("resetPassword", { token: first, password: "NewPassword123" })).statusCode, 400);
  const token = new URL(state.link).searchParams.get("token");
  assert.equal((await call("resetPassword", { token, password: "short" })).statusCode, 400);
  assert.equal((await call("resetPassword", { token, password: "LongPassword" })).statusCode, 400);
  assert.equal((await call("resetPassword", { token, password: "longpassword123" })).statusCode, 400);
  assert.equal((await call("resetPassword", { token, password: "NewPassword123" })).statusCode, 200);
  assert.equal(await bcrypt.compare("NewPassword123", user.password), true);
  assert.equal((await call("resetPassword", { token, password: "OtherPassword123" })).statusCode, 400);
});

test("expired or malformed links are rejected; unknown, Google and disabled accounts get the same response", async () => {
  const { state, user, call } = setup();
  const known = await call("forgotPassword", { email: user.email });
  const token = new URL(state.link).searchParams.get("token");
  state.reset.expiresAt = new Date(Date.now() - 1);
  assert.equal((await call("resetPassword", { token, password: "NewPassword123" })).statusCode, 400);
  assert.equal((await call("resetPassword", { token: {}, password: "NewPassword123" })).statusCode, 400);
  assert.equal((await call("forgotPassword", { email: {} })).statusCode, 400);
  const unknown = await call("forgotPassword", { email: "unknown@example.com" });
  assert.deepEqual(known.body, unknown.body);
  state.link = null;
  user.authProvider = "google";
  assert.deepEqual((await call("forgotPassword", { email: user.email })).body, known.body);
  assert.equal(state.link, null);
  user.authProvider = "password";
  user.isActive = false;
  assert.deepEqual((await call("forgotPassword", { email: user.email })).body, known.body);
  assert.equal(state.link, null);
});
