const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    rules: {
      // Only basic formatting rules - very safe
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { max: 1 }],

      // Very relaxed rules - allow debugging
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
      "no-prototype-builtins": "off",
      "no-useless-escape": "off",

      // Basic error prevention
      "no-undef": "error",

      // Allow console and debugging
      "no-console": "off",
      "no-debugger": "off"
    }
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
        HTMLElement: "readonly",
        fetch: "readonly",
        requestAnimationFrame: "readonly",
        CustomEvent: "readonly",
        performance: "readonly",
        alert: "readonly",
        confirm: "readonly",

        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        crypto: "readonly"
      }
    }
  },
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
