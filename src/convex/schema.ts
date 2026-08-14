import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // Curated strain knowledge base, aggregated from public sources
    // (Leafly, Weedmaps, Reddit discussions, Google results, dispensary menus).
    strains: defineTable({
      name: v.string(),
      slug: v.string(),
      type: v.union(
        v.literal("indica"),
        v.literal("sativa"),
        v.literal("hybrid"),
      ),
      thcRange: v.string(),
      cbdRange: v.string(),
      terpenes: v.array(
        v.object({
          name: v.string(),
          profile: v.string(),
        }),
      ),
      medicalUses: v.array(v.string()),
      effects: v.array(
        v.object({
          name: v.string(),
          intensity: v.number(), // 1-5
        }),
      ),
      sideEffects: v.array(v.string()),
      lineage: v.string(),
      description: v.string(),
      communityNotes: v.array(
        v.object({
          source: v.string(),
          text: v.string(),
        }),
      ),
    }).index("by_name", ["name"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
