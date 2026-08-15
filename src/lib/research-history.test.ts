import { describe, expect, test } from "bun:test";
import {
  clipHistoryTitle,
  HISTORY_TITLE_MAX,
  historyCloudData,
} from "./research-history";

describe("historyCloudData", () => {
  test("clips title to the Firestore rule max (size < 200)", () => {
    const title = "Best strains for " + "pain, ".repeat(50);
    const doc = historyCloudData({
      id: "abc",
      kind: "find",
      title,
      createdAt: 1,
    });
    expect(clipHistoryTitle(title).length).toBe(HISTORY_TITLE_MAX);
    expect(doc.title.length).toBe(199);
    expect(doc.title.length).toBeLessThan(200);
    expect(doc.kind).toBe("find");
    expect(doc.createdAt).toBe(1);
  });
});
