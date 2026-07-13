import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Email } from "./email-templates.js";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function resolveRecipients(email: Email, tableName: string, fallbackRecipients: string[]): Promise<string[]> {
    if (email.recipient) {
        if (email.targetUserId && tableName) {
            const result = await ddb.send(new GetCommand({
                TableName: tableName,
                Key: { userId: email.targetUserId },
                ProjectionExpression: "prefs",
            }));
            if (result.Item?.prefs?.email?.[email.prefKey] === false) {
                console.log(`User ${email.targetUserId} has opted out of ${email.prefKey}`);
                return [];
            }
        }
        return [email.recipient];
    }

    if (tableName) {
        const result = await ddb.send(new ScanCommand({ TableName: tableName }));
        const users = result.Items ?? [];

        if (users.length > 0) {
            const recipients = users
                .filter(user => user.prefs?.email?.[email.prefKey] !== false)
                .map(user => user.email as string)
                .filter(Boolean);
            console.log(`DynamoDB recipients for ${email.prefKey}: ${recipients.join(", ")}`);
            return recipients;
        }
    }

    console.log(`Falling back to NOTIFICATION_RECIPIENTS for ${email.prefKey}`);
    return fallbackRecipients;
}
