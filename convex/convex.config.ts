import { defineApp } from "convex/server";
import analytics from "@convalytics/convex/convex.config";

const app = defineApp();
app.use(analytics);

export default app;
