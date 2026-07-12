import { assetUrl } from "./assets.js";
import {
  DEFAULT_PWA_BACKGROUND_COLOR,
  DEFAULT_PWA_THEME_COLOR,
  truncateForShortName,
} from "./pwa.js";

const MANIFEST_LINK_ID = "pwa-dynamic-manifest";
const APPLE_ICON_ID = "pwa-apple-touch-icon";

function resolveIconUrl(iconUrl) {
  const resolved = assetUrl(iconUrl) || iconUrl || "/system_icon.png";
  if (/^https?:\/\//i.test(resolved)) return resolved;
  return new URL(resolved, window.location.origin).href;
}

function buildIcons(iconUrl) {
  const src = resolveIconUrl(iconUrl);
  return [
    {
      src,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
}

export function buildPwaManifest({
  name,
  shortName,
  description,
  themeColor = DEFAULT_PWA_THEME_COLOR,
  backgroundColor = DEFAULT_PWA_BACKGROUND_COLOR,
  iconUrl = "/system_icon.png",
  startUrl = "/",
  scope = "/",
  lang = "en",
}) {
  const resolvedName = String(name || "Hoshmand Safi").trim();
  const resolvedShortName =
    String(shortName || truncateForShortName(resolvedName, 12) || "Hoshmand").trim();

  return {
    id: scope,
    name: resolvedName,
    short_name: resolvedShortName,
    description:
      description ||
      "Tailor management system for orders, customers, inventory, and finance.",
    start_url: startUrl,
    scope,
    display: "standalone",
    orientation: "any",
    background_color: backgroundColor,
    theme_color: themeColor,
    dir: "auto",
    lang,
    categories: ["business", "productivity"],
    icons: buildIcons(iconUrl),
  };
}

function upsertLink({ id, rel, href, type, sizes }) {
  let link = document.getElementById(id);
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    document.head.appendChild(link);
  }
  link.rel = rel;
  link.href = href;
  if (type) link.type = type;
  if (sizes) link.sizes = sizes;
  return link;
}

function upsertMeta(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function applyPwaBranding({
  name,
  shortName,
  description,
  themeColor = DEFAULT_PWA_THEME_COLOR,
  backgroundColor = DEFAULT_PWA_BACKGROUND_COLOR,
  iconUrl = "/system_icon.png",
  lang = "en",
}) {
  if (typeof document === "undefined") return;

  const manifest = buildPwaManifest({
    name,
    shortName,
    description,
    themeColor,
    backgroundColor,
    iconUrl,
    lang,
  });

  const blob = new Blob([JSON.stringify(manifest)], {
    type: "application/manifest+json",
  });
  const manifestUrl = URL.createObjectURL(blob);

  const existing = document.getElementById(MANIFEST_LINK_ID);
  if (existing?._objectUrl) {
    URL.revokeObjectURL(existing._objectUrl);
  }

  const manifestLink = upsertLink({
    id: MANIFEST_LINK_ID,
    rel: "manifest",
    href: manifestUrl,
    type: "application/manifest+json",
  });
  manifestLink._objectUrl = manifestUrl;

  const iconHref = resolveIconUrl(iconUrl);
  upsertLink({
    id: APPLE_ICON_ID,
    rel: "apple-touch-icon",
    href: iconHref,
    sizes: "180x180",
  });

  upsertMeta("theme-color", themeColor);
  upsertMeta("mobile-web-app-capable", "yes");
  upsertMeta("apple-mobile-web-app-capable", "yes");
  upsertMeta("apple-mobile-web-app-status-bar-style", "default");
  upsertMeta("apple-mobile-web-app-title", manifest.short_name);
  upsertMeta("application-name", manifest.short_name);

  document.documentElement.style.setProperty("--pwa-theme-color", themeColor);
}
