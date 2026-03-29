import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/*
==============================
AUTO-CREATE TABLES (if not exist)
==============================
*/
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        image TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        image TEXT,
        quantity INT DEFAULT 1
      );
    `);

    console.log("Tables verified/created successfully.");
  } catch (err) {
    console.error("Error creating tables:", err.message);
  }
})();

/*
==============================
GET ALL PRODUCTS
==============================
*/
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET /products error:", err.message);
    res.status(500).json({ error: "Server error while fetching products" });
  }
});

/*
==============================
FILTER PRODUCTS BY CATEGORY
==============================
*/
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    let result;

    if (category.toLowerCase() === "all") {
      result = await pool.query("SELECT * FROM products ORDER BY id");
    } else {
      result = await pool.query(
        "SELECT * FROM products WHERE category=$1 ORDER BY id",
        [category]
      );
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET /products/category error:", err.message);
    res.status(500).json({ error: "Server error while filtering products" });
  }
});

/*
==============================
CART ROUTES (must be BEFORE /:id)
==============================
*/

// GET CART ITEMS
router.get("/cart", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cart ORDER BY id DESC");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("GET /cart error:", error.message);
    res.status(500).json({ error: "Error fetching cart items" });
  }
});

// ADD TO CART
router.post("/cart", async (req, res) => {
  try {
    const { product_id, title, price, image, quantity } = req.body;

    if (!product_id || !title || price == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const qty = Number(quantity) || 1;

    const existingItem = await pool.query(
      "SELECT * FROM cart WHERE product_id=$1",
      [product_id]
    );

    let result;

    if (existingItem.rows.length > 0) {
      result = await pool.query(
        `UPDATE cart
         SET quantity = quantity + $1
         WHERE product_id=$2
         RETURNING *`,
        [qty, product_id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO cart
         (product_id, title, price, image, quantity)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [product_id, title, price, image, qty]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /cart error:", error.message);
    res.status(500).json({ error: "Error adding to cart" });
  }
});

// UPDATE CART QUANTITY
router.put("/cart/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const result = await pool.query(
      `UPDATE cart
       SET quantity=$1
       WHERE id=$2
       RETURNING *`,
      [qty, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("PUT /cart/:id error:", error.message);
    res.status(500).json({ error: "Error updating quantity" });
  }
});

// DELETE CART ITEM
router.delete("/cart/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM cart WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    res.status(200).json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("DELETE /cart/:id error:", error.message);
    res.status(500).json({ error: "Error deleting item" });
  }
});

/*
==============================
GET SINGLE PRODUCT (dynamic route)
==============================
*/
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("GET /products/:id error:", err.message);
    res.status(500).json({ error: "Error fetching product" });
  }
});

export default router;