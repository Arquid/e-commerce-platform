import "dotenv/config";
import { validateEnv } from "./config/validateEnv";

validateEnv();

import app from "./app";
import { connectDB } from "./config/db";

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
