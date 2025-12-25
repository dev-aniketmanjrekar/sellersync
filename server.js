const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/sellers", require("./routes/sellers"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/stock", require("./routes/stock"));
app.use("/api/sales", require("./routes/sales"));

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 SellerSync server running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  
  // Get local IP for mobile access
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   Network: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`\n📱 To access from mobile, use the Network URL above\n`);
});
