import { describe, expect, test } from "bun:test";
import { readNavigatedProfile } from "./navigated-profile";

const blueDream = {
  name: "Blue Dream",
  inKnowledgeBase: true,
  imageUrl: "https://leafly-public.imgix.net/blue-dream.jpg",
};

describe("readNavigatedProfile", () => {
  test("returns the profile the user clicked when it matches the strain", () => {
    expect(readNavigatedProfile({ profile: blueDream }, "blue-dream")).toEqual(
      blueDream,
    );
  });

  test("ignores a stale profile from another strain", () => {
    expect(
      readNavigatedProfile(
        { profile: { ...blueDream, name: "OG Kush" } },
        "blue-dream",
      ),
    ).toBeNull();
  });

  test("returns null when there is no router state", () => {
    expect(readNavigatedProfile(null, "blue-dream")).toBeNull();
    expect(readNavigatedProfile(undefined, "blue-dream")).toBeNull();
  });

  test("returns null for a malformed state", () => {
    expect(readNavigatedProfile("nope", "blue-dream")).toBeNull();
    expect(readNavigatedProfile({}, "blue-dream")).toBeNull();
    expect(
      readNavigatedProfile(
        { profile: { inKnowledgeBase: true } },
        "blue-dream",
      ),
    ).toBeNull();
  });
});
