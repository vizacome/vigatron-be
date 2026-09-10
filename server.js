const express = require("express");
require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const app = express();

// Set the port number from environment variables or default to 8000
const port = process.env.PORT ?? 8000;

const waClient = new Client({
  authStrategy: new LocalAuth(), // Saves session locally to prevent scanning every time
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
app.use(express.json());

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

// Start the server and listen on the specified port, logging a message to confirm
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

waClient.initialize();
