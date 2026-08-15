import { describe, expect, test } from "bun:test";
import { redditNotesFor } from "./enrich";

describe("redditNotesFor", () => {
  test("keeps quotes fetched under the query name after a catalog rename", () => {
    const notes = [{ source: "Reddit · r/trees", text: "GSC knocks me out." }];
    const map = new Map([["gsc", notes]]);
    expect(redditNotesFor(map, "GSC", "Girl Scout Cookies")).toEqual(notes);
  });

  test("still matches when the profile name is the map key", () => {
    const notes = [{ source: "Reddit · r/trees", text: "Blue Dream is daytime." }];
    const map = new Map([["blue dream", notes]]);
    expect(redditNotesFor(map, "Blue Dream", "Blue Dream")).toEqual(notes);
  });
});
