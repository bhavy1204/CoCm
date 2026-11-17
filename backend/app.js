
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import mongoose from "mongoose";

import logger from "./src/config/logger.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});

app.use("/api", apiLimiter);


// Node JS server health check
app.get("/health/live", (req, res) => {
    res.status(200).json({
        success: true,
        status: "alive",
    });
});

app.get("/health/ready", (req, res) => {
    const isDatabaseConnected = mongoose.connection.readyState === 1;

    if (!isDatabaseConnected) {
        return res.status(503).json({
            success: false,
            status: "not_ready",
            database: "disconnected",
        });
    }

    return res.status(200).json({
        success: true,
        status: "ready",
        database: "connected",
    });
});

export { app };
