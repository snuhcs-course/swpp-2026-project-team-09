/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// eas-cli loads this file through Node's own ESM loader, which needs the `.js`: `expo` has no exports map.
import { type ConfigPlugin, withEntitlementsPlist } from 'expo/config-plugins.js';

// The iOS build is signed by a free Apple ID's team, which cannot sign the push entitlement that `expo-notifications`
// adds. It is listed before `expo-notifications` in `app.json`: a mod registered later runs first, so this one runs
// after the notifications plugin and removes what it added.
const withIosWithoutPush: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (withPlist) => {
    delete withPlist.modResults['aps-environment'];
    return withPlist;
  });

export default withIosWithoutPush;
