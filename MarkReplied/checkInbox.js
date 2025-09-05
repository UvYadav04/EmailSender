import imaps from "imap-simple";
import dotenv from 'dotenv';
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

export async function checkRepliesForAllEmails(emailDocs) {
    try {
        const connection = await imaps.connect(config);
        await connection.openBox("INBOX");

        const searchCriteria = ["UNSEEN"];
        const fetchOptions = { bodies: ["HEADER.FIELDS (FROM TO SUBJECT)"], struct: true, markSeen: true };

        const messages = await connection.search(searchCriteria, fetchOptions);

        const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

        const senders = new Set(
            messages
                .map(msg => {
                    const fromHeader = msg.parts[0].body.from[0];
                    const match = fromHeader.match(/<(.+)>/);
                    const email = match ? match[1] : fromHeader;
                    return email.match(emailRegex) ? email.toLowerCase() : null;
                })
                .filter(Boolean)
        );


        for (const doc of emailDocs) {
            if (senders.has(doc.email.toLowerCase())) {
                doc.replied = true;
                await doc.save();
                console.log(`Marked ${doc.email} as replied`);
            }
        }

        connection.end();
    } catch (error) {
        console.log(error)
    }
}
