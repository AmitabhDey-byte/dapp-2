import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAmount, formatRelativeDate, normalizeError, truncateAddress } from "./format.ts";

describe("format helpers", () => {
  it("formats large pool amounts with separators", () => {
    assert.equal(formatAmount(1234567), "1,234,567");
  });

  it("shortens wallet addresses for compact mobile cards", () => {
    assert.equal(truncateAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"), "GABCDE...7890");
  });

  it("normalizes unknown failures into a safe message", () => {
    assert.equal(normalizeError({ reason: "rpc timeout" }), "Something went wrong");
  });

  it("formats Soroban bigint timestamps without crashing", () => {
    assert.match(formatRelativeDate(1782842530n), /2026/);
  });
});
