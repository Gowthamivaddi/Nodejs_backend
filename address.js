const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());

const initializeDBAndServer = async () => {
  try {
    const db = await open({
      filename: "goodreads.db", // Database file
      driver: sqlite3.Database,
    });

    // Create the "address" table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS address (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobilenumber TEXT UNIQUE NOT NULL,
        village TEXT NOT NULL,
        mandal TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        post TEXT NOT NULL,
        pincode TEXT NOT NULL
      );
    `);

    console.log("Database and Table Initialized");

    // Start the server
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });

    // POST API to insert data into the "address" table
    app.post("/add-address/", async (req, res) => {
      try {
        const {
          name,
          mobilenumber,
          village,
          mandal,
          district,
          state,
          post,
          pincode,
        } = req.body;

        if (
          !name ||
          !mobilenumber ||
          !village ||
          !mandal ||
          !district ||
          !state ||
          !post ||
          !pincode
        ) {
          res.status(400).send("All fields are required");
          return;
        }

        const insertQuery = `
          INSERT INTO address (name, mobilenumber, village, mandal, district, state, post, pincode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;
        await db.run(insertQuery, [
          name,
          mobilenumber,
          village,
          mandal,
          district,
          state,
          post,
          pincode,
        ]);

        res.status(201).send("Address added successfully");
      } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT") {
          res.status(409).send("Mobile number already exists");
        } else {
          console.error(error);
          res.status(500).send("Internal Server Error");
        }
      }
    });

    // GET API to retrieve all addresses
    app.get("/addresses/", async (req, res) => {
      try {
        const getQuery = `SELECT * FROM address;`;
        const addresses = await db.all(getQuery);
        res.status(200).json(addresses);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    // GET API to retrieve a specific address by ID
    app.get("/address/:id/", async (req, res) => {
      try {
        const { id } = req.params;
        const getQuery = `SELECT * FROM address WHERE id = ?;`;
        const address = await db.get(getQuery, [id]);

        if (address) {
          res.status(200).json(address);
        } else {
          res.status(404).send("Address not found");
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    // DELETE API to delete an address by ID
    app.delete("/address/:id/", async (req, res) => {
      try {
        const { id } = req.params;
        const deleteQuery = `DELETE FROM address WHERE id = ?;`;
        const result = await db.run(deleteQuery, [id]);

        if (result.changes > 0) {
          res.status(200).send("Address deleted successfully");
        } else {
          res.status(404).send("Address not found");
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    // PUT API to update an address by ID
    app.put("/address/:id/", async (req, res) => {
      try {
        const { id } = req.params;
        const {
          name,
          mobilenumber,
          village,
          mandal,
          district,
          state,
          post,
          pincode,
        } = req.body;

        if (
          !name ||
          !mobilenumber ||
          !village ||
          !mandal ||
          !district ||
          !state ||
          !post ||
          !pincode
        ) {
          res.status(400).send("All fields are required");
          return;
        }

        const updateQuery = `
          UPDATE address
          SET name = ?, mobilenumber = ?, village = ?, mandal = ?, district = ?, state = ?, post = ?, pincode = ?
          WHERE id = ?;
        `;
        const result = await db.run(updateQuery, [
          name,
          mobilenumber,
          village,
          mandal,
          district,
          state,
          post,
          pincode,
          id,
        ]);

        if (result.changes > 0) {
          res.status(200).send("Address updated successfully");
        } else {
          res.status(404).send("Address not found");
        }
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
