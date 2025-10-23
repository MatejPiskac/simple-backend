import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { handler as astroHandler } from "./frontend/dist/server/entry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 🔗 Connect to PostgreSQL using Render's environment variable
const pool = new Pool({
  connectionString: process.env.INTERNAL_DB_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ✅ Test DB connection
async function testDatabaseConnection() {
  try {
    const res = await pool.query("SELECT NOW() AS current_time");
    console.log("✅ Database connected! Current time:", res.rows[0].current_time);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
}
testDatabaseConnection();

// Example API route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

// Example Socket.IO chat
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("welcome", { message: "Connected to backend!" });

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});

// Serve Astro built frontend
app.use(express.static(path.join(__dirname, "frontend/dist/client")));
app.all("*", async (req, res, next) => {
  try {
    await astroHandler(req, res, next);
  } catch (err) {
    next(err);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
