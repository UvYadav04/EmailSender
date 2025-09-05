import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv'
import { sendStartupEmail } from "./utils/sendStartupEmail.js";
import { sendJobEmail } from "./utils/sendJobEmail.js";
dotenv.config();

const app = express();
const PORT = 3000;

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- MongoDB Setup ---
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true
});

const outreachSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    type: { type: String, enum: ["startup", "hr"], default: "startup" },
    position: { type: String, required: true },
    sent: { type: Number, default: 0 },
    lastSent: { type: Date, default: null },
    replied: { type: Boolean, default: false }
});
outreachSchema.index({ email: 1 }, { unique: true });

const Outreach = mongoose.model("Outreach", outreachSchema);

app.get("/new-email", (req, res) => {
    res.render("new-email");
});

app.post("/add-email", async (req, res) => {
    const { name, email, type, position } = req.body;
    try {
        await Outreach.create({ name, email, type, position });
        const user = await Outreach.findOne({ email })
        if (user)
            throw new Error("email already exists")
        await Outreach.create({ name, email, type, position });
        res.render("new-email");
    } catch (err) {
        res.render("error", { message: err.message });
    }
});

cron.schedule("0 3 * * *", async () => {
    console.log("🌙 3AM Cron started...");

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Startups
    const startups = await Outreach.find({
        type: "startup",
        replied: false,
        sent: { $lt: 4 },
        $or: [{ lastSent: null }, { lastSent: { $lt: oneWeekAgo } }],
    });

    for (const s of startups) {
        await sendStartupEmail(s.email, s.name, s.position);
        s.sent += 1;
        s.lastSent = new Date();
        await s.save();
    }

    // HRs
    const hrs = await Outreach.find({
        type: "hr",
        replied: false,
        sent: { $lt: 2 },
        $or: [{ lastSent: null }, { lastSent: { $lt: oneWeekAgo } }],
    });

    for (const h of hrs) {
        await sendJobEmail(h.email, h.name, h.position);
        h.sent += 1;
        h.lastSent = new Date();
        await h.save();
    }

    console.log("🌙 3AM Cron finished.");
});


sendJobEmail("dineshyadav.connect@gmail.com", "code brands", "Full stack software developer")
sendStartupEmail("dineshyadav.connect@gmail.com", "code brands", "Full stack software developer")

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
