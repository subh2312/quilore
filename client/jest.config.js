/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@sentry/react-native$": "<rootDir>/__tests__/mocks/sentry.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          types: ["jest", "node"],
          paths: {
            "@sentry/react-native": ["__tests__/mocks/sentry.ts"],
            "@/*": ["./*"],
          },
          baseUrl: ".",
        },
      },
    ],
  },
};
