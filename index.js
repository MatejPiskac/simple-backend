import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { handler as astroHandler } from "./frontend/dist/server/entry.mjs";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(express.json());
app.use(cookieParser());

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

// Ensure users table exists
async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
ensureUsersTable().catch((e) => console.error("Failed to ensure users table:", e.message));

// Auth helpers
function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const secret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Auth routes
app.post("/api/auth/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users(email, password_hash) VALUES($1, $2) RETURNING id, email, created_at",
      [email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    const token = signToken({ id: user.id, email: user.email });
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({ user: { id: user.id, email: user.email, created_at: user.created_at } });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Signup error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  try {
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken({ id: user.id, email: user.email });
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ ok: true });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email, created_at, updated_at FROM users WHERE id = $1", [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Example API route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

// Socket.IO auth middleware using JWT from cookie or auth header
io.use((socket, next) => {
  try {
    const cookies = Object.fromEntries(
      (socket.handshake.headers.cookie || "")
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const idx = c.indexOf("=");
          return [decodeURIComponent(c.slice(0, idx)), decodeURIComponent(c.slice(idx + 1))];
        })
    );
    const header = socket.handshake.auth?.token || socket.handshake.headers.authorization;
    const bearer = typeof header === "string" ? header.replace("Bearer ", "") : undefined;
    const token = cookies.token || bearer;
    if (!token) return next(new Error("Unauthorized"));
    const secret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    socket.user = decoded;
    return next();
  } catch (e) {
    return next(new Error("Unauthorized"));
  }
});

// Authenticated chat namespace
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id, "user:", socket.user?.email);
  socket.emit("welcome", { message: `Welcome ${socket.user?.email || "user"}!` });

  socket.on("chat message", (msg) => {
    const payload = { ...msg, username: socket.user?.email || msg.username };
    io.emit("chat message", payload);
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
