
import mongoose from "mongoose";
import logger from "../config/logger.js";

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(
            process.env.MONGO_URI
        );

        logger.info(
            {
                host: connection.connection.host,
                database: connection.connection.name,
            },
            "MongoDB connected successfully"
        );

        mongoose.connection.on("disconnected", () => {
            logger.warn("MongoDB disconnected");
        });

        mongoose.connection.on("error", (error) => {
            logger.error({ err: error }, "MongoDB connection error");
        });

    } catch (error) {
        logger.error({ err: error }, "MongoDB connection failed");
        throw error;
    }
};

export default connectDB;


