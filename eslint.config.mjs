import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import vue from "eslint-plugin-vue";
import globals from "globals";
import typescriptEslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "src/lib/**",
    "src/webgl/scenes/**",
  ]),
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["src/**/*.{js,ts,vue}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["src/**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
]);
