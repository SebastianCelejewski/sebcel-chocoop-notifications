export type { EmailPrefKey } from "./notification-constants.js";

export interface Email {
    subject: string;
    body: string;
    prefKey: EmailPrefKey;
    recipient?: string;
    targetUserId?: string;
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

interface ActivityCreatedDetail {
    activityId: string;
    createdByName: string;
    type: string;
    exp: string;
    date: string;
}

interface ActivityReminderNeededDetail {
    userId?: string;
    userEmail: string;
    userName: string;
    date: string;
}

export function buildEmail(detailType: string, detail: Record<string, unknown>, baseUrl: string): Email | null {
    switch (detailType) {
        case "WorkRequestCreated": {
            const d = detail as WorkRequestCreatedDetail;
            return {
                prefKey: "workRequestCreated",
                subject: `Chores Cooperative - ${d.type} do wykonania ${d.urgencyDescription.charAt(0).toLowerCase()}${d.urgencyDescription.slice(1)} za ${d.exp} exp`,
                body: [
                    `${d.createdByName} dodał(a) nowe zlecenie.`,
                    "",
                    `Typ zadania: ${d.type}`,
                    `Punkty doświadczenia do zdobycia: ${d.exp}`,
                    `Do wykonania: ${d.urgencyDescription}`,
                    `Link: https://${baseUrl}/WorkRequestDetails/${d.workRequestId}`,
                ].join("\n"),
            };
        }
        case "WorkRequestCompleted": {
            const d = detail as WorkRequestCompletedDetail;
            return {
                prefKey: "workRequestCompleted",
                subject: `Chores Cooperative - ${d.completedByName} wykonał zlecenie na ${d.type} za ${d.exp} exp`,
                body: [
                    `${d.completedByName} wykonał(a) zlecenie.`,
                    "",
                    `Typ zadania: ${d.type}`,
                    `Zdobyte punkty doświadczenia: ${d.exp}`,
                    `Data: ${d.date}`,
                    `Link: https://${baseUrl}/WorkRequestDetails/${d.workRequestId}`,
                ].join("\n"),
            };
        }
        case "ReactionAdded": {
            const d = detail as ReactionAddedDetail;
            return {
                prefKey: "reactionAdded",
                subject: `Chores Cooperative - ${d.activityUserName} otrzymuje ${d.reaction} za ${d.activityType} od ${d.reactionUserName}`,
                body: [
                    `${d.reactionUserName} zareagował(a) ${d.reaction} na aktywność użytkownika ${d.activityUserName}.`,
                    "",
                    `Typ aktywności: ${d.activityType}`,
                    `Link: https://${baseUrl}/ActivityDetails/${d.activityId}`,
                ].join("\n"),
            };
        }
        case "ActivityCreated": {
            const d = detail as ActivityCreatedDetail;
            return {
                prefKey: "activityCreated",
                subject: `Chores Cooperative - ${d.createdByName} zdobył(a) ${d.exp} exp za ${d.type}`,
                body: [
                    `${d.createdByName} zarejestrował(a) nową czynność.`,
                    "",
                    `Typ czynności: ${d.type}`,
                    `Zdobyte punkty doświadczenia: ${d.exp}`,
                    `Data: ${d.date}`,
                    `Link: https://${baseUrl}/ActivityDetails/${d.activityId}`,
                ].join("\n"),
            };
        }
        case "ActivityReminderNeeded": {
            const d = detail as ActivityReminderNeededDetail;
            return {
                prefKey: "activityReminder",
                subject: `Chores Cooperative - nie masz dzisiaj jeszcze zarejestrowanych żadnych zasług`,
                body: [
                    `Cześć ${d.userName}!`,
                    "",
                    `Nie zarejestrowałeś/aś jeszcze żadnej aktywności dzisiaj (${d.date}).`,
                    `Zaloguj aktywność, żeby nie stracić punktów!`,
                    "",
                    `Link: https://${baseUrl}`,
                ].join("\n"),
                recipient: d.userEmail,
                targetUserId: d.userId,
            };
        }
        default:
            return null;
    }
}
