import { describe, expect, test } from "bun:test";
import { partitionByType } from "./strain-directory-cache";
import type { StrainPreview } from "./leafly";

function preview(name: string, type?: string): StrainPreview {
  return { name, slug: name.toLowerCase().replace(/\s+/g, "-"), type };
}

describe("partitionByType", () => {
  test("splits indica, sativa, and hybrid into their own buckets", () => {
    const out = partitionByType([
      preview("Granddaddy Purple", "indica"),
      preview("Sour Diesel", "sativa"),
      preview("Blue Dream", "hybrid"),
    ]);
    expect(out.indica.map((p) => p.name)).toEqual(["Granddaddy Purple"]);
    expect(out.sativa.map((p) => p.name)).toEqual(["Sour Diesel"]);
    expect(out.hybrid.map((p) => p.name)).toEqual(["Blue Dream"]);
  });

  test("drops rows with an unknown or missing type from every bucket", () => {
    const out = partitionByType([
      preview("Northern Lights", "indica"),
      preview("Mystery", undefined),
      preview("Other", "unknown-type"),
    ]);
    expect(out.indica.map((p) => p.name)).toEqual(["Northern Lights"]);
    expect(out.sativa).toEqual([]);
    expect(out.hybrid).toEqual([]);
  });

  test("preserves input order within each bucket", () => {
    const out = partitionByType([
      preview("Northern Lights", "indica"),
      preview("Bubba Kush", "indica"),
      preview("Purple Punch", "indica"),
    ]);
    expect(out.indica.map((p) => p.name)).toEqual([
      "Northern Lights",
      "Bubba Kush",
      "Purple Punch",
    ]);
  });

  test("returns empty buckets for an empty input", () => {
    const out = partitionByType([]);
    expect(out.indica).toEqual([]);
    expect(out.sativa).toEqual([]);
    expect(out.hybrid).toEqual([]);
  });
});
