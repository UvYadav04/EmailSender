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
import { checkRepliesForAllEmails } from "./MarkReplied/checkInbox.js";
dotenv.config();

const app = express();

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
}).then(() =>
    console.log("connected database"))
    .catch((e) =>
        console.log(e));

const outreachSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    type: { type: String, enum: ["startup", "hr"], default: "startup" },
    position: { type: String, required: true },
    sent: { type: Number, default: 0 },
    lastSent: { type: Date, default: null },
    replied: { type: Boolean, default: false }
});
export const Outreach = mongoose.model("Outreach", outreachSchema);

app.get("/", (req, res) => {
    res.render("new-email");
});

app.post("/add-email", async (req, res) => {
    const { name, email, type, position } = req.body;
    try {
        const user = await Outreach.findOne({ email })
        if (user)
            throw new Error("email already exists")
        await Outreach.create({ name, email, type, position });
        res.render("new-email");
    } catch (err) {
        res.render("error", { message: err.message });
    }
});


app.get("/update-replied", async (req, res) => {
    try {
        await checkRepliesForAllEmails()
        res.status(200).json({ success: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, error: error })
    }
})

app.get("/send-email", async (req, res) => {
    try {
        const latestMail = await Outreach.findOne({ sent: { $lt: 4 }, replied: false, $or: [{ lastSent: null }, { lastSent: { $lt: new Date() } }] })
        const fourDaysLater = new Date();
        fourDaysLater.setDate(fourDaysLater.getDate() + 4);
        if (!latestMail)
            return res.json({ sucess: true, message: "all are sent" })
        if (latestMail.type === "hr") {
            await sendJobEmail(latestMail.email, latestMail.name, latestMail.position);
            latestMail.sent += 1;
            latestMail.lastSent = fourDaysLater;
            await latestMail.save();
        }
        else if (latestMail.type === "startup") {
            await sendStartupEmail(latestMail.email, latestMail.name, latestMail.position);
            latestMail.sent += 1;
            latestMail.lastSent = fourDaysLater;
            await latestMail.save();
        }
        console.log("Email sending done")

        return res.json({ success: true, message: "email sent successfully" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, error: error })
    }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
