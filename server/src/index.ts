import "dotenv/config";
import { validateEnv } from "./config/validateEnv";

validateEnv();

import app from "./app";
import { connectDB } from "./config/db";
import { STALE_CHECKOUT_SWEEP_INTERVAL_MS } from "./config/checkout";
import { runPeriodically } from "./utils/runPeriodically";
import { sweepStaleCheckouts } from "./utils/staleCheckouts";

connectDB().then(() =>
  runPeriodically(async () => {
    const summary = await sweepStaleCheckouts();
    if (summary.cancelled || summary.markedPaid || summary.stockRepaired) {
      console.log("Stale checkout sweep:", summary);
    }
  }, STALE_CHECKOUT_SWEEP_INTERVAL_MS)
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
