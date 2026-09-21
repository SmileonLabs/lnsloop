# Native dependency compatibility

`expo-modules-jsi@57.1.0.patch` removes `SWIFT_RETURNS_RETAINED` from
two C++ constructors. Constructors are not functions returning an owned
reference; Swift 6.2 rejects these annotations. The class's shared-reference
retain/release hooks are unchanged. pnpm applies the exact-version patch on
installation, including CI.

The patch also wraps call-scoped JSI pointers in Expo's existing
`NonisolatedUnsafeVar` inside synchronous host callbacks. Swift 6.2 otherwise
rejects the existing `nonisolated(unsafe)` captures across nested isolation
closures. These callbacks do not escape or hop threads; no asynchronous pointer
sharing or global relaxation of concurrency checking is introduced.

Upstream issue: https://github.com/expo/expo/issues/50067

Reassess and remove the patch when upgrading to an upstream fixed version.
