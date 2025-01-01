const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // Import JWT library

const app = express();
app.use(express.json());

// Secret key for signing JWTs
const JWT_SECRET = "your_secret_key"; // Use a secure and environment-specific value

const initializeDBAndServer = async () => {
  try {
    const db = await open({
      filename: "goodreads.db", // Database file
      driver: sqlite3.Database,
    });

    // Create the "registrations" table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mobilenumber TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    console.log("Database and Table Initialized");

    // Start the server
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });

    // Register API
    app.post("/register/", async (req, res) => {
      try {
        const { mobilenumber, password } = req.body;

        if (!mobilenumber || !password) {
          res.status(400).send("Mobile number and password are required");
          return;
        }

        if (!/^\d{10}$/.test(mobilenumber)) {
          res.status(400).send("Invalid mobile number format");
          return;
        }

        // Check if the mobilenumber is already registered
        const selectQuery = `SELECT * FROM registrations WHERE mobilenumber = ?`;
        const existingUser = await db.get(selectQuery, [mobilenumber]);

        if (existingUser) {
          res.status(409).send("Mobile number already registered");
          return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const insertQuery = `INSERT INTO registrations (mobilenumber, password) VALUES (?, ?)`;
        await db.run(insertQuery, [mobilenumber, hashedPassword]);

        // Generate a JWT
        const token = jwt.sign({ mobilenumber }, JWT_SECRET, {
          expiresIn: "1h",
        });

        res
          .status(201)
          .send({ message: "User registered successfully", token });
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Login API
    app.post("/login/", async (req, res) => {
      try {
        const { mobilenumber, password } = req.body;

        if (!mobilenumber || !password) {
          res.status(400).send("Mobile number and password are required");
          return;
        }

        // Check if the user exists
        const selectQuery = `SELECT * FROM registrations WHERE mobilenumber = ?`;
        const user = await db.get(selectQuery, [mobilenumber]);

        if (!user) {
          res.status(401).send("Invalid mobile number or password");
          return;
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          res.status(401).send("Invalid mobile number or password");
          return;
        }

        // Generate a JWT
        const token = jwt.sign({ mobilenumber }, JWT_SECRET, {
          expiresIn: "1h",
        });

        res.status(200).send({ message: "Login successful", token });
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Protected API (Example)
    app.get("/profile/", async (req, res) => {
      try {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
          res.status(401).send("Authorization header is required");
          return;
        }

        const token = authHeader.split(" ")[1]; // Extract the token

        if (!token) {
          res.status(401).send("Token is required");
          return;
        }

        // Verify the token
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.status(403).send("Invalid or expired token");
            return;
          }

          res.status(200).send({ message: "Access granted", user });
        });
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

// Initialize the database and start the server
initializeDBAndServer();
