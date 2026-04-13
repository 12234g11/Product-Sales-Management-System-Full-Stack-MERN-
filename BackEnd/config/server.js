import express from "express";
import cors from "cors";
import connectDB from "./db.js";

export const configureServer = (app) => {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
  ].filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
    })
  );

  app.use(express.json());
};

export const startServer = async (app) => {
  try {
    await connectDB(process.env.MONGO_URI);

    const PORT = process.env.PORT || 5001;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};