// ======================================================
// FETCH - CAMPUS LOST & FOUND
// Backend: Node.js + Express + MongoDB Atlas
// ======================================================

require("dotenv").config();

const dns = require("dns");

// MongoDB Atlas DNS fix
dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

const {
    MongoClient,
    ObjectId
} = require("mongodb");

// ======================================================
// APP CONFIGURATION
// ======================================================

const app = express();

const PORT = process.env.PORT || 3000;

// IMPORTANT:
// Use your EXISTING database
const DB_NAME = "Lost&Found";

const MONGODB_URI = process.env.MONGODB_URI;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);

// ======================================================
// FRONTEND
// ======================================================

// server.js and index.html are in the SAME folder
app.use(express.static(__dirname));

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});

// ======================================================
// MONGODB VARIABLES
// ======================================================

let client = null;
let db = null;

let usersCollection = null;
let itemsCollection = null;

// ======================================================
// HELPER - FORMAT USER
// ======================================================

function formatUser(user) {

    if (!user) {
        return null;
    }

    return {

        id: user._id
            ? user._id.toString()
            : user.id,

        name:
            user.name ||
            user.username ||
            "",

        email:
            user.email ||
            "",

        role:
            user.role ||
            "student"

    };
}

// ======================================================
// HELPER - FORMAT ITEM
// ======================================================

function formatItem(item) {

    if (!item) {
        return null;
    }

    const formatted = {
        ...item
    };

    // Convert MongoDB _id to frontend id
    if (item._id) {

        formatted.id =
            item._id.toString();

    }

    delete formatted._id;

    return formatted;
}

// ======================================================
// API TEST
// ======================================================

app.get("/api", (req, res) => {

    res.json({

        success: true,

        message:
            "Fetch Lost & Found API is running"

    });

});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        server:
            "running",

        database:
            db
                ? "connected"
                : "not connected",

        databaseName:
            DB_NAME

    });

});

// ======================================================
// REGISTER USER
// ======================================================

app.post(
    "/api/users/register",
    async (req, res) => {

        try {

            console.log("");
            console.log(
                "========== REGISTER =========="
            );

            console.log(
                "Request:",
                req.body
            );

            const {
                name,
                email,
                password,
                role
            } = req.body;

            // --------------------------------------------------
            // Validate
            // --------------------------------------------------

            if (
                !name ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Name, email and password are required"

                });

            }

            const cleanName =
                String(name).trim();

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            if (
                cleanName.length < 2
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Name must contain at least 2 characters"

                });

            }

            if (
                password.length < 4
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Password must contain at least 4 characters"

                });

            }

            // --------------------------------------------------
            // Check existing user
            // --------------------------------------------------

            const existingUser =
                await usersCollection.findOne({

                    email:
                        cleanEmail

                });

            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    error:
                        "An account with this email already exists"

                });

            }

            // --------------------------------------------------
            // Role
            // --------------------------------------------------

            const cleanRole =
                role === "admin"
                    ? "admin"
                    : "student";

            // --------------------------------------------------
            // Hash password
            // --------------------------------------------------

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            // --------------------------------------------------
            // Create user
            // --------------------------------------------------

            const newUser = {

                name:
                    cleanName,

                email:
                    cleanEmail,

                password:
                    hashedPassword,

                role:
                    cleanRole,

                createdAt:
                    new Date()

            };

            const result =
                await usersCollection.insertOne(
                    newUser
                );

            const safeUser = {

                id:
                    result.insertedId.toString(),

                name:
                    cleanName,

                email:
                    cleanEmail,

                role:
                    cleanRole

            };

            console.log(
                "User registered:",
                safeUser.email
            );

            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully",

                user:
                    safeUser

            });

        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while creating account"

            });

        }

    }
);

// ======================================================
// LOGIN
// ======================================================

app.post(
    "/api/users/login",
    async (req, res) => {

        try {

            console.log("");
            console.log(
                "========== LOGIN =========="
            );

            console.log(
                "Login request:",
                req.body.email
            );

            const {
                email,
                password
            } = req.body;

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Email and password are required"

                });

            }

            const cleanEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            // --------------------------------------------------
            // Find user
            // --------------------------------------------------

            const user =
                await usersCollection.findOne({

                    email:
                        cleanEmail

                });

            if (!user) {

                console.log(
                    "User not found:",
                    cleanEmail
                );

                return res.status(401).json({

                    success: false,

                    error:
                        "Invalid email or password"

                });

            }

            // --------------------------------------------------
            // Password check
            // --------------------------------------------------

            let passwordCorrect = false;

            if (user.password) {

                passwordCorrect =
                    await bcrypt.compare(
                        password,
                        user.password
                    );

            }

            if (!passwordCorrect) {

                console.log(
                    "Incorrect password for:",
                    cleanEmail
                );

                return res.status(401).json({

                    success: false,

                    error:
                        "Invalid email or password"

                });

            }

            // --------------------------------------------------
            // Successful login
            // --------------------------------------------------

            const safeUser =
                formatUser(user);

            console.log(
                "Login successful:",
                safeUser.email
            );

            return res.json({

                success: true,

                message:
                    "Login successful",

                user:
                    safeUser

            });

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while logging in"

            });

        }

    }
);

// ======================================================
// GET USER BY ID
// ======================================================

app.get(
    "/api/users/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            if (
                !ObjectId.isValid(id)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid user ID"

                });

            }

            const user =
                await usersCollection.findOne({

                    _id:
                        new ObjectId(id)

                });

            if (!user) {

                return res.status(404).json({

                    success: false,

                    error:
                        "User not found"

                });

            }

            return res.json({

                success: true,

                user:
                    formatUser(user)

            });

        } catch (error) {

            console.error(
                "GET USER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while getting user"

            });

        }

    }
);

// ======================================================
// GET ALL USERS
// ======================================================

app.get(
    "/api/users",
    async (req, res) => {

        try {

            const users =
                await usersCollection
                    .find({})
                    .toArray();

            return res.json({

                success: true,

                users:
                    users.map(
                        formatUser
                    )

            });

        } catch (error) {

            console.error(
                "GET USERS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while getting users"

            });

        }

    }
);

// ======================================================
// GET ALL ITEMS
// ======================================================

app.get(
    "/api/items",
    async (req, res) => {

        try {

            console.log(
                "Loading items from MongoDB..."
            );

            const items =
                await itemsCollection
                    .find({})
                    .sort({
                        createdAt: -1
                    })
                    .toArray();

            console.log(
                `Found ${items.length} items`
            );

            return res.json({

                success: true,

                items:
                    items.map(
                        formatItem
                    )

            });

        } catch (error) {

            console.error(
                "GET ITEMS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while loading items"

            });

        }

    }
);

// ======================================================
// GET SINGLE ITEM
// ======================================================

app.get(
    "/api/items/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            if (
                !ObjectId.isValid(id)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid item ID"

                });

            }

            const item =
                await itemsCollection.findOne({

                    _id:
                        new ObjectId(id)

                });

            if (!item) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Item not found"

                });

            }

            return res.json({

                success: true,

                item:
                    formatItem(item)

            });

        } catch (error) {

            console.error(
                "GET ITEM ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while loading item"

            });

        }

    }
);

// ======================================================
// CREATE ITEM
// ======================================================

app.post(
    "/api/items",
    async (req, res) => {

        try {

            console.log("");
            console.log(
                "========== CREATE ITEM =========="
            );

            console.log(
                "Received:",
                req.body
            );

            const item = {
                ...req.body
            };

            // Remove IDs sent by frontend
            delete item._id;
            delete item.id;

            // Dates
            item.createdAt =
                new Date();

            item.updatedAt =
                new Date();

            // Save
            const result =
                await itemsCollection.insertOne(
                    item
                );

            // Read saved item
            const savedItem =
                await itemsCollection.findOne({

                    _id:
                        result.insertedId

                });

            console.log(
                "Item saved:",
                result.insertedId.toString()
            );

            return res.status(201).json({

                success: true,

                message:
                    "Item reported successfully",

                item:
                    formatItem(
                        savedItem
                    )

            });

        } catch (error) {

            console.error(
                "CREATE ITEM ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while saving item"

            });

        }

    }
);

// ======================================================
// UPDATE ITEM
// ======================================================

app.put(
    "/api/items/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            if (
                !ObjectId.isValid(id)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid item ID"

                });

            }

            const updateData = {
                ...req.body
            };

            delete updateData._id;
            delete updateData.id;

            updateData.updatedAt =
                new Date();

            const result =
                await itemsCollection.updateOne(

                    {
                        _id:
                            new ObjectId(id)
                    },

                    {
                        $set:
                            updateData
                    }

                );

            if (
                result.matchedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Item not found"

                });

            }

            const updatedItem =
                await itemsCollection.findOne({

                    _id:
                        new ObjectId(id)

                });

            return res.json({

                success: true,

                message:
                    "Item updated successfully",

                item:
                    formatItem(
                        updatedItem
                    )

            });

        } catch (error) {

            console.error(
                "UPDATE ITEM ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while updating item"

            });

        }

    }
);

// ======================================================
// DELETE ITEM
// ======================================================

app.delete(
    "/api/items/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;

            if (
                !ObjectId.isValid(id)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid item ID"

                });

            }

            const result =
                await itemsCollection.deleteOne({

                    _id:
                        new ObjectId(id)

                });

            if (
                result.deletedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Item not found"

                });

            }

            return res.json({

                success: true,

                message:
                    "Item deleted successfully"

            });

        } catch (error) {

            console.error(
                "DELETE ITEM ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while deleting item"

            });

        }

    }
);

// ======================================================
// CREATE / RESET DEMO USER
// ======================================================

async function createDemoUser() {

    try {

        const demoEmail =
            "anita@campus.edu";

        const demoPassword =
            "demo123";

        console.log("");
        console.log(
            "Checking demo user..."
        );

        // --------------------------------------------------
        // Generate correct bcrypt hash
        // --------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                demoPassword,
                10
            );

        // --------------------------------------------------
        // Check whether Anita exists
        // --------------------------------------------------

        const existingDemo =
            await usersCollection.findOne({

                email:
                    demoEmail

            });

        // --------------------------------------------------
        // Anita already exists
        // Reset password
        // --------------------------------------------------

        if (existingDemo) {

            await usersCollection.updateOne(

                {
                    _id:
                        existingDemo._id
                },

                {
                    $set: {

                        name:
                            "Anita Sharma",

                        password:
                            hashedPassword,

                        role:
                            "student"

                    }

                }

            );

            console.log("");
            console.log(
                "=========================================="
            );

            console.log(
                "DEMO USER PASSWORD RESET"
            );

            console.log(
                "=========================================="
            );

            console.log(
                "Name: Anita Sharma"
            );

            console.log(
                "Email: anita@campus.edu"
            );

            console.log(
                "Password: demo123"
            );

            console.log(
                "Role: student"
            );

            console.log(
                "=========================================="
            );

            return;
        }

        // --------------------------------------------------
        // Anita doesn't exist
        // Create account
        // --------------------------------------------------

        const demoUser = {

            name:
                "Anita Sharma",

            email:
                demoEmail,

            password:
                hashedPassword,

            role:
                "student",

            createdAt:
                new Date()

        };

        const result =
            await usersCollection.insertOne(
                demoUser
            );

        console.log("");
        console.log(
            "=========================================="
        );

        console.log(
            "DEMO USER CREATED"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "Name: Anita Sharma"
        );

        console.log(
            "Email: anita@campus.edu"
        );

        console.log(
            "Password: demo123"
        );

        console.log(
            "Role: student"
        );

        console.log(
            "ID:",
            result.insertedId.toString()
        );

        console.log(
            "=========================================="
        );

    } catch (error) {

        console.error(
            "DEMO USER ERROR:",
            error
        );

    }

}

// ======================================================
// START SERVER
// ======================================================

async function startServer() {

    try {

        console.log("");
        console.log(
            "=========================================="
        );

        console.log(
            "FETCH - CAMPUS LOST & FOUND"
        );

        console.log(
            "=========================================="
        );

        // --------------------------------------------------
        // Check .env
        // --------------------------------------------------

        if (!MONGODB_URI) {

            console.error(
                "MONGODB_URI is missing from .env"
            );

            process.exit(1);

        }

        console.log(
            "MONGODB_URI found"
        );

        console.log(
            "Connecting to MongoDB Atlas..."
        );

        // --------------------------------------------------
        // Connect MongoDB
        // --------------------------------------------------

        client =
            new MongoClient(
                MONGODB_URI
            );

        await client.connect();

        // --------------------------------------------------
        // Use existing database
        // --------------------------------------------------

        db =
            client.db(
                DB_NAME
            );

        // --------------------------------------------------
        // Test connection
        // --------------------------------------------------

        await db.command({
            ping: 1
        });

        // --------------------------------------------------
        // Existing collections
        // --------------------------------------------------

        usersCollection =
            db.collection(
                "users"
            );

        itemsCollection =
            db.collection(
                "items"
            );

        // --------------------------------------------------
        // Check collections
        // --------------------------------------------------

        const collections =
            await db
                .listCollections()
                .toArray();

        const collectionNames =
            collections.map(
                collection =>
                    collection.name
            );

        console.log("");
        console.log(
            "Database:",
            DB_NAME
        );

        console.log(
            "Existing collections:",
            collectionNames
        );

        // --------------------------------------------------
        // Warnings
        // --------------------------------------------------

        if (
            !collectionNames.includes(
                "users"
            )
        ) {

            console.log(
                "WARNING: users collection was not found."
            );

        }

        if (
            !collectionNames.includes(
                "items"
            )
        ) {

            console.log(
                "WARNING: items collection was not found."
            );

        }

        // --------------------------------------------------
        // Count documents
        // --------------------------------------------------

        const userCount =
            await usersCollection.countDocuments();

        const itemCount =
            await itemsCollection.countDocuments();

        console.log("");

        console.log(
            `Users in existing collection: ${userCount}`
        );

        console.log(
            `Items in existing collection: ${itemCount}`
        );

        // --------------------------------------------------
        // Create / reset demo user
        // --------------------------------------------------

        await createDemoUser();

        // --------------------------------------------------
        // Start server
        // --------------------------------------------------

        app.listen(
            PORT,
            () => {

                console.log("");

                console.log(
                    "=========================================="
                );

                console.log(
                    "SERVER STARTED"
                );

                console.log(
                    "=========================================="
                );

                console.log(
                    `Website: http://localhost:${PORT}`
                );

                console.log(
                    `API: http://localhost:${PORT}/api`
                );

                console.log(
                    `Items API: http://localhost:${PORT}/api/items`
                );

                console.log(
                    `Database: ${DB_NAME}`
                );

                console.log(
                    "=========================================="
                );

                console.log("");

            }
        );

    } catch (error) {

        console.error("");
        console.error(
            "=========================================="
        );

        console.error(
            "SERVER / DATABASE ERROR"
        );

        console.error(
            "=========================================="
        );

        console.error(error);

        process.exit(1);

    }

}

// ======================================================
// ERROR HANDLING
// ======================================================

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "Unhandled Promise Rejection:"
        );

        console.error(error);

    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "Uncaught Exception:"
        );

        console.error(error);

    }
);

// ======================================================
// RUN
// ======================================================

startServer();