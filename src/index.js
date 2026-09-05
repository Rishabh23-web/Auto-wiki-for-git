import express from "express";
import "dotenv/config";
import { inngest, functions } from "./inngest/index.js";
import { serve } from "inngest/express";

const app = express();

app.use(express.json());
app.use("/api/inngest", serve({ client: inngest, functions }))

app.get('/', (req, res) => {
    res.send("success")
})

app.listen(3000, () => {
    console.log(`Server listening on port 3000`)
})