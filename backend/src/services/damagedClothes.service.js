import { prisma } from "../lib/prisma.js";
import { parseNumberLocale, toAsciiDigits } from "../lib/normalize.js";
import { getOrderBenefitDetails } from "./order.service.js";
import { buildOrderWorkedByUserWhere } from "./orderWorkerRelation.service.js";

const WORKER_ROLES = ["DOKHT", "QICHIKAR"];
const ORDER_TYPES = ["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"];

const USER_SELECT = {
  id: true,
  name: true,
  phoneNumber: true,
  accountType: true,
};

const SEARCH_EMPTY_STATE_CODES = {
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  WORKER_NOT_ON_ORDER: "WORKER_NOT_ON_ORDER",
};

const getOrderWorkflowStatus = (order) => {
  const isDamageOrder = Array.isArray(order?.damagedClothesPenalties)
    ? order.damagedClothesPenalties.length > 0
    : false;
  if (isDamageOrder) return "DAMAGE_ORDER";
  if (order?.qichikarCompletedAt && order?.dokhtCompletedAt)
    return "READY_FOR_DELIVERY";
  if (order?.qichikarCompletedAt) return "QICHIKAR_COMPLETED";
  if (order?.dokhtCompletedAt) return "DOKHT_COMPLETED";
  if (order?.isCompleted) return "COMPLETED";
  if (order?.inProgress) return "IN_PROGRESS";
  return "PENDING";
};

const resolveWorkerAssignedAmountForOrder = ({ order, userId, roleType }) => {
  if (!order || !userId || !WORKER_ROLES.includes(roleType)) return 0;

  if (roleType === "QICHIKAR") {
    const isRoleLinked =
      order.qichikarAssignedToId === userId ||
      order.qichikarReceivedById === userId;
    if (isRoleLinked) return Number(order.qichikarPaymentAmount || 0);
  }

  if (roleType === "DOKHT") {
    const isRoleLinked =
      order.dokhtAssignedToId === userId || order.dokhtReceivedById === userId;
    if (isRoleLinked) return Number(order.dokhtPaymentAmount || 0);
  }

  const isLegacyLinked =
    order.assignedToId === userId || order.receivedById === userId;
  return isLegacyLinked ? Number(order.workerPaymentAmount || 0) : 0;
};

const applyWorkerAssignedDeduction = ({ totalExpense, assignedAmount }) => {
  const safeTotal = Number(totalExpense || 0);
  const safeAssigned = Math.max(0, Number(assignedAmount || 0));

  return {
    assignedAmount: safeAssigned,
    adjustedTotalExpense: Math.max(0, safeTotal - safeAssigned),
  };
};

const normalizeReason = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getExpenseBreakdown = (benefitDetails) => {
  const rows = Array.isArray(benefitDetails?.expenses)
    ? benefitDetails.expenses
    : [];

  const sumBy = (predicate) =>
    rows
      .filter(predicate)
      .reduce((sum, row) => sum + Number(row?.amount || 0), 0);

  return {
    totalOrderAmount: Number(benefitDetails?.totalOrderPrice || 0),
    rakhtExpense: sumBy((row) => row?.userRole === "RAKHT"),
    dokhtExpense: sumBy((row) => row?.userRole === "DOKHT"),
    qichikarExpense: sumBy((row) => row?.userRole === "QICHIKAR"),
    dailyTaskExpense: sumBy((row) => row?.source === "DailyTask"),
    totalExpense: Number(benefitDetails?.totalExpenses || 0),
    expenses: rows,
  };
};

const buildPenaltyTransactionNote = ({
  reason,
  billNumber,
  customerName,
  orderType,
  totalExpense,
}) =>
  [
    "Damaged Clothes Penalty",
    `Reason: ${reason}`,
    `Bill Number: ${billNumber}`,
    `Customer: ${customerName}`,
    `Order Type: ${orderType}`,
    `Penalty Amount: ${Number(totalExpense || 0).toFixed(2)}`,
  ].join(" | ");

const getRolePaymentStatusForOrder = (order, roleType) => {
  if (roleType === "DOKHT") return order?.dokhtPaymentStatus || null;
  if (roleType === "QICHIKAR") return order?.qichikarPaymentStatus || null;
  return order?.workerPaymentStatus || null;
};

const buildDuplicateMessage = (penalty) =>
  `This damaged order was already assigned to ${penalty?.user?.name || "this worker"} (${penalty?.roleType || "worker"}) and cannot be assigned to another worker.`;

const buildDamagedAssignmentNotification = ({
  billNumber,
  roleType,
  assignedAt,
  reason,
}) =>
  [
    "Damaged clothes assigned",
    `Bill Number: ${billNumber || "-"}`,
    `Role: ${roleType}`,
    `Date: ${assignedAt.toISOString().slice(0, 10)}`,
    `Note: ${reason || "Damaged clothes record assigned to you."}`,
  ].join(" | ");

const toAuditIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const buildOrderFinancialSnapshot = (order) => ({
  totalPrice: Number(order?.totalPrice || 0),
  discount: Number(order?.discount || 0),
  paidAmount: Number(order?.paidAmount || 0),
  remaining: Number(order?.remaining || 0),
  totalBenefit: Number(order?.totalBenefit || 0),
  isCompleted: Boolean(order?.isCompleted),
  completedAt: toAuditIso(order?.completedAt),
  netProfitRecognizedAt: toAuditIso(order?.netProfitRecognizedAt),
  netProfitRecognizedAmount:
    order?.netProfitRecognizedAmount == null
      ? null
      : Number(order.netProfitRecognizedAmount),
  netProfitRecognizedById: order?.netProfitRecognizedById || null,
});

export const getWorkersByRole = async (roleType) => {
  if (!WORKER_ROLES.includes(roleType)) {
    throw Object.assign(new Error("Invalid worker role."), { status: 400 });
  }

  return prisma.user.findMany({
    where: {
      accountType: roleType,
      isActive: true,
    },
    select: USER_SELECT,
    orderBy: { name: "asc" },
  });
};

export const searchOrdersForPenalty = async ({
  query,
  userId,
  roleType,
  page = 1,
  limit = 20,
}) => {
  if (!WORKER_ROLES.includes(roleType)) {
    throw Object.assign(new Error("Invalid worker role."), { status: 400 });
  }

  const worker = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!worker) {
    throw Object.assign(new Error("Worker not found."), { status: 404 });
  }

  if (worker.accountType !== roleType) {
    throw Object.assign(
      new Error("Selected worker does not match the selected role."),
      { status: 400 },
    );
  }

  const trimmedQuery = String(query || "").trim();
  const normalizedQueryDigits = toAsciiDigits(trimmedQuery);
  const queryUpper = trimmedQuery.toUpperCase();
  const orderTypeQuery = ORDER_TYPES.includes(queryUpper) ? queryUpper : null;
  const queryAsInt = Math.trunc(parseNumberLocale(normalizedQueryDigits));
  const isNumericQuery = /^\d+$/.test(normalizedQueryDigits);
  const skip = (page - 1) * limit;
  const workerWhere = buildOrderWorkedByUserWhere({ userId, roleType });

  const buildOrderRows = async (orders) =>
    Promise.all(
      orders.map(async (order) => {
        const benefitDetails = await getOrderBenefitDetails(order.id);
        const breakdown = getExpenseBreakdown(benefitDetails);
        const assignedAmount = resolveWorkerAssignedAmountForOrder({
          order,
          userId,
          roleType,
        });
        const { adjustedTotalExpense } = applyWorkerAssignedDeduction({
          totalExpense: breakdown.totalExpense,
          assignedAmount,
        });

        return {
          id: order.id,
          billNumber: order.billNumber ?? order.customer?.billNumber ?? null,
          customerName: order.customer?.firstName || "-",
          phoneNumber: order.customer?.phoneNumber || "-",
          orderType: order.type,
          orderName: order.orderName || null,
          isDamageOrder: Array.isArray(order.damagedClothesPenalties)
            ? order.damagedClothesPenalties.length > 0
            : false,
          damagedAssignedTo:
            order.damagedClothesPenalties?.[0]?.user || null,
          damagedAssignedRole:
            order.damagedClothesPenalties?.[0]?.roleType || null,
          orderStatus: getOrderWorkflowStatus(order),
          totalOrderAmount: breakdown.totalOrderAmount,
          rakhtExpense: breakdown.rakhtExpense,
          dokhtExpense: breakdown.dokhtExpense,
          qichikarExpense: breakdown.qichikarExpense,
          dailyTaskExpense: breakdown.dailyTaskExpense,
          totalExpense: adjustedTotalExpense,
          expenseRows: breakdown.expenses,
          createdAt: order.createdAt,
        };
      }),
    );

  if (isNumericQuery && Number.isFinite(queryAsInt)) {
    const exactBillWhere = {
      OR: [{ billNumber: queryAsInt }, { customer: { billNumber: queryAsInt } }],
      ...workerWhere,
    };
    const [exactOrders, exactTotal, billExists] = await Promise.all([
      prisma.order.findMany({
        where: exactBillWhere,
        skip,
        take: limit,
        include: {
          customer: {
            select: { billNumber: true, firstName: true, phoneNumber: true },
          },
          damagedClothesPenalties: {
            select: {
              id: true,
              roleType: true,
              user: { select: USER_SELECT },
            },
            take: 1,
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.order.count({ where: exactBillWhere }),
      prisma.order.count({
        where: {
          OR: [
            { billNumber: queryAsInt },
            { customer: { billNumber: queryAsInt } },
          ],
        },
      }),
    ]);

    return {
      data: exactTotal > 0 ? await buildOrderRows(exactOrders) : [],
      total: exactTotal,
      page,
      limit,
      emptyStateCode:
        exactTotal > 0
          ? null
          : billExists > 0
            ? SEARCH_EMPTY_STATE_CODES.WORKER_NOT_ON_ORDER
            : SEARCH_EMPTY_STATE_CODES.ORDER_NOT_FOUND,
    };
  }

  const where = {
    AND: [
      workerWhere,
      {
        OR: [
          {
            customer: {
              firstName: { contains: trimmedQuery, mode: "insensitive" },
            },
          },
          {
            customer: {
              phoneNumber: { contains: trimmedQuery, mode: "insensitive" },
            },
          },
          ...(orderTypeQuery ? [{ type: { equals: orderTypeQuery } }] : []),
        ],
      },
    ],
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: {
          select: { billNumber: true, firstName: true, phoneNumber: true },
        },
        damagedClothesPenalties: {
          select: {
            id: true,
            roleType: true,
            user: { select: USER_SELECT },
          },
          take: 1,
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.order.count({ where }),
  ]);

  const rows = await buildOrderRows(orders);

  return {
    data: rows,
    total,
    page,
    limit,
    emptyStateCode: null,
  };
};

export const getOrderExpenseDetails = async (orderId, workerContext = null) => {
  const include = {
    customer: {
      select: { billNumber: true, firstName: true, phoneNumber: true },
    },
    damagedClothesPenalties: { select: { id: true }, take: 1 },
  };

  const order = workerContext?.userId
    ? await prisma.order.findFirst({
        where: {
          id: orderId,
          ...buildOrderWorkedByUserWhere({
            userId: workerContext.userId,
            roleType: workerContext.roleType,
          }),
        },
        include,
      })
    : await prisma.order.findUnique({
        where: { id: orderId },
        include,
      });

  if (!order) {
    if (workerContext?.userId) {
      const anyOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      });

      if (anyOrder) {
        throw Object.assign(
          new Error("This user did not work on this order."),
          {
            status: 403,
            code: SEARCH_EMPTY_STATE_CODES.WORKER_NOT_ON_ORDER,
          },
        );
      }
    }

    throw Object.assign(new Error("Order not found."), {
      status: 404,
      code: SEARCH_EMPTY_STATE_CODES.ORDER_NOT_FOUND,
    });
  }

  const benefitDetails = await getOrderBenefitDetails(orderId);
  const breakdown = getExpenseBreakdown(benefitDetails);
  const assignedAmount = workerContext?.userId
    ? resolveWorkerAssignedAmountForOrder({
        order,
        userId: workerContext.userId,
        roleType: workerContext.roleType,
      })
    : 0;
  const { adjustedTotalExpense } = applyWorkerAssignedDeduction({
    totalExpense: breakdown.totalExpense,
    assignedAmount,
  });

  return {
    id: order.id,
    billNumber: order.billNumber ?? order.customer?.billNumber ?? null,
    customerName: order.customer?.firstName || "-",
    phoneNumber: order.customer?.phoneNumber || "-",
    orderType: order.type,
    orderName: order.orderName || null,
    isDamageOrder: Array.isArray(order.damagedClothesPenalties)
      ? order.damagedClothesPenalties.length > 0
      : false,
    damagedAssignedTo: order.damagedClothesPenalties?.[0]?.user || null,
    damagedAssignedRole: order.damagedClothesPenalties?.[0]?.roleType || null,
    orderStatus: getOrderWorkflowStatus(order),
    totalOrderAmount: breakdown.totalOrderAmount,
    rakhtExpense: breakdown.rakhtExpense,
    dokhtExpense: breakdown.dokhtExpense,
    qichikarExpense: breakdown.qichikarExpense,
    dailyTaskExpense: breakdown.dailyTaskExpense,
    totalExpense: adjustedTotalExpense,
    expenseRows: breakdown.expenses,
  };
};

export const createDamagedClothesPenalty = async (
  { userId, orderId, roleType, reason },
  adminUserId,
) => {
  if (!WORKER_ROLES.includes(roleType)) {
    throw Object.assign(new Error("Invalid worker role."), { status: 400 });
  }

  const [worker, orderExpense] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT }),
    getOrderExpenseDetails(orderId, { userId, roleType }),
  ]);

  if (!worker) {
    throw Object.assign(new Error("Worker not found."), { status: 404 });
  }

  if (worker.accountType !== roleType) {
    throw Object.assign(
      new Error("Selected worker does not match the selected role."),
      { status: 400 },
    );
  }

  if (!orderExpense.billNumber) {
    throw Object.assign(
      new Error("Selected order is missing bill number information."),
      { status: 400 },
    );
  }

  if (Number(orderExpense.totalExpense || 0) <= 0) {
    throw Object.assign(
      new Error("No expense found for the selected order to apply penalty."),
      { status: 400 },
    );
  }

  const existingPenalty = await prisma.damagedClothesPenalty.findFirst({
    where: { orderId },
    include: { user: { select: USER_SELECT } },
  });

  if (existingPenalty) {
    throw Object.assign(
      new Error(buildDuplicateMessage(existingPenalty)),
      {
        status: 409,
        code: "DUPLICATE_DAMAGED_CLOTHES_PENALTY",
        existingPenalty: {
          id: existingPenalty.id,
          workerName: existingPenalty.user?.name || null,
          roleType: existingPenalty.roleType,
        },
      },
    );
  }

  const now = new Date();
  const note = buildPenaltyTransactionNote({
    reason,
    billNumber: orderExpense.billNumber,
    customerName: orderExpense.customerName,
    orderType: orderExpense.orderType,
    totalExpense: orderExpense.totalExpense,
  });

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    const existingOrderPenalty = await tx.damagedClothesPenalty.findFirst({
      where: { orderId },
      include: { user: { select: USER_SELECT } },
    });

    if (existingOrderPenalty) {
      throw Object.assign(new Error(buildDuplicateMessage(existingOrderPenalty)), {
        status: 409,
        code: "DUPLICATE_DAMAGED_CLOTHES_PENALTY",
        existingPenalty: {
          id: existingOrderPenalty.id,
          workerName: existingOrderPenalty.user?.name || null,
          roleType: existingOrderPenalty.roleType,
        },
      });
    }

    const paymentStatusOrder = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        tenantId: true,
        billNumber: true,
        totalPrice: true,
        discount: true,
        paidAmount: true,
        remaining: true,
        totalBenefit: true,
        isCompleted: true,
        completedAt: true,
        netProfitRecognizedAt: true,
        netProfitRecognizedAmount: true,
        netProfitRecognizedById: true,
        dokhtPaymentStatus: true,
        qichikarPaymentStatus: true,
        workerPaymentStatus: true,
      },
    });
    if (!paymentStatusOrder) {
      throw Object.assign(new Error("Order not found."), { status: 404 });
    }
    const financialSnapshotBefore =
      buildOrderFinancialSnapshot(paymentStatusOrder);
    const workerPaymentStatus = getRolePaymentStatusForOrder(
      paymentStatusOrder,
      roleType,
    );

    const transaction = await tx.transaction.create({
      data: {
        accountType: roleType,
        userId,
        orderId,
        kind: "LOAN",
        source: "DAMAGE_PENALTY",
        amount: Number(orderExpense.totalExpense),
        transactionDate: now,
        note,
        createdById: adminUserId,
      },
      include: {
        user: { select: USER_SELECT },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const penalty = await tx.damagedClothesPenalty.create({
      data: {
        transactionId: transaction.id,
        userId,
        orderId,
        roleType,
        reason,
        confirmedDuplicate: false,
        workerPaymentStatus,
        billNumber: Number(orderExpense.billNumber),
        customerName: orderExpense.customerName,
        orderType: orderExpense.orderType,
        totalOrderAmount: Number(orderExpense.totalOrderAmount || 0),
        rakhtExpense: Number(orderExpense.rakhtExpense || 0),
        dokhtExpense: Number(orderExpense.dokhtExpense || 0),
        qichikarExpense: Number(orderExpense.qichikarExpense || 0),
        dailyTaskExpense: Number(orderExpense.dailyTaskExpense || 0),
        totalExpense: Number(orderExpense.totalExpense || 0),
        createdById: adminUserId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        user: { select: USER_SELECT },
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        totalBenefit: 0,
        netProfitRecognizedAt: null,
        netProfitRecognizedAmount: null,
        netProfitRecognizedById: null,
        isEmergency: false,
        emergencyExpiry: null,
        inProgress: false,
        qichikarInProgress: false,
        dokhtInProgress: false,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: paymentStatusOrder.tenantId || null,
        actorId: adminUserId || null,
        action: "DAMAGED_ORDER_FINANCIAL_RESET",
        entity: "Order",
        entityId: orderId,
        metadata: {
          billNumber:
            orderExpense.billNumber ?? paymentStatusOrder.billNumber ?? null,
          roleType,
          assignedUserId: userId,
          penaltyId: penalty.id,
          transactionId: transaction.id,
          financialSnapshotBefore,
          financialSnapshotAfter: {
            ...financialSnapshotBefore,
            totalBenefit: 0,
            netProfitRecognizedAt: null,
            netProfitRecognizedAmount: null,
            netProfitRecognizedById: null,
          },
          excludedFromNormalFinancialSummaries: true,
          preservedInDamagedClothesRecords: true,
        },
      },
    });

    await tx.userNotification.create({
      data: {
        userId,
        orderId,
        type: "DAMAGED_CLOTHES_ASSIGNED",
        message: buildDamagedAssignmentNotification({
          billNumber: orderExpense.billNumber,
          roleType,
          assignedAt: now,
          reason,
        }),
      },
    });

    return {
      transaction,
      penalty,
      orderExpense,
    };
    });
  } catch (error) {
    const uniqueTarget = Array.isArray(error?.meta?.target)
      ? error.meta.target
      : [];
    if (error?.code === "P2002" && uniqueTarget.includes("orderId")) {
      const existingOrderPenalty = await prisma.damagedClothesPenalty.findFirst({
        where: { orderId },
        include: { user: { select: USER_SELECT } },
      });
      throw Object.assign(
        new Error(buildDuplicateMessage(existingOrderPenalty)),
        {
          status: 409,
          code: "DUPLICATE_DAMAGED_CLOTHES_PENALTY",
          existingPenalty: existingOrderPenalty
            ? {
                id: existingOrderPenalty.id,
                workerName: existingOrderPenalty.user?.name || null,
                roleType: existingOrderPenalty.roleType,
              }
            : null,
        },
      );
    }
    throw error;
  }

  return result;
};

export const getDamagedClothesPenalties = async ({
  page = 1,
  limit = 20,
  search = "",
  roleType,
} = {}) => {
  const skip = (page - 1) * limit;
  const trimmedSearch = String(search || "").trim();
  const numericSearch = Number(toAsciiDigits(trimmedSearch));
  const isNumericSearch =
    trimmedSearch.length > 0 && Number.isFinite(numericSearch);

  const where = {
    ...(roleType ? { roleType } : {}),
    ...(trimmedSearch
      ? {
          OR: [
            ...(isNumericSearch
              ? [{ billNumber: Math.trunc(numericSearch) }]
              : []),
            { customerName: { contains: trimmedSearch, mode: "insensitive" } },
            { reason: { contains: trimmedSearch, mode: "insensitive" } },
            { user: { name: { contains: trimmedSearch, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.damagedClothesPenalty.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: USER_SELECT },
        createdBy: { select: { id: true, name: true } },
        transaction: { select: { amount: true, kind: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.damagedClothesPenalty.count({ where }),
  ]);

  return {
    data: rows.map((penalty) => ({
      id: penalty.id,
      orderId: penalty.orderId,
      billNumber: penalty.billNumber,
      workerType: penalty.roleType,
      workerName: penalty.user?.name || "-",
      reason: penalty.reason,
      damageAmount: Number(penalty.totalExpense || 0),
      penaltyAmount: Number(penalty.transaction?.amount ?? penalty.totalExpense ?? 0),
      paymentStatus: penalty.workerPaymentStatus || "UNKNOWN",
      customerName: penalty.customerName,
      orderType: penalty.orderType,
      createdAt: penalty.createdAt,
      createdBy: penalty.createdBy,
    })),
    total,
    page,
    limit,
  };
};

export const getMyDamagedClothesPenalties = async (
  userId,
  { page = 1, limit = 20 } = {},
) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.damagedClothesPenalty.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true } },
        order: {
          select: {
            totalPrice: true,
            discount: true,
            paidAmount: true,
            remaining: true,
            isCompleted: true,
            inProgress: true,
            customer: { select: { phoneNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.damagedClothesPenalty.count({ where: { userId } }),
  ]);

  const data = rows.map((penalty) => {
    const order = penalty.order;
    const orderStatus = "DAMAGE_ORDER";
    const grossOrderPrice = Number(order?.totalPrice || 0);
    const discount = Number(order?.discount || 0);
    const finalPayable = Math.max(0, grossOrderPrice - discount);
    const extraExpense = Math.max(
      0,
      Number(penalty.totalExpense || 0) -
        Number(penalty.rakhtExpense || 0) -
        Number(penalty.dokhtExpense || 0) -
        Number(penalty.qichikarExpense || 0) -
        Number(penalty.dailyTaskExpense || 0),
    );

    return {
      id: penalty.id,
      billNumber: penalty.billNumber,
      customerName: penalty.customerName,
      phoneNumber: order?.customer?.phoneNumber || null,
      orderType: penalty.orderType,
      orderStatus,
      createdAt: penalty.createdAt,
      createdBy: penalty.createdBy,
      // billing (customer-facing)
      grossOrderPrice,
      totalOrderPrice: finalPayable,
      discount,
      paidAmount: Number(order?.paidAmount || 0),
      remaining: Number(order?.remaining || 0),
      finalPayable,
      // expense breakdown (worker costs)
      totalOrderAmount: Number(penalty.totalOrderAmount || 0),
      rakhtExpense: Number(penalty.rakhtExpense || 0),
      dokhtExpense: Number(penalty.dokhtExpense || 0),
      qichikarExpense: Number(penalty.qichikarExpense || 0),
      dailyTaskExpense: Number(penalty.dailyTaskExpense || 0),
      extraExpense,
      totalExpense: Number(penalty.totalExpense || 0),
    };
  });

  return { data, total, page, limit };
};
