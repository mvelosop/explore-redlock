/** @type {import("ts-jest").InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    transform: {
      "^.+\\.(ts|tsx)?$": "ts-jest",
      "^.+\\.(js|jsx)$": "babel-jest",
    },
    collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
    forceCoverageMatch: ["<rootDir>/src/**/*.spec.ts"],
    coveragePathIgnorePatterns: [
      "<rootDir>/node_modules",
      "<rootDir>/src/migrations",
    ],
    coverageDirectory: ".tests-coverage"
  };
  