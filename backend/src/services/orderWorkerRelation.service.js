const SUPPORTED_ROLE_TYPES = new Set(["DOKHT", "QICHIKAR"]);

const getRoleSpecificFields = (roleType) => {
  if (roleType === "QICHIKAR") {
    return {
      assignedField: "qichikarAssignedToId",
      receivedField: "qichikarReceivedById",
    };
  }

  if (roleType === "DOKHT") {
    return {
      assignedField: "dokhtAssignedToId",
      receivedField: "dokhtReceivedById",
    };
  }

  throw Object.assign(new Error("Invalid worker role."), { status: 400 });
};

export const buildOrderWorkedByUserWhere = ({ userId, roleType }) => {
  if (!userId) {
    throw Object.assign(new Error("Worker is required."), { status: 400 });
  }

  if (!SUPPORTED_ROLE_TYPES.has(roleType)) {
    throw Object.assign(new Error("Invalid worker role."), { status: 400 });
  }

  const { assignedField, receivedField } = getRoleSpecificFields(roleType);

  return {
    OR: [
      { [assignedField]: userId },
      { [receivedField]: userId },
      { assignedToId: userId },
      { receivedById: userId },
    ],
  };
};

export const didUserWorkOnOrder = ({ order, userId, roleType }) => {
  if (!order || !userId || !SUPPORTED_ROLE_TYPES.has(roleType)) {
    return false;
  }

  const { assignedField, receivedField } = getRoleSpecificFields(roleType);

  return [
    order?.[assignedField],
    order?.[receivedField],
    order?.assignedToId,
    order?.receivedById,
  ].includes(userId);
};
