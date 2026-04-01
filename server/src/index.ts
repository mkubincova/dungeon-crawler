import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : "*",
  })
);
app.use(express.json());
app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`Dungeon Crawler server running on http://localhost:${PORT}`);
});
