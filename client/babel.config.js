module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // WatermelonDB + TypeScript `declare` fields (must run before class transforms).
      ["@babel/plugin-transform-flow-strip-types", { allowDeclareFields: true }],
      ["@babel/plugin-proposal-decorators", { legacy: true }],
    ],
  };
};
