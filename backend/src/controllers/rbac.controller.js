import {
  listManagedUsers,
  listPermissionCatalog,
  replaceUserPermissions,
} from "../services/rbac.service.js";

export async function getPermissions(req, res, next) {
  try {
    const permissions = await listPermissionCatalog();
    res.json({ permissions });
  } catch (err) {
    next(err);
  }
}

export async function getManagedUsers(req, res, next) {
  try {
    const users = await listManagedUsers({
      tenantId: req.user.tenantId,
      search: req.query.search,
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function updateManagedUserPermissions(req, res, next) {
  try {
    if (!Array.isArray(req.body?.permissions)) {
      return res.status(400).json({ error: "permissions must be an array of permission codes." });
    }
    const result = await replaceUserPermissions({
      tenantId: req.user.tenantId,
      targetUserId: req.params.userId,
      permissionCodes: req.body?.permissions,
      actorId: req.user.id,
      actorAccountType: req.user.accountType,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
