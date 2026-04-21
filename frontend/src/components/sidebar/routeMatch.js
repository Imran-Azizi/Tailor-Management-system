export function normalizePath(path) {
  if (!path) return "/";
  const cleanPath = path.split("?")[0].split("#")[0] || "/";
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    return cleanPath.slice(0, -1);
  }
  return cleanPath;
}

export function isRouteActive(currentPath, itemPath, end = false) {
  const current = normalizePath(currentPath);
  const target = normalizePath(itemPath);

  if (end) {
    return current === target;
  }

  return current === target || current.startsWith(`${target}/`);
}
