import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-img-element": "off",
      // Browser preferences and imperative Cesium synchronization are initialized after hydration.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "public/cesium/**",
    ".venv/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);
