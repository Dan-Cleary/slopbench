import { config } from "dotenv";
config({ path: ".env.local" });
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

convex.mutation(api.runs.clearAllData, {}).then(result => {
  console.log(`Cleared ${result.deleted_runs} runs and ${result.deleted_responses} responses.`);
});
