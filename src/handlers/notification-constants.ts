export const NOTIFICATION_TYPES = [
    {
        key: "activityReminder",
        label: "Przypomnienie o czynności",
        description: "Codzienne przypomnienie o wpisaniu czynności (wysyłane o 19:00 jeśli nie masz wpisu z danego dnia)",
        channels: ["email"],
    },
    {
        key: "workRequestCreated",
        label: "Nowe zlecenie",
        description: "Gdy ktoś wystawi nowe zlecenie",
        channels: ["email"],
    },
    {
        key: "workRequestCompleted",
        label: "Wykonane zlecenie",
        description: "Gdy ktoś wykona zlecenie",
        channels: ["email"],
    },
    {
        key: "activityCreated",
        label: "Nowa czynność",
        description: "Gdy ktoś doda nową czynność",
        channels: ["email"],
    },
    {
        key: "reactionAdded",
        label: "Reakcja na czynność",
        description: "Gdy ktoś zareaguje na czyjąś czynność",
        channels: ["email"],
    },
];

export const DEFAULT_PREFS = {
    email: {
        activityReminder: true,
        workRequestCreated: true,
        workRequestCompleted: true,
        activityCreated: false,
        reactionAdded: true,
    },
};
