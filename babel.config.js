export default process.env.BUILD_MODULE === "commonjs"
  ? {
      plugins: [
        ["babel-plugin-add-import-extension", { extension: "cjs" }],
        "@babel/plugin-transform-modules-commonjs",
      ],
      presets: ["@babel/preset-typescript"],
    }
  : {
      plugins: [["babel-plugin-add-import-extension", { extension: "js" }]],
      presets: ["@babel/preset-typescript"],
    };
