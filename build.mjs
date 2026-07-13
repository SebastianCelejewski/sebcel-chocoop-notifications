import esbuild from "esbuild";
import AdmZip from "adm-zip";

const sharedConfig = {
    bundle: true,
    platform: "node",
    target: "node20",
    sourcemap: true,
    external: ["@aws-sdk/client-*"],  // SDK clients are provided by the Lambda runtime; lib-dynamodb and aws-jwt-verify are bundled
};

await Promise.all([
    esbuild.build({
        ...sharedConfig,
        entryPoints: ["src/handlers/notifications-handler.ts"],
        outfile: "build/notifications-handler.js",
    }),
    esbuild.build({
        ...sharedConfig,
        entryPoints: ["src/handlers/preferences-handler.ts"],
        outfile: "build/preferences-handler.js",
    }),
]);

const notificationsZip = new AdmZip();
notificationsZip.addLocalFile("build/notifications-handler.js");
notificationsZip.writeZip("build/notifications-handler.zip");

const preferencesZip = new AdmZip();
preferencesZip.addLocalFile("build/preferences-handler.js");
preferencesZip.writeZip("build/preferences-handler.zip");

console.log("Build completed");
