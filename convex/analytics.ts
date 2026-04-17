import { components } from "./_generated/api";
import { Convalytics } from "convalytics-dev";

// Singleton — import this wherever you need to track events.
export const analytics = new Convalytics(components.convalytics, {
  writeKey: process.env.CONVALYTICS_WRITE_KEY!,
  deploymentName: process.env.CONVALYTICS_DEPLOYMENT_NAME,
});
