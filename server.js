import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import productRoutes from "./routes/products.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed: " + origin));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/products", productRoutes);

app.post("/api/cart", async (req, res) => {
  const { product_id, title, price, image, quantity } = req.body;

  try {
    if (
      !product_id ||
      !title ||
      price === undefined ||
      !image ||
      quantity === undefined
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO cart (product_id, title, price, image, quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [product_id, title, price, image, quantity]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Cart Insert Error:", error);
    res.status(500).json({ error: "Error adding to cart" });
  }
});

app.get("/", (req, res) => {
  res.send("API running...");
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ success: true, message: "Server and database are working" });
  } catch (error) {
    console.error("Health Check Error:", error);
    res.status(500).json({ success: false, error: "Database connection failed" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});