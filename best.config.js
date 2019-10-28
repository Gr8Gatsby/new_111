module.exports = {
  projectName: "my-app-benchmarks",
  plugins: [
    [
      "@lwc/rollup-plugin",
      {
        rootDir: "<rootDir>/src/modules",
        exclude: ["/engine.js$/", "/@best/runtime/"]
      }
    ],
    [
      "rollup-plugin-replace",
      { "process.env.NODE_ENV": JSON.stringify("production") }
    ]
  ]
};
