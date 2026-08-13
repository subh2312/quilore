module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Intentional (not a Flow codebase): Metro rejects WatermelonDB fields written as
      // `@text(...) payload!: string` ("Definitely assigned fields cannot be initialized here").
      // Models use TypeScript `declare` fields instead; `allowDeclareFields` is only exposed by
      // `@babel/plugin-transform-flow-strip-types`, so we enable it before legacy decorators.
      ["@babel/plugin-transform-flow-strip-types", { allowDeclareFields: true }],
      ["@babel/plugin-proposal-decorators", { legacy: true }],
    ],
  };
};
