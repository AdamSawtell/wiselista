module.exports = {
  preset: "ts-jest",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testEnvironment: "node",
  transformIgnorePatterns: ["node_modules/(?!(@supabase)/)"],
};
