import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js"; // ✅ IMPORTANT (make sure this file exists)

import productRoutes from "./routes/products.js";

dotenv.config();

const app = express();

/* =========================
   ✅ CORS CONFIG (BEST)
========================= */
const allowedOrigins = [
  "http://localhost:5173", // Vite
  "http://localhost:3000", // CRA
  process.env.FRONTEND_URL // Production (Vercel)
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed: " + origin));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());

/* =========================
   ROUTES
========================= */
app.use("/api/products", productRoutes);

/* =========================
   CART API
========================= */
app.post("/api/cart", async (req, res) => {
  const { product_id, title, price, image, quantity } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO cart (product_id, title, price, image, quantity)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [product_id, title, price, image, quantity]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Cart Insert Error:", error.message);
    res.status(500).json({ error: "Error adding to cart" });
  }
});

/* =========================
   ROOT ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("API running...");
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});