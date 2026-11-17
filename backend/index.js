import { app } from "./app.js";
import logger from "./src/config/logger.js";
import env from "./src/config/env.js"
import mongoose from "mongoose";
import connectDB from "./src/db/db.js";

let server;
let isShuttingDown = false;
let forceShutdownTimer;

const gracefulShutdown = async (signal, exitCode = 0) => {
    if (isShuttingDown) return;

    isShuttingDown = true;
    process.exitCode = exitCode;

    logger.info({ signal }, "Shutdown initiated");

    forceShutdownTimer = setTimeout(() => {
        logger.fatal("Graceful shutdown timed out. Forcing exit.");

        server?.closeAllConnections?.();

        process.exit(1);
    }, 15000);

    try {
        // Stop accepting new HTTP requests and wait
        // for existing requests to complete.
        if (server?.listening) {
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });

                // Close idle connections immediately.
                server.closeIdleConnections?.();
            });

            logger.info("HTTP server closed");
        }

        // Close MongoDB after HTTP requests have drained.
        await mongoose.disconnect();

        logger.info("MongoDB connection closed");

        clearTimeout(forceShutdownTimer);

        logger.info("Application shutdown completed");
    } catch (error) {
        logger.error({ err: error }, "Error during shutdown");

        clearTimeout(forceShutdownTimer);
        process.exitCode = 1;
    }
};

// Handle termination signals.
process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
    gracefulShutdown("SIGINT");
});

// Handle unhandled promise rejections.
process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Unhandled promise rejection");

    gracefulShutdown("unhandledRejection", 1);
});

// Handle uncaught exceptions.
process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Uncaught exception");

    gracefulShutdown("uncaughtException", 1);
});

// Start application.
const startServer = async () => {
    try {
        await connectDB();

        if (isShuttingDown) return;

        server = app.listen(env.PORT, () => {
            logger.info(
                {
                    port: env.PORT,
                    environment: env.NODE_ENV,
                },
                "Server started successfully"
            );
        });

        server.on("error", (error) => {
            logger.fatal({ err: error }, "HTTP server error");

            gracefulShutdown("serverError", 1);
        });

    } catch (error) {
        logger.fatal({ err: error }, "Application startup failed");

        await gracefulShutdown("startupFailure", 1);
    }
};

startServer();



