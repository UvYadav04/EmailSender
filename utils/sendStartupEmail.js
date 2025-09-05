import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.GMAIL_PASS
    }
});

export async function sendStartupEmail(toEmail, company, position) {
    // Render EJS template
    const html = await ejs.renderFile(
        path.join(__dirname, "startup-email-template.ejs"),
        { company, position }
    );

    // Send mail
    const info = await transporter.sendMail({
        from: process.env.EMAIL,
        to: toEmail,
        subject: `🌟Excited to Build Impactful Products with ${company} as Full Stack Developer`,
        html: html,
        attachments: [
            {
                filename: "Dinesh Yadav.pdf",
                path: path.join(__dirname, "documents", "Dinesh Yadav.pdf")
            }
        ]
    });

    console.log("Email sent: ", info.messageId);
}

