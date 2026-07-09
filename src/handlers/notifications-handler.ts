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
    createdByName: string;
    type: string;
    exp: string;
    urgencyDescription: string;
}

interface WorkRequestCompletedDetail {
    workRequestId: string;
    completedByName: string;
    type: string;
    exp: string;
    date: string;
}

interface ReactionAddedDetail {
    activityId: string;
    activityType: string;
    activityUserName: string;
    reactionUserName: string;
    reaction: string;
}

interface ActivityReminderNeededDetail {
    userEmail: string;
    userName: string;
    date: string;
}

interface Email {
    subject: string;
    body: string;
    recipient?: string;
}

function buildWorkRequestCreatedEmail(detail: WorkRequestCreatedDetail, baseUrl: string): Email {
    return {
        subject: `Chores Cooperative - ${detail.type} do wykonania ${detail.urgencyDescription.charAt(0).toLowerCase()}${detail.urgencyDescription.slice(1)} za ${detail.exp} exp`,
        body: [
            `${detail.createdByName} dodał(a) nowe zlecenie.`,
            "",
            `Typ zadania: ${detail.type}`,
            `Punkty doświadczenia do zdobycia: ${detail.exp}`,
            `Do wykonania: ${detail.urgencyDescription}`,
            `Link: https://${baseUrl}/WorkRequestDetails/${detail.workRequestId}`,
        ].join("\n"),
    };
}

function buildWorkRequestCompletedEmail(detail: WorkRequestCompletedDetail, baseUrl: string): Email {
    return {
        subject: `Chores Cooperative - ${detail.completedByName} wykonał zlecenie na ${detail.type} za ${detail.exp} exp`,
        body: [
            `${detail.completedByName} wykonał(a) zlecenie.`,
            "",
            `Typ zadania: ${detail.type}`,
            `Zdobyte punkty doświadczenia: ${detail.exp}`,
            `Data: ${detail.date}`,
            `Link: https://${baseUrl}/WorkRequestDetails/${detail.workRequestId}`,
        ].join("\n"),
    };
}

function buildReactionAddedEmail(detail: ReactionAddedDetail, baseUrl: string): Email {
    return {
        subject: `Chores Cooperative - ${detail.activityUserName} otrzymuje ${detail.reaction} za ${detail.activityType} od ${detail.reactionUserName}`,
        body: [
            `${detail.reactionUserName} zareagował(a) ${detail.reaction} na aktywność użytkownika ${detail.activityUserName}.`,
            "",
            `Typ aktywności: ${detail.activityType}`,
            `Link: https://${baseUrl}/ActivityDetails/${detail.activityId}`,
        ].join("\n"),
    };
}

function buildActivityReminderNeededEmail(detail: ActivityReminderNeededDetail, baseUrl: string): Email {
    return {
        subject: `Chores Cooperative - nie masz dzisiaj jeszcze zarejestrowanych żadnych zasług`,
        body: [
            `Cześć ${detail.userName}!`,
            "",
            `Nie zarejestrowałeś/aś jeszcze żadnej aktywności dzisiaj (${detail.date}).`,
            `Zaloguj aktywność, żeby nie stracić punktów!`,
            "",
            `Link: https://${baseUrl}`,
        ].join("\n"),
        recipient: detail.userEmail,
    };
}

function buildEmail(detailType: string, detail: Record<string, unknown>, baseUrl: string): Email | null {
    switch (detailType) {
        case "WorkRequestCreated":
            return buildWorkRequestCreatedEmail(detail as WorkRequestCreatedDetail, baseUrl);
        case "WorkRequestCompleted":
            return buildWorkRequestCompletedEmail(detail as WorkRequestCompletedDetail, baseUrl);
        case "ReactionAdded":
            return buildReactionAddedEmail(detail as ReactionAddedDetail, baseUrl);
        case "ActivityReminderNeeded":
            return buildActivityReminderNeededEmail(detail as ActivityReminderNeededDetail, baseUrl);
        default:
            return null;
    }
}

export const handler = async (event: unknown): Promise<void> => {
    console.log("Received event");
    console.log(JSON.stringify(event, null, 2));

    const notificationsEnabled = process.env.NOTIFICATIONS_ENABLED !== "false";

    if (!notificationsEnabled) {
        console.log("Notifications are disabled. Skipping.");
        return;
    }

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

    const e = event as EventBridgeEvent;
    const email = buildEmail(e["detail-type"], e.detail, baseUrl);

    if (!email) {
        console.log(`Ignoring unsupported event type: ${e["detail-type"]}`);
        return;
    }

    const recipients = email.recipient
        ? [email.recipient]
        : recipientsRaw.split(",").map(r => r.trim()).filter(Boolean);

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
