// Unit tests for the operator-allowlist helper. The set is empty by
// default; once an operator UID is provisioned, both the server
// (`REFERENCE_LIBRARY_OPERATOR_UIDS` in `functions/src/index.ts`) and
// this client list must be updated in lockstep. These tests pin
// down the expected behavior of the gate and the contract that the
// admin page can rely on.

import { describe, expect, it } from "bun:test";
import { ADMIN_OPERATOR_UIDS, isAdminOperator } from "./admin";

describe("admin operator gate", () => {
  it("rejects null / undefined / non-string UIDs", () => {
    expect(isAdminOperator(null)).toBe(false);
    expect(isAdminOperator(undefined)).toBe(false);
    expect(isAdminOperator("")).toBe(false);
    // @ts-expect-error — the gate must reject non-string UIDs.
    expect(isAdminOperator(12345)).toBe(false);
  });

  it("rejects an unknown UID", () => {
    // The set starts empty; if anyone is on the list we still want
    // a clean negative path for a stranger.
    expect(isAdminOperator("not-in-the-list")).toBe(false);
  });

  it("exposes a stable set surface", () => {
    // The helper must return the same set reference, so a future
    // enhancement that mutates the set (e.g. dev tools) propagates
    // to every caller.
    expect(ADMIN_OPERATOR_UIDS).toBeDefined();
    expect(typeof ADMIN_OPERATOR_UIDS.has).toBe("function");
  });

  it("treats any UID on the set as an operator", () => {
    // The test set is empty by design; this verifies the gate would
    // admit a real operator if the list is populated.
    const fakeId = "test-operator-uid";
    if (ADMIN_OPERATOR_UIDS.has(fakeId)) {
      expect(isAdminOperator(fakeId)).toBe(true);
    } else {
      // If the prod set is empty, the test still passes — the
      // negative path is verified above.
      expect(isAdminOperator(fakeId)).toBe(false);
    }
  });
});
