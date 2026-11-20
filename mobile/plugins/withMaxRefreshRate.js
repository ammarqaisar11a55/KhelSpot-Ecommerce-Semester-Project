// Run at the display's highest refresh rate (90 / 120 / 144 Hz) on every device.
//
// Android: many high-refresh phones keep apps at 60 Hz unless the window asks for a
// faster display mode. MainActivity picks the fastest mode at the current resolution
// and sets it as the window's preferred mode. The system can still lower it (battery
// saver, the user's own refresh setting), which is the right call for the phone.
//
// iOS: ProMotion iPhones cap apps at 60 Hz without CADisableMinimumFrameDurationOnPhone.
const { withInfoPlist, withMainActivity } = require("expo/config-plugins");

const MARKER = "// khelspot:max-refresh-rate";

const KOTLIN = `
    ${MARKER}
    run {
      val display = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
        this.display
      } else {
        @Suppress("DEPRECATION") windowManager.defaultDisplay
      }
      display?.let { d ->
        val current = d.mode
        val best = d.supportedModes
          .filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }
          .maxByOrNull { it.refreshRate }
        if (best != null) {
          val params = window.attributes
          params.preferredDisplayModeId = best.modeId
          window.attributes = params
        }
      }
    }
`;

function addToOnCreate(src) {
  if (src.includes(MARKER)) return src;
  const call = /super\.onCreate\([^)]*\)\s*\n/;
  if (!call.test(src)) {
    throw new Error("withMaxRefreshRate: couldn't find super.onCreate(...) in MainActivity.kt");
  }
  return src.replace(call, (m) => m + KOTLIN);
}

module.exports = function withMaxRefreshRate(config) {
  config = withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== "kt") {
      throw new Error("withMaxRefreshRate expects a Kotlin MainActivity");
    }
    cfg.modResults.contents = addToOnCreate(cfg.modResults.contents);
    return cfg;
  });
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.CADisableMinimumFrameDurationOnPhone = true;
    return cfg;
  });
  return config;
};
