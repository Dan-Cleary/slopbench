import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  runs: defineTable({
    model: v.string(),
    run_date: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed")
    ),
    slop_score: v.optional(v.number()),
    total_words: v.optional(v.number()),
    total_slop_instances: v.optional(v.number()),
    bullet_rate: v.optional(v.number()),
    pure_slop_rate: v.optional(v.number()),
    em_dash_rate: v.optional(v.number()),
    total_cost_usd: v.optional(v.number()),
    avg_latency_ms: v.optional(v.number()),
    error_message: v.optional(v.string()),
  }).index("by_status", ["status"]),

  responses: defineTable({
    run_id: v.id("runs"),
    prompt_id: v.string(),
    prompt: v.string(),
    response: v.string(),
    slop_hits: v.array(v.object({ type: v.string(), match: v.string() })),
    word_count: v.number(),
    cost_usd: v.optional(v.number()),
    latency_ms: v.number(),
  }).index("by_run_id", ["run_id"]),
});
