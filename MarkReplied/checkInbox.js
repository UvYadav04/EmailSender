import imaps from "imap-simple";
import dotenv from 'dotenv';
import { Outreach } from "../index.js";
dotenv.config();

const config = {
    imap: {
        user: process.env.EMAIL,
        password: process.env.GMAIL_PASS,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 3000
    }
};

export async function checkRepliesForAllEmails() {
    try {
        console.log(process.env.EMAIL)
        console.log(process.env.GMAIL_PASS)
        const connection = await imaps.connect(config);
        await connection.openBox("INBOX");

        const searchCriteria = ["UNSEEN"];
        const fetchOptions = { bodies: ["HEADER.FIELDS (FROM TO SUBJECT)"], struct: true, markSeen: true };

        const messages = await connection.search(searchCriteria, fetchOptions);

        const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

        const senders = messages.map(msg => {
            const fromHeader = msg.parts[0].body.from[0];
            const match = fromHeader.match(/<(.+)>/);
            const email = match ? match[1] : fromHeader;
            return email.match(emailRegex) ? email.toLowerCase() : null;
        })
            .filter(Boolean)


        await Outreach.updateMany(
            { email: { $in: senders } },
            { $set: { replied: true } }
        )
        console.log("updated")
        connection.end();
    } catch (error) {
        console.log(error)
    }
}
