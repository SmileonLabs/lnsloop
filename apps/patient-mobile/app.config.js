const base = require("./app.json").expo;
module.exports = () => ({
  ...base,
  plugins: base.plugins
    .filter((p) => p !== "@react-native-google-signin/google-signin")
    .concat([
      "./plugins/withHealthKit",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
            ? "com.googleusercontent.apps." +
              process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.replace(
                ".apps.googleusercontent.com",
                "",
              )
            : "com.googleusercontent.apps.configuration-pending",
        },
      ],
    ]),
});
