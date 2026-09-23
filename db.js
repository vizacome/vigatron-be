const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    const dbURL = process.env.DB_CONN_STR;
    if (!dbURL) {
      throw new Error(
        "MongoDB URL is not defined in Database Connection Environment",
      );
    }

    const options = {
      autoIndex: false,
      poolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const connection = await mongoose.connect(dbURL);
    console.log(
      `Connected to MongoDB at ${connection.connection.host}/${connection.connection.name}`,
    );

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected.");
    });
    return mongoose;
  } catch (error) {
    console.error("Error connecting to MongoDB: ", error);
    process.exit(1);
  }
};
module.exports = { connectDB };
