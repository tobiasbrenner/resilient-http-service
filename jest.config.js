// jest.config.js
module.exports = {
    preset: 'jest-preset-angular',
    moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    reporters: [
        'default',
        [
            './node_modules/jest-html-reporter',
            {
                pageTitle: 'Test Report',
                outputPath: './doc/test/index.html',
            },
        ],
    ],
    modulePathIgnorePatterns: ['<rootDir>/e2e/'],
    collectCoverageFrom: [
        'projects/resilient-http-client/src/**/*.ts',
        'projects/resilient-http-client/!src/**/*.spec.ts',
        'projects/resilient-http-client/!src/**/*.type.ts',
        'projects/resilient-http-client/!src/test/*.ts',
        'projects/resilient-http-client/!src/environments/**/*.ts',
        '!**/node_modules/**',
        '!**/vendor/**',
    ],
    collectCoverage: true,
    coverageReporters: ['json', 'json-summary', 'text', 'lcov', 'clover'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/main.ts',
        '/polyfills.ts',
        '/*..resolver.ts',
        '/*..type.ts',
        '/*..config.ts',
        '/*..constants.ts',
        '/*..module.ts',
        '/*..mock.ts',
        '/*..enum.ts',
        '/*..directive.ts',
        '/*..action.ts',
        'public-api.ts'
    ],
    coverageDirectory: './doc/test/coverage',
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};
