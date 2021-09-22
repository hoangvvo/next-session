const commonjs = process.env.BUILD_MODULE === "commonjs";

export default {
  plugins: [
    [
      "babel-plugin-add-import-extension",
      { extension: commonjs ? "cjs" : "js" },
    ],
  ],
  presets: [
    "@babel/preset-typescript",
    [
      "@babel/preset-env",
      {
        targets: {
          node: "12",
        },
        modules: commonjs ? "commonjs" : false,
      },
    ],
  ],
};
