export function assetUrl(value) {
  if (!value) return "";
  const url = String(value);
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  if (!url.startsWith("/")) return url;

  const apiBase = import.meta.env.VITE_API_URL || "";
  if (!apiBase || !/^https?:\/\//i.test(apiBase)) return url;

  return `${apiBase.replace(/\/api\/?$/i, "").replace(/\/$/, "")}${url}`;
}
