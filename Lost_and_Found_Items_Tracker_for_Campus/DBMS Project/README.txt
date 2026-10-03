CAMPUS LOST & FOUND - MongoDB-connected version

1. Keep your existing .env in this folder. Example:
   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@bookflow.smx2wqa.mongodb.net/?retryWrites=true&w=majority
   PORT=3000

2. Install packages in this folder if needed:
   npm install express mongodb cors dotenv

3. Run:
   node server.js

4. Open:
   http://localhost:3000

5. API test:
   http://localhost:3000/api/items

This version connects item loading, reporting, marking returned, and admin deletion to MongoDB.
Users and claims remain browser-local for now.
