# Build and integration

Status: ready-for-agent
State: implementation reviewed; validation recorded below
Owner: root

Review agents, squash integration, configure existing OAuth client safely, build APK and test available flows. Report missing provider/device evidence.

## Verification

API E2E passed in isolated databases and test Redis14/15, then resources cleaned. Main image rebuilt and public/admin runtime updated. Google Web+Android IDs copied into ignored mobile config without printing values. Loopback-only network exception verified to disappear when flagdisabled and return when enabled. Native APK starts login screen; native Google sign-in returned INTERNAL_ERROR, diagnosis remains open. Web/Android client-ID project prefixes match; final APK SHA-1 matches the value supplied for console registration; emulator account count0. System Google add-account flow opens, but authenticated result has not been obtained. Requested physical-device or user account test. No production/authenticated device claim.
