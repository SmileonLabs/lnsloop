# Native dependency compatibility

`expo-modules-jsi@57.1.0.patch` removes `SWIFT_RETURNS_RETAINED` from
two C++ constructors. Constructors are not functions returning an owned
reference; Swift 6.2 rejects these annotations. The class's shared-reference
retain/release hooks are unchanged. pnpm applies the exact-version patch on
installation, including CI.

Upstream issue: https://github.com/expo/expo/issues/50067

Reassess and remove the patch when upgrading to an upstream fixed version.
