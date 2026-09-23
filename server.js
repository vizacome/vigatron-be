const express = require("express");
const { google } = require("googleapis");
const path = require("path");
const cors = require("cors");

require("dotenv").config();
const { Client, LocalAuth, RemoteAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");

const app = express();

const corsOptions = {
  origin: process.env.LOCAL_FRONT,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Set to true if you need to pass cookies or sessions
};
// Set the port number from environment variables or default to 8000
const port = process.env.PORT ?? 8000;
app.use(express.json());
//app.use(cors(corsOptions));
app.use(cors());
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
  } catch (error) {
    console.error("Error connecting to MongoDB: ", error);
    process.exit(1);
  }
};
const testLogic = async () => {
  await connectDB();
  const store = new MongoStore({ mongoose: mongoose });
  const waClient = new Client({
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300000,
    }),
  });

  waClient.on("qr", async (qr) => {
    //console.log("Scan this QR code with your phone:");
    //qrcode.generate(qr, { small: true });

    try {
      const phoneNumber = "59165724891";

      // 2. Request the 8-digit pairing code
      const pairingCode = await waClient.requestPairingCode(phoneNumber);
      console.log(`Your WhatsApp Pairing Code is: ${pairingCode}`);
    } catch (err) {
      console.error("Failed to generate pairing code:", err);
    }
  });

  // Log when the client is authenticated and ready
  waClient.on("ready", () => {
    console.log("WhatsApp Client is ready!");
  });

  waClient.on("remote_session_saved", () => {
    console.log("Session saved to remote MongoDB storage safely.");
  });
  waClient.initialize();

  app.post("/send-msg", async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        status: false,
        message: "Please provide both number and message.",
      });
    }

    try {
      const cleanNumber = number.replace(/[^\d]/g, "");
      const chatId = `${cleanNumber}@c.us`;

      // Send the message
      await waClient.sendMessage(chatId, message);

      res.status(200).json({
        status: true,
        message: `Message successfully sent to ${number}`,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      res
        .status(500)
        .json({ status: false, error: "Internal server error occurred." });
    }
  });
};

//testLogic();
const credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Read and write scope
});

// 2. Define global constants for your Sheet
const SPREADSHEET_ID = "1Y4BgJQyr5-6YK9CxlUIsa2rNLpByEHDkuxsvuVl2F48"; // Replace with your actual Sheet ID
const SHEET_NAME = "Sheet1"; // Replace with your specific worksheet/tab name

/**
 * Helper function to get an authenticated Sheets instance
 */
async function getSheetsInstance() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

// 3. READ ROUTE: Get data from the spreadsheet
app.get("/api/read", async (req, res) => {
  try {
    const sheets = await getSheetsInstance();

    // Fetch values from the defined range (e.g., 'Sheet1!A1:Z100')
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res
        .status(200)
        .json({ message: "No data found in sheet.", data: [] });
    }

    res.status(200).json({ data: rows });
  } catch (error) {
    console.error("Error reading sheet:", error);
    res.status(500).json({ error: "Failed to read data from Google Sheets" });
  }
});

// 4. WRITE ROUTE: Append a new row of data to the spreadsheet
app.post("/api/write", async (req, res) => {
  try {
    const { values } = req.body;

    if (!values || !Array.isArray(values)) {
      return res
        .status(400)
        .json({ error: 'Invalid data format. "values" must be an array.' });
    }

    const sheets = await getSheetsInstance();

    // Append data to the next available row
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`, // Looks for the first empty cell in Column A downwards
      valueInputOption: "USER_ENTERED", // Parses numbers/dates exactly like a human typing them in
      requestBody: {
        values: [values],
      },
    });

    res.status(200).json({
      message: "Data successfully written to sheet!",
      updatedRange: response.data.updates.updatedRange,
    });
  } catch (error) {
    console.error("Error writing to sheet:", error);
    res.status(500).json({ error: "Failed to write data to Google Sheets" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
