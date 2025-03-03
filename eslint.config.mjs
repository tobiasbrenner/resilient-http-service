import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("prettier"), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
    },
}, ...compat.extends(
    "plugin:@angular-eslint/recommended",
    "plugin:@angular-eslint/template/process-inline-templates",
).map(config => ({
    ...config,
    files: ["**/*.ts"],
})), {
    files: ["**/*.ts"],

    languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            project: ["tsconfig.json"],
            createDefaultProgram: true,
        },
    },

    rules: {
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/member-ordering": ["off"],

        "@typescript-eslint/naming-convention": ["error", {
            selector: "enumMember",
            format: ["UPPER_CASE"],
        }, {
            selector: "enum",
            format: ["UPPER_CASE"],
        }],

        "@typescript-eslint/explicit-member-accessibility": ["error", {
            accessibility: "explicit",

            overrides: {
                constructors: "off",
            },
        }],

        "@typescript-eslint/no-invalid-this": ["error"],

        "@typescript-eslint/array-type": ["error", {
            default: "array-simple",
        }],

        "@typescript-eslint/ban-ts-comment": "error",
        "@typescript-eslint/ban-tslint-comment": "error",
        "@typescript-eslint/explicit-function-return-type": "error",
        "@typescript-eslint/method-signature-style": ["error", "method"],

        "@typescript-eslint/no-unused-vars": ["warn", {
            args: "none",
        }],

        "@typescript-eslint/no-useless-constructor": ["error"],
        "import/order": "off",

        "no-console": ["error", {
            allow: ["error"],
        }],

        "no-alert": "error",
        "no-debugger": "error",
        "no-array-constructor": "error",
        "no-caller": "error",
        "no-constant-condition": "error",
        "no-duplicate-case": "error",
        "no-empty": "error",
        "no-ex-assign": "error",
        "no-extra-boolean-cast": "error",
        "no-irregular-whitespace": "error",
        "no-import-assign": "error",
        "no-misleading-character-class": "error",
        "no-obj-calls": "error",
        "getter-return": "error",
        "no-setter-return": "error",
        "no-sparse-arrays": "error",
        "no-unreachable": "error",
        "no-unsafe-finally": "error",
        "no-unsafe-negation": "error",
        "valid-typeof": "error",
        "array-callback-return": "error",
        "no-var": "error",
        "class-methods-use-this": "off",
        "consistent-return": "error",
        curly: "error",
        "default-case": "error",
        "default-case-last": "error",
        "default-param-last": "error",
        "dot-location": ["error", "property"],
        eqeqeq: "error",
        "no-eval": "error",
        "no-extend-native": "error",
        "no-extra-bind": "error",
        "no-extra-label": "error",
        "no-implied-eval": "error",
        "no-invalid-this": "off",
        "no-iterator": "error",
        "no-lone-blocks": "error",
        "no-multi-spaces": "error",
        "no-multi-str": "error",
        "no-new-wrappers": "error",
        "no-script-url": "error",
        "no-sequences": "error",
        "no-throw-literal": "error",
        "no-unused-expressions": "error",
        "no-unused-labels": "error",
        "no-unused-vars": "off",
        "no-useless-return": "error",
        "no-with": "error",
        radix: "error",
        "require-await": "error",
        "vars-on-top": "warn",
        yoda: "error",
        "no-use-before-define": "error",
        camelcase: "error",
        "capitalized-comments": "off",
        "func-name-matching": "error",
        "keyword-spacing": "error",
        "max-depth": "error",
        "no-multi-assign": "error",
        "no-new-object": "error",
        "no-plusplus": "error",
        "no-underscore-dangle": "off",
        "no-unneeded-ternary": "error",
        "one-var": ["error", "never"],
        "prefer-object-spread": "warn",
        "sort-keys": "off",
        "sort-vars": "off",
        "arrow-body-style": "error",
        "constructor-super": "error",
        "no-class-assign": "error",
        "no-const-assign": "error",
        "no-dupe-class-members": "error",
        "no-duplicate-imports": "error",
        "no-new-symbol": "error",
        "no-this-before-super": "error",
        "no-useless-computed-key": "error",
        "no-useless-constructor": "off",
        "prefer-arrow-callback": "error",
        "prefer-const": "error",
        "prefer-rest-params": "error",
        "prefer-spread": "error",
        "prefer-template": "error",
        "require-yield": "error",
        "sort-imports": "off",
        "symbol-description": "error",
    },
}, ...compat.extends("plugin:@angular-eslint/template/recommended").map(config => ({
    ...config,
    files: ["**/*.html"],
})), {
    files: ["**/*.html"],
    rules: {},
}];