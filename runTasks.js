import { sendEmails, checkReplies } from './index.js'; // ensure exported from index.js

async function main() {
    await checkReplies();    // Step 1
    await sendEmails();      // Step 2
    console.log("✅ Tasks finished");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
