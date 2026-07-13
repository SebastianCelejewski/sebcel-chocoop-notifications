import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { DEFAULT_PREFS, NOTIFICATION_TYPES } from "./notification-constants";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Verifier is created once per Lambda container and caches the Cognito JWKS
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method;

    if (method === "OPTIONS") {
        return { statusCode: 200, body: "" };
    }

    const path = event.requestContext.http.path;

    if (method === "GET" && path === "/notification-types") {
        return respond(200, NOTIFICATION_TYPES);
    }

    const token = getAuthToken(event);

    if (!token) {
        return respond(401, { error: "Unauthorized" });
    }

    const userId = await getUserIdFromToken(token);

    if (!userId) {
        return respond(401, { error: "Invalid token" });
    }

    const tableName = process.env.USERS_TABLE_NAME ?? "";

    if (method === "GET") {
        const prefs = await loadPreferences(tableName, userId);
        return respond(200, prefs);
    }

    if (method === "PUT") {
        const prefs = JSON.parse(event.body ?? "{}");
        await savePreferences(tableName, userId, prefs);
        return respond(200, { ok: true });
    }

    return respond(405, { error: "Method not allowed" });
};

function getAuthToken(event: APIGatewayProxyEventV2): string {
    const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? "";
    return authHeader.replace(/^Bearer /i, "").trim();
}

async function getUserIdFromToken(token: string): Promise<string | null> {
    try {
        const payload = await getVerifier().verify(token);
        return payload.sub;
    } catch {
        return null;
    }
}

function getVerifier() {
    if (!verifier) {
        verifier = CognitoJwtVerifier.create({
            userPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
            clientId: process.env.COGNITO_CLIENT_ID ?? "",
            tokenUse: "id",
        });
    }
    return verifier;
}

function respond(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

async function loadPreferences(tableName: string, userId: string): Promise<unknown> {
    const result = await ddb.send(new GetCommand({
        TableName: tableName,
        Key: { userId },
        ProjectionExpression: "prefs",
    }));

    return result.Item?.prefs ?? DEFAULT_PREFS;
}

async function savePreferences(tableName: string, userId: string, prefs: unknown): Promise<void> {
    await ddb.send(new UpdateCommand({
        TableName: tableName,
        Key: { userId },
        UpdateExpression: "SET prefs = :prefs",
        ExpressionAttributeValues: { ":prefs": prefs },
    }));
}
