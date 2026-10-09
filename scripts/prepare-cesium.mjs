import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
await mkdir("public/cesium", { recursive: true });
for (const directory of [
  "Workers",
  "Assets",
  "Widgets",
  "ThirdParty",
  "Cesium.js",
]) {
  await cp(
    join("node_modules/cesium/Build/Cesium", directory),
    join("public/cesium", directory),
    { recursive: true },
  );
}
await mkdir("public/licenses", { recursive: true });
for (const [source, target] of [
  ["node_modules/cesium/LICENSE.md", "Cesium-LICENSE.md"],
  ["node_modules/@fontsource/manrope/LICENSE", "Manrope-OFL.txt"],
  ["node_modules/lucide-react/LICENSE", "Lucide-LICENSE.txt"],
  ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  ["LICENSE", "LICENSE"],
]) {
  await cp(source, join("public/licenses", target));
}
