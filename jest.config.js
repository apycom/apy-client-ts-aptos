module.exports = {
  verbose: true, 
  "roots": [
    "<rootDir>/src"
  ],
  "testMatch": [
    "**/tests/**/*.test.(ts|js)",
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  setupFiles: ["<rootDir>/setup-tests.ts"],
};
