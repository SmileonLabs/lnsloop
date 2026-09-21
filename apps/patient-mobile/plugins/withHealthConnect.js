const {
  withAndroidManifest,
  withGradleProperties,
  withAppBuildGradle,
} = require("expo/config-plugins");
module.exports = (config) =>
  withAppBuildGradle(
    withGradleProperties(
      withAndroidManifest(config, (config) => {
        const m = config.modResults.manifest;
        const permissions = [
          "STEPS",
          "DISTANCE",
          "ACTIVE_CALORIES_BURNED",
          "TOTAL_CALORIES_BURNED",
          "EXERCISE",
          "SLEEP",
          "HEART_RATE",
          "RESTING_HEART_RATE",
          "HEART_RATE_VARIABILITY",
          "HEIGHT",
          "WEIGHT",
          "BODY_FAT",
          "BLOOD_PRESSURE",
          "BLOOD_GLUCOSE",
          "OXYGEN_SATURATION",
          "RESPIRATORY_RATE",
          "BODY_TEMPERATURE",
          "NUTRITION",
          "HYDRATION",
          "HEALTH_DATA_IN_BACKGROUND",
          "HEALTH_DATA_HISTORY",
        ];
        m["uses-permission"] ??= [];
        for (const p of permissions) {
          const name = "android.permission.health.READ_" + p;
          if (!m["uses-permission"].some((x) => x.$["android:name"] === name))
            m["uses-permission"].push({ $: { "android:name": name } });
        }
        const application = m.application[0],
          main = application.activity.find(
            (x) => x.$["android:name"] === ".MainActivity",
          );
        main["intent-filter"] ??= [];
        main["intent-filter"].push({
          action: [
            {
              $: {
                "android:name":
                  "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
              },
            },
          ],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
        });
        application["activity-alias"] ??= [];
        application["activity-alias"].push({
          $: {
            "android:name": "ViewHealthPermissionUsageActivity",
            "android:exported": "true",
            "android:targetActivity": ".MainActivity",
            "android:permission":
              "android.permission.START_VIEW_PERMISSION_USAGE",
          },
          "intent-filter": [
            {
              action: [
                {
                  $: {
                    "android:name":
                      "android.intent.action.VIEW_PERMISSION_USAGE",
                  },
                },
              ],
              category: [
                {
                  $: {
                    "android:name":
                      "android.intent.category.HEALTH_PERMISSIONS",
                  },
                },
              ],
            },
          ],
        });
        return config;
      }),
      (config) => {
        config.modResults = config.modResults.filter(
          (p) => p.key !== "android.minSdkVersion",
        );
        config.modResults.push({
          type: "property",
          key: "android.minSdkVersion",
          value: "28",
        });
        return config;
      },
    ),
    (config) => {
      if (!config.modResults.contents.includes("// loop short CMake paths"))
        config.modResults.contents +=
          '\n// loop short CMake paths\nandroid {\n externalNativeBuild { cmake { buildStagingDirectory = file("${rootProject.projectDir}/../../../.native-build") } }\n defaultConfig { externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" } } }\n}\n';
      return config;
    },
  );
