import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface UserCreatedDetail { userId: string; email: string; nick: string; }
export interface UserUpdatedDetail { userId: string; email: string; nick: string; }
export interface UserDeletedDetail { userId: string; }

export async function handleUserCreated(detail: UserCreatedDetail, tableName: string): Promise<void> {
    try {
        await ddb.send(new PutCommand({
            TableName: tableName,
            Item: { userId: detail.userId, email: detail.email, nick: detail.nick },
            ConditionExpression: "attribute_not_exists(userId)",
        }));
        console.log(`User created: ${detail.userId}`);
    } catch (err: unknown) {
        if ((err as { name?: string }).name !== "ConditionalCheckFailedException") throw err;
        console.log(`User already exists, skipping: ${detail.userId}`);
    }
}

export async function handleUserUpdated(detail: UserUpdatedDetail, tableName: string): Promise<void> {
    await ddb.send(new UpdateCommand({
        TableName: tableName,
        Key: { userId: detail.userId },
        UpdateExpression: "SET #email = :email, nick = :nick",
        ExpressionAttributeNames: { "#email": "email" },
        ExpressionAttributeValues: { ":email": detail.email, ":nick": detail.nick },
    }));
    console.log(`User updated: ${detail.userId}`);
}

export async function handleUserDeleted(detail: UserDeletedDetail, tableName: string): Promise<void> {
    await ddb.send(new DeleteCommand({
        TableName: tableName,
        Key: { userId: detail.userId },
    }));
    console.log(`User deleted: ${detail.userId}`);
}
