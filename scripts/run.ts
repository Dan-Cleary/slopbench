import { config } from "dotenv";
config({ path: ".env.local" });

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { scoreResponse, computeRunScore, computeCategoryBreakdown, ScoredResponse } from "./scoring";
import promptData from "../data/prompts.json";
import slopList from "../data/sloplist.json";

const model = process.argv[2];
if (!model) {
  console.error("Usage: npm run bench <model-id>");
  console.error("Example: npm run bench openai/gpt-4o-mini");
  process.exit(1);
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CONVEX_URL = process.env.VITE_CONVEX_URL;

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env.local");
  process.exit(1);
}
if (!CONVEX_URL) {
  console.error("Missing VITE_CONVEX_URL in .env.local");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

const BATCH_SIZE = 10;
const prompts = promptData.prompts;

const REQUEST_TIMEOUT_MS = 300_000; // 5 minutes per request

async function callOpenRouter(
  modelId: string,
  prompt: string,
  attempt = 0
): Promise<{ text: string; cost_usd: number | undefined; latency_ms: number }> {
  const start = Date.now();
  try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      usage: { include: true },
    }),
  });
  clearTimeout(timeout);

  const latency_ms = Date.now() - start;

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 && attempt < 3) {
      const wait = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, wait));
      return callOpenRouter(modelId, prompt, attempt + 1);
    }
    throw new Error(`OpenRouter error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const cost_usd = data.usage?.cost ?? undefined;

  return { text, cost_usd, latency_ms };
  } catch (err: any) {
    if (attempt < 3 && err.cause?.code !== undefined) {
      // Network-level error (fetch failed, ECONNRESET, etc.) — retry
      const wait = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, wait));
      return callOpenRouter(modelId, prompt, attempt + 1);
    }
    throw err;
  }
}

async function runBenchmark() {
  console.log(`\nRunning SlopBench for: ${model}`);
  console.log(`Prompts: ${prompts.length}`);

  const runId = await convex.mutation(api.runs.createRun, { model });
  await convex.mutation(api.runs.updateRunStatus, { runId, status: "running" });

  const scored: ScoredResponse[] = [];
  const costs: number[] = [];
  const latencies: number[] = [];
  let completed = 0;

  try {
    for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
      const batch = prompts.slice(i, i + BATCH_SIZE);
      const batchStart = i + 1;
      const batchEnd = Math.min(i + BATCH_SIZE, prompts.length);
      console.log(`\nBatch ${batchStart}-${batchEnd}...`);
      const results = await Promise.all(
        batch.map(async (p) => {
          const promptStart = Date.now();
          console.log(`  → prompt ${p.id} starting`);
          let text: string, cost_usd: number | undefined, latency_ms: number;
          try {
            ({ text, cost_usd, latency_ms } = await callOpenRouter(model, p.prompt));
          } catch (err: any) {
            const elapsed = ((Date.now() - promptStart) / 1000).toFixed(1);
            console.log(`  ✗ prompt ${p.id} skipped after ${elapsed}s: ${err.message}`);
            return null;
          }

          const result = scoreResponse(text, slopList as Parameters<typeof scoreResponse>[1]);

          await convex.mutation(api.runs.saveResponse, {
            runId,
            promptId: String(p.id),
            prompt: p.prompt,
            response: text,
            slopHits: result.slop_hits,
            wordCount: result.word_count,
            costUsd: cost_usd,
            latencyMs: latency_ms,
          });

          if (cost_usd !== undefined) costs.push(cost_usd);
          latencies.push(latency_ms);

          completed++;
          const elapsed = ((Date.now() - promptStart) / 1000).toFixed(1);
          console.log(`  ✓ prompt ${p.id} done in ${elapsed}s (${completed}/${prompts.length} total)`);
          return result;
        })
      );
      scored.push(...results.filter((r) => r !== null));
    }

    const totals = computeRunScore(scored);
    const total_cost_usd = costs.reduce((s, c) => s + c, 0);
    const avg_latency_ms = Math.round(
      latencies.reduce((s, l) => s + l, 0) / latencies.length
    );

    await convex.mutation(api.runs.finalizeRun, {
      runId,
      slopScore: totals.slop_score,
      totalWords: totals.total_words,
      totalSlopInstances: totals.total_slop_instances,
      bulletRate: totals.bullet_rate,
      pureSlopRate: totals.pure_slop_rate,
      emDashRate: totals.em_dash_rate,
      totalCostUsd: total_cost_usd,
      avgLatencyMs: avg_latency_ms,
    });

    const breakdown = computeCategoryBreakdown(scored);
    const total = totals.total_slop_instances;

    console.log(`\n\n--- Results ---`);
    console.log(`Model:           ${model}`);
    console.log(`Slop Rate:       ${totals.pure_slop_rate.toFixed(1)}%  (pure — excludes structural/em-dash)`);
    console.log(`Full Slop Rate:  ${totals.slop_score.toFixed(1)}%  (includes structural/em-dash)`);
    console.log(`Total Words:     ${totals.total_words.toLocaleString()}`);
    console.log(`Slop Hits:       ${total}`);
    console.log(`Bullet Rate:     ${(totals.bullet_rate * 100).toFixed(0)}%`);
    console.log(`Total Cost:      $${total_cost_usd.toFixed(4)}`);
    console.log(`Avg Latency:     ${avg_latency_ms}ms`);

    console.log(`\n--- Slop Breakdown ---`);
    const categories = [
      "structural_slop",
      "word_level_slop",
      "em_dash_slop",
      "phrase_level_slop",
      "opener_slop",
      "validation_slop",
      "reframe_slop",
    ];
    for (const cat of categories) {
      const count = breakdown[cat] ?? 0;
      if (count === 0) continue;
      const pct = ((count / total) * 100).toFixed(0);
      const label = cat.replace("_slop", "").replace("_", " ").padEnd(14);
      console.log(`  ${label}  ${String(count).padStart(3)} hits  (${pct}%)`);
    }

    console.log(`\nRun saved: ${runId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await convex.mutation(api.runs.updateRunStatus, {
      runId,
      status: "failed",
      error_message: message,
    });
    console.error(`\nRun failed: ${message}`);
    process.exit(1);
  }
}

runBenchmark();
