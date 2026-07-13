import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import nodemailer from "nodemailer";
import { buildEmail } from "../notifications/email-templates.js";
import { handleUserCreated, handleUserUpdated, handleUserDeleted, UserCreatedDetail, UserUpdatedDetail, UserDeletedDetail } from "../notifications/user-lifecycle.js";
import { resolveRecipients } from "../notifications/recipient-resolver.js";

const ssm = new SSMClient({});

interface EventBridgeEvent {
    "detail-type": string;
    detail: Record<string, unknown>;
}

export const handler = async (event: unknown): Promise<void> => {
    console.log("Received event");
    console.log(JSON.stringify(event, null, 2));

    const e = event as EventBridgeEvent;
    const tableName = process.env.USERS_TABLE_NAME ?? "";
    const detailType = e["detail-type"];

    if (detailType === "UserCreated") { await handleUserCreated(e.detail as UserCreatedDetail, tableName); return; }
    if (detailType === "UserUpdated") { await handleUserUpdated(e.detail as UserUpdatedDetail, tableName); return; }
    if (detailType === "UserDeleted") { await handleUserDeleted(e.detail as UserDeletedDetail, tableName); return; }

    if (process.env.NOTIFICATIONS_ENABLED === "false") {
        console.log("Notifications are disabled. Skipping.");
        return;
    }

    const env = process.env.ENVIRONMENT ?? "";
    const smtpHost = process.env.SMTP_HOST ?? "";
    const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const smtpFrom = process.env.SMTP_FROM ?? "";
    const baseUrl = process.env.BASE_URL ?? "";

    if (!env || !smtpHost || !smtpFrom || !baseUrl) {
        console.error("Missing required environment variables: ENVIRONMENT, SMTP_HOST, SMTP_FROM, BASE_URL");
        return;
    }

    const email = buildEmail(detailType, e.detail, baseUrl);
    if (!email) {
        console.log(`Ignoring unsupported event type: ${detailType}`);
        return;
    }

    const fallbackRecipients = (process.env.NOTIFICATION_RECIPIENTS ?? "").split(",").map(r => r.trim()).filter(Boolean);
    const recipients = await resolveRecipients(email, tableName, fallbackRecipients);

    if (recipients.length === 0) {
        console.log("No recipients to send to. Skipping.");
        return;
    }

    const { username, password } = await getSmtpCredentials(env);

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: username, pass: password },
    });

    await transporter.sendMail({
        from: smtpFrom,
        to: recipients.join(", "),
        subject: email.subject,
        text: email.body,
    });

    console.log(`Email sent to ${recipients.join(", ")}`);
};

async function getSmtpCredentials(env: string): Promise<{ username: string; password: string }> {
    const base = `/sebcel-chocoop-notifications/${env}/smtp`;

    const [usernameRes, passwordRes] = await Promise.all([
        ssm.send(new GetParameterCommand({ Name: `${base}/username`, WithDecryption: true })),
        ssm.send(new GetParameterCommand({ Name: `${base}/password`, WithDecryption: true })),
    ]);

    return {
        username: usernameRes.Parameter?.Value ?? "",
        password: passwordRes.Parameter?.Value ?? "",
    };
}