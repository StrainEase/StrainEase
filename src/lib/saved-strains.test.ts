import { describe, expect, test } from "bun:test";
import { savedStrainFields, slugify } from "./saved-strains";

describe("savedStrainFields", () => {
  test("does not include notes so a merge save cannot wipe them", () => {
    const fields = savedStrainFields({
      name: "Granddaddy Purple",
      inKnowledgeBase: true,
      type: "indica",
      thcRange: "17–23%",
    });
    expect(fields.name).toBe("Granddaddy Purple");
    expect(fields.type).toBe("indica");
    expect(fields.thcRange).toBe("17–23%");
    expect(fields).not.toHaveProperty("notes");
  });

  test("slugify rejects punctuation-only names used as doc ids", () => {
    expect(slugify("Granddaddy Purple")).toBe("granddaddy-purple");
    expect(slugify("???")).toBe("");
  });
});
