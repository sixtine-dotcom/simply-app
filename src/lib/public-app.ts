export const publicAppConfig = {
  name: "Simply App",
  legalName: "Simply in Balance",
  domain: "simplyapp.be",
  url: "https://simplyapp.be",
  supportEmail: "sixtine@simplyinbalance.com",
  locale: "nl-BE",
  appId: {
    android: "be.simplyapp.app",
    ios: "be.simplyapp.app",
  },
};

export function getPublicUrl(path = "") {
  const baseUrl = process.env.APP_URL || publicAppConfig.url;
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
