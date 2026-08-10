window.ASEBUILDER_CONFIG = {
  OWNER: "Str1ct-android",
  REPO: "aseprite-builder",
  UPSTREAM: "aseprite/aseprite",
  SKIA: "aseprite/skia",
};

window.ASEBUILDER_LINKS = {
  actions: () => `https://github.com/${ASEBUILDER_CONFIG.OWNER}/${ASEBUILDER_CONFIG.REPO}/actions`,
  upstreamReleases: () => `https://github.com/${ASEBUILDER_CONFIG.UPSTREAM}/releases`,
  pages: () => `https://${ASEBUILDER_CONFIG.OWNER.toLowerCase()}.github.io/${ASEBUILDER_CONFIG.REPO}/`,
};
