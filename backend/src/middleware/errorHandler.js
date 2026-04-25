export const errorHandler = (err, req, res, next) => {
  // Always log full stack in development for visibility
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${req.method}] ${req.originalUrl} →`, err);
  } else {
    console.error("Error:", err.message);
  }

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: "A record with this value already exists." });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }

  // Prisma DB connection errors
  if (err.code === "P1001" || err.code === "P1002") {
    return res
      .status(503)
      .json({ error: "Database unavailable. Please try again shortly." });
  }

  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({
    error:
      process.env.NODE_ENV !== "production"
        ? err.message || "Internal server error"
        : "Internal server error",
  });
};
