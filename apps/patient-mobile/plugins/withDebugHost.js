const { withMainApplication } = require("expo/config-plugins");

// Expo's host factory defaults to React Native's library BuildConfig.DEBUG.
// Use the application's build type so debug APKs connect to Metro and release
// APKs only load their embedded bundle.
module.exports = (config) =>
  withMainApplication(config, (config) => {
    const source = config.modResults.contents;
    if (!source.includes("useDevSupport = BuildConfig.DEBUG")) {
      const anchor = "context = applicationContext,";
      if (!source.includes(anchor)) {
        throw new Error("Cannot configure Expo Android host: template changed");
      }
      config.modResults.contents = source.replace(
        anchor,
        anchor + "\n      useDevSupport = BuildConfig.DEBUG,",
      );
    }
    return config;
  });
