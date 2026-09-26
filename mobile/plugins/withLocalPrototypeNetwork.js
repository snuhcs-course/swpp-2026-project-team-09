const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// Standalone development APKs can reach USB-forwarded localhost services.
// HTTPS remains the default for every external host. No LAN wildcard is allowed.
const resource = "prototype_network_security_config";
const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

module.exports = function withLocalPrototypeNetwork(config) {
  const enabled = process.env.PROTOTYPE_LOCAL_HTTP === "true";
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    if (enabled) application.$["android:networkSecurityConfig"] = `@xml/${resource}`;
    else if (application.$["android:networkSecurityConfig"] === `@xml/${resource}`)
      delete application.$["android:networkSecurityConfig"];
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const dir = path.join(mod.modRequest.platformProjectRoot, "app/src/main/res/xml");
    const file = path.join(dir, `${resource}.xml`);
    if (enabled) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file, xml);
    } else {
      await fs.rm(file, { force: true });
    }
    return mod;
  }]);
};
