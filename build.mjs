import esbuild from "esbuild";
import AdmZip from "adm-zip";

await esbuild.build({
    entryPoints: [
        "src/handlers/notifications-handler.ts"
    ],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: "build/notifications-handler.js",
    sourcemap: true
});

const zip = new AdmZip();

zip.addLocalFile(
    "build/notifications-handler.js"
);

zip.writeZip(
    "build/notifications-handler.zip"
);

console.log("Build completed");