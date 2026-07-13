/**
 * One-time migration: copies all users from a Cognito User Pool to DynamoDB.
 *
 * Usage:
 *   USER_POOL_ID=eu-central-1_XjLqCleRC \
 *   USERS_TABLE_NAME=sebcel-chocoop-users-prod \
 *   AWS_REGION=eu-central-1 \
 *   node scripts/migrate-users-from-cognito.mjs
 *
 * Safe to run multiple times — uses UpdateExpression so existing prefs are preserved.
 */

import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const USER_POOL_ID = process.env.USER_POOL_ID;
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;
const REGION = process.env.AWS_REGION ?? "eu-central-1";

if (!USER_POOL_ID || !USERS_TABLE_NAME) {
    console.error("Required: USER_POOL_ID and USERS_TABLE_NAME environment variables");
    process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

function getAttribute(user, name) {
    return user.Attributes?.find(a => a.Name === name)?.Value ?? "";
}

let paginationToken;
let totalMigrated = 0;
let totalSkipped = 0;

do {
    const response = await cognito.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        PaginationToken: paginationToken,
    }));

    for (const user of response.Users ?? []) {
        const userId = getAttribute(user, "sub");
        const email = getAttribute(user, "email");
        const nickname = getAttribute(user, "nickname");

        if (!userId || !email) {
            console.warn(`Skipping user ${user.Username}: missing sub or email`);
            totalSkipped++;
            continue;
        }

        await ddb.send(new UpdateCommand({
            TableName: USERS_TABLE_NAME,
            Key: { userId },
            UpdateExpression: "SET #email = :email, nickname = :nickname",
            ExpressionAttributeNames: { "#email": "email" },
            ExpressionAttributeValues: { ":email": email, ":nickname": nickname },
        }));

        console.log(`Migrated: ${userId} (${nickname}, ${email})`);
        totalMigrated++;
    }

    paginationToken = response.PaginationToken;
} while (paginationToken);

console.log(`\nDone. Migrated: ${totalMigrated}, skipped: ${totalSkipped}`);
