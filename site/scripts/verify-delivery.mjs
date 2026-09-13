import assert from "node:assert/strict";
import { createShareToken, hashShareToken } from "../lib/delivery/share-token.ts";

const first = createShareToken();
const second = createShareToken();
assert.match(first, /^[A-Za-z0-9_-]{43}$/);
assert.match(second, /^[A-Za-z0-9_-]{43}$/);
assert.notEqual(first, second);

const firstHash = await hashShareToken(first);
const secondHash = await hashShareToken(second);
assert.match(firstHash, /^[a-f0-9]{64}$/);
assert.match(secondHash, /^[a-f0-9]{64}$/);
assert.notEqual(firstHash, secondHash);
assert.equal(await hashShareToken("token-curto"), null);

console.log("PASS: links de presente usam tokens aleatórios e armazenam somente hashes SHA-256");
