// eslint.config.js

const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");
const unusedImports = require("eslint-plugin-unused-imports");

module.exports = [
  // Base ESLint recommended rules
  js.configs.recommended,

  // Disable formatting rules that conflict with Prettier
  prettier,

  // Main project rules
  {
    plugins: {
      "unused-imports": unusedImports
    },

    rules: {
      /*
       * =========================
       * 🔒 Error Prevention
       * =========================
       */
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-unused-private-class-members": "error",
      "no-constant-binary-expression": "error",

      /*
       * =========================
       * 🧠 Code Quality
       * =========================
       */
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-shadow": "warn",
      "no-return-await": "error",
      "no-useless-return": "warn",
      "no-useless-constructor": "error",
      "no-duplicate-imports": "error",
      "no-var": "error",
      "prefer-const": "warn",
      "prefer-template": "warn",
      "object-shorthand": ["warn", "always"],
      "no-implicit-coercion": "warn",

      /*
       * =========================
       * 🧹 Clean Code
       * =========================
       */
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "eol-last": ["error", "always"],

      /*
       * =========================
       * 🛠 Developer Experience
       * =========================
       */
      "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
      "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",

      /*
       * =========================
       * 🧹 Unused Imports (PLUGIN)
       * =========================
       */

      // Turn OFF core rule
      "no-unused-vars": "off",

      // Remove unused imports automatically
      "unused-imports/no-unused-imports": "error",

      // Detect unused variables (but ignore _ prefixed)
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_"
        }
      ],

      /*
       * =========================
       * 🔓 Relaxed Rules
       * =========================
       */
      "no-prototype-builtins": "off",
      "no-useless-escape": "off"
    }
  },

  // JS Files
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },

  // Ignore build artifacts
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.min.js",
      "public/**"
    ]
  }
];
