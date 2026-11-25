import express from "express";
import "dotenv/config";
import { inngest, functions } from "./inngest/index.js";
import { serve } from "inngest/express";
import indexRoutes from "./routes/index.routes.js"
import chatRoutes from "./routes/chat.routes.js"

const app = express();


app.use(express.json({ limit: "50mb" }));
app.use("/api/inngest", serve({ client: inngest, functions }));

app.get('/', (req, res) => {
    res.send("success")
})

app.use("/api/index", indexRoutes);
app.use("/api/chat", chatRoutes);

app.listen(3000, () => {
    console.log(`Server listening on port 3000`)
})