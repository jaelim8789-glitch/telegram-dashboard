import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { noForbiddenProps } from "./src/lib/eslint-rules/no-forbidden-props.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["scripts/**/*.{js,cjs,mjs}"],
    languageOptions: {
      sourceType: "commonjs",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Codebase has long-standing `any` usage throughout (error handlers, third-party
    // SDK boundaries, etc.) — production build treats ESLint errors as fatal, so this
    // stays a warning rather than blocking every build over pre-existing style debt.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    plugins: {
      local: {
        rules: { "no-forbidden-props": noForbiddenProps },
      },
    },
    rules: {
      "local/no-forbidden-props": "error",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/components/landing/AIVirtualAssistantSection.tsx",
      "src/security/**",
      "src/logging/**",
      "src/middleware/**",
      "src/validators/**",
      "src/utils/cryptoUtils.ts",
      "src/lib/animationOptimization.tsx",
      "src/lib/bundleOptimization.tsx",
      "src/lib/cssOptimization.tsx",
      "src/lib/dataStructureOptimization.tsx",
      "src/lib/eventOptimization.tsx",
      "src/lib/fontOptimization.tsx",
      "src/lib/resourcePreloading.tsx",
      "src/lib/ssrOptimization.tsx",
      "src/hooks/useSmartSync.tsx",
      "src/components/workspace/TabContent.tsx",
    ],
  },
];

export default eslintConfig;
