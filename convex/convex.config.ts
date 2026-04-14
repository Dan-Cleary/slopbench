import { defineApp } from "convex/server";
import analytics from "convalytics-dev/convex.config";

const app = defineApp();
app.use(analytics);

export default app;
