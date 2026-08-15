import { describe, expect, test } from "bun:test";
import { pickWeedmapsSlug } from "./weedmaps";

const hits = [
  { attributes: { name: "Blue Dream", slug: "blue-dream" } },
  { attributes: { name: "Blue Cheese", slug: "blue-cheese" } },
];

describe("pickWeedmapsSlug", () => {
  test("returns the exact name match", () => {
    expect(pickWeedmapsSlug(hits, "Blue Cheese")).toBe("blue-cheese");
  });

  test("does not fall back to the first search hit", () => {
    expect(pickWeedmapsSlug(hits, "Nature's Gift")).toBeNull();
  });
});
