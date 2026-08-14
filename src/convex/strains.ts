import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { SEED_STRAINS } from "./strainData";

/**
 * Seed the strain knowledge base. Idempotent: only inserts strains whose
 * name does not already exist, so it is safe to call repeatedly.
 */
export const seedStrains = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const strain of SEED_STRAINS) {
      const existing = await ctx.db
        .query("strains")
        .withIndex("by_name", (q) => q.eq("name", strain.name))
        .first();
      if (existing === null) {
        await ctx.db.insert("strains", strain);
        inserted += 1;
      }
    }
    return { inserted, total: SEED_STRAINS.length };
  },
});

/**
 * All strains in the knowledge base. The dataset is small and curated,
 * so returning everything and filtering client-side keeps this simple.
 */
export const listStrains = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("strains").order("asc").collect();
  },
});

/**
 * Fetch strains matching any of the given names (case-insensitive).
 * Used from the compare action so users can search ANY strain name —
 * strains that match the curated knowledge base get full profiles,
 * anything else is researched by the AI instead.
 */
export const getStrainsByNames = query({
  args: { names: v.array(v.string()) },
  handler: async (ctx, { names }) => {
    if (names.length === 0) return [];
    const wanted = new Set(names.map((n) => n.trim().toLowerCase()));
    const all = await ctx.db.query("strains").collect();
    return all.filter((s) => wanted.has(s.name.toLowerCase()));
  },
});
