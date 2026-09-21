const { withInfoPlist, withEntitlementsPlist } = require("expo/config-plugins");
module.exports = (config) =>
  withEntitlementsPlist(
    withInfoPlist(config, (config) => {
      config.modResults.NSHealthShareUsageDescription =
        "Share the health records you choose with a study you have joined, and track your contribution points.";
      return config;
    }),
    (config) => {
      config.modResults["com.apple.developer.healthkit"] = true;
      config.modResults["com.apple.developer.healthkit.background-delivery"] =
        true;
      return config;
    },
  );
