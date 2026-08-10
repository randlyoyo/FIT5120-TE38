import "dotenv/config";
import { createApp } from "../src/app";

// Vercel's Node.js runtime calls this handler per request instead of us
// calling app.listen() - Express apps are already callable as (req, res),
// so exporting the app instance directly is all that's needed.
export default createApp();
