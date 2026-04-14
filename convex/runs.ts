import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { analytics } from "./analytics";

// Helper to validate secret
function checkAuth(secret: string) {
  const expectedSecret = process.env.BENCHMARK_SECRET;
  if (!expectedSecret) {
    throw new Error("BENCHMARK_SECRET not configured");
  }
  if (secret !== expectedSecret) {
    throw new Error("Unauthorized: invalid secret");
  }
}

export const clearAllData = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    checkAuth(args.secret);
    const runs = await ctx.db.query("runs").take(1000);
    const responses = await ctx.db.query("responses").take(10000);
    await Promise.all([
      ...runs.map(r => ctx.db.delete(r._id)),
      ...responses.map(r => ctx.db.delete(r._id)),
    ]);
    await analytics.track(ctx, {
      name: "data_cleared",
      userId: "admin",
      props: { deleted_runs: runs.length, deleted_responses: responses.length },
    });
    return { deleted_runs: runs.length, deleted_responses: responses.length };
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_status", (q) => q.eq("status", "complete"))
      .take(100);
    // Keep only the most recent run per model
    const latest = new Map<string, typeof runs[0]>()
    for (const run of runs) {
      if (run.pure_slop_rate === undefined) continue
      const existing = latest.get(run.model)
      if (!existing || run.run_date > existing.run_date) {
        latest.set(run.model, run)
      }
    }
    return Array.from(latest.values())
      .sort((a, b) => (a.pure_slop_rate ?? Infinity) - (b.pure_slop_rate ?? Infinity));
  },
});

export const getResponsesByRunId = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("responses")
      .withIndex("by_run_id", (q) => q.eq("run_id", args.runId))
      .take(200);
  },
});

export const getRunById = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const createRun = mutation({
  args: { model: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    checkAuth(args.secret);
    const runId = await ctx.db.insert("runs", {
      model: args.model,
      run_date: Date.now(),
      status: "pending",
    });
    await analytics.track(ctx, {
      name: "run_created",
      userId: args.model,
      props: { model: args.model },
    });
    return runId;
  },
});

export const updateRunStatus = mutation({
  args: {
    runId: v.id("runs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed")
    ),
    error_message: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(args.secret);
    await ctx.db.patch(args.runId, {
      status: args.status,
      ...(args.error_message !== undefined
        ? { error_message: args.error_message }
        : {}),
    });
    if (args.status === "running") {
      const run = await ctx.db.get(args.runId);
      if (run) {
        await analytics.track(ctx, {
          name: "run_started",
          userId: run.model,
          props: { model: run.model },
        });
      }
    }
    if (args.status === "failed") {
      const run = await ctx.db.get(args.runId);
      if (run) {
        await analytics.track(ctx, {
          name: "run_failed",
          userId: run.model,
          props: {
            model: run.model,
            ...(args.error_message !== undefined
              ? { error_message: args.error_message }
              : {}),
          },
        });
      }
    }
  },
});

export const saveResponse = mutation({
  args: {
    runId: v.id("runs"),
    promptId: v.string(),
    prompt: v.string(),
    response: v.string(),
    slopHits: v.array(v.object({ type: v.string(), match: v.string() })),
    wordCount: v.number(),
    costUsd: v.optional(v.number()),
    latencyMs: v.number(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(args.secret);
    const run = await ctx.db.get(args.runId);
    await ctx.db.insert("responses", {
      run_id: args.runId,
      prompt_id: args.promptId,
      prompt: args.prompt,
      response: args.response,
      slop_hits: args.slopHits,
      word_count: args.wordCount,
      cost_usd: args.costUsd,
      latency_ms: args.latencyMs,
    });
    await analytics.track(ctx, {
      name: "response_saved",
      userId: run?.model ?? "unknown",
      props: {
        slop_hit_count: args.slopHits.length,
        word_count: args.wordCount,
        latency_ms: args.latencyMs,
        ...(args.costUsd !== undefined ? { cost_usd: args.costUsd } : {}),
      },
    });
  },
});

export const finalizeRun = mutation({
  args: {
    runId: v.id("runs"),
    slopScore: v.number(),
    totalWords: v.number(),
    totalSlopInstances: v.number(),
    bulletRate: v.number(),
    pureSlopRate: v.number(),
    emDashRate: v.number(),
    totalCostUsd: v.number(),
    avgLatencyMs: v.number(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(args.secret);
    const run = await ctx.db.get(args.runId);
    await ctx.db.patch(args.runId, {
      status: "complete",
      slop_score: args.slopScore,
      total_words: args.totalWords,
      total_slop_instances: args.totalSlopInstances,
      bullet_rate: args.bulletRate,
      pure_slop_rate: args.pureSlopRate,
      em_dash_rate: args.emDashRate,
      total_cost_usd: args.totalCostUsd,
      avg_latency_ms: args.avgLatencyMs,
    });
    await analytics.track(ctx, {
      name: "run_completed",
      userId: run?.model ?? "unknown",
      props: {
        model: run?.model ?? "unknown",
        slop_score: args.slopScore,
        pure_slop_rate: args.pureSlopRate,
        bullet_rate: args.bulletRate,
        em_dash_rate: args.emDashRate,
        total_cost_usd: args.totalCostUsd,
        avg_latency_ms: args.avgLatencyMs,
      },
    });
  },
});
