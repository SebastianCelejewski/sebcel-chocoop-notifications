import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Email } from "./email-templates.js";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function resolveRecipients(email: Email, tableName: string): Promise<string[]> {
    if (email.recipient) {
        if (email.targetUserId && tableName) {
            const result = await ddb.send(new GetCommand({
                TableName: tableName,
                Key: { userId: email.targetUserId },
                ProjectionExpression: "prefs",
            }));
            if (result.Item?.prefs?.email?.[email.prefKey] !== true) {
                console.log(`User ${email.targetUserId} has not opted in to ${email.prefKey}`);
                return [];
            }
        }
        return [email.recipient];
    }

    const result = await ddb.send(new ScanCommand({ TableName: tableName }));
    const recipients = (result.Items ?? [])
        .filter(user => user.prefs?.email?.[email.prefKey] === true)
        .map(user => user.email as string)
        .filter(Boolean);
    console.log(`Recipients for ${email.prefKey}: ${recipients.join(", ")}`);
    return recipients;
}
