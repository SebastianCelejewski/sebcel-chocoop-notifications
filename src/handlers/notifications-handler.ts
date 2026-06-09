import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import nodemailer from "nodemailer";

const ssm = new SSMClient({});

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

interface EventBridgeEvent {
    "detail-type": string;
    detail: Record<string, unknown>;
}

interface WorkRequestCreatedDetail {
    workRequestId: string;
    type: string;
    exp: number;
    urgency: string;
}

function buildEmailForWorkRequestCreated(detail: WorkRequestCreatedDetail, baseUrl: string): { subject: string; body: string } {
    return {
        subject: "Chores Cooperative - utworzono nowe zlecenie",
        body: [
            `Typ zadania: ${detail.type}`,
            `Punkty doświadczenia do zdobycia: ${detail.exp}`,
            `Do wykonania: ${detail.urgency}`,
            `Link: https://${baseUrl}/WorkRequestDetails/${detail.workRequestId}`,
        ].join("\n"),
    };
}

export const handler = async (event: unknown): Promise<void> => {
    console.log("Received event");
    console.log(JSON.stringify(event, null, 2));

    const env = process.env.ENVIRONMENT ?? "";
    const recipientsRaw = process.env.NOTIFICATION_RECIPIENTS ?? "";
    const smtpHost = process.env.SMTP_HOST ?? "";
    const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const smtpFrom = process.env.SMTP_FROM ?? "";
    const baseUrl = process.env.BASE_URL ?? "";

    if (!env || !recipientsRaw || !smtpHost || !smtpFrom || !baseUrl) {
        console.error("Missing required environment variables: ENVIRONMENT, NOTIFICATION_RECIPIENTS, SMTP_HOST, SMTP_FROM, BASE_URL");
        return;
    }

    const recipients = recipientsRaw.split(",").map(r => r.trim()).filter(Boolean);

    const e = event as EventBridgeEvent;

    if (e["detail-type"] !== "WorkRequestCreated") {
        console.log(`Ignoring unsupported event type: ${e["detail-type"]}`);
        return;
    }

    const { subject, body } = buildEmailForWorkRequestCreated(
        e.detail as WorkRequestCreatedDetail,
        baseUrl,
    );

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
        subject,
        text: body,
    });

    console.log(`Email sent to ${recipients.join(", ")}`);
};
