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
    return inserted;
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
 * Fetch a single strain by id. Used from actions (which cannot read the
 * database directly) via ctx.runQuery.
 */
export const getStrainById = query({
  args: { id: v.id("strains") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
