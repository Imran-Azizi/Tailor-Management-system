import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage();

export function runTenantContext(context, callback) {
  return storage.run(context, callback);
}

export function getTenantContext() {
  return storage.getStore() || null;
}

export function isSuperAdminContext() {
  return getTenantContext()?.isSuperAdmin === true;
}

