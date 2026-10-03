const dns = require("dns");

// Fix MongoDB Atlas SRV DNS resolution
dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

async function main() {

    if (!uri) {
        console.error("MONGODB_URI is missing from .env");
        return;
    }

    const client = new MongoClient(uri);

    try {

        await client.connect();

        console.log("Connected to MongoDB Atlas");

        const db = client.db("Lost&Found");
        const users = db.collection("users");

        const email = "anita@campus.edu";
        const password = "demo123";

        // Check whether demo user already exists
        const existingUser = await users.findOne({
            email: email
        });

        if (existingUser) {

            console.log("Demo user already exists!");

            console.log({
                name: existingUser.name,
                email: existingUser.email,
                role: existingUser.role
            });

            return;
        }

        // Hash password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        const demoUser = {

            name: "Anita Demo",

            email: email,

            password: hashedPassword,

            role: "student",

            createdAt: new Date()
        };

        const result =
            await users.insertOne(demoUser);

        console.log("");
        console.log("=================================");
        console.log("DEMO USER CREATED SUCCESSFULLY");
        console.log("=================================");
        console.log("Name:", demoUser.name);
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("User ID:", result.insertedId);
        console.log("=================================");

    } catch (error) {

        console.error("");
        console.error("ERROR CREATING DEMO USER:");
        console.error(error);

    } finally {

        await client.close();

    }
}

main();