import * as service from "../services/order.service.js";
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderBillSchema,
} from "../validators/order.validator.js";
import { prisma } from "../lib/prisma.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { sendCustomerCompletionSMS } from "../services/sms.service.js";
import { buildMonthlyReportPdf } from "../lib/monthlyReportPdf.js";
import { getDashboardStats } from "../services/analytics.service.js";
import {
  getReportLocaleTag,
  normalizeReportLanguage,
} from "../lib/reportLocale.js";

const WORKER_ACCOUNT_TYPES = ["QICHIKAR", "DOKHT"];
const SAME_ROLE_CLAIM_CONFLICT_MESSAGE =
  "this order already receive by someone else try another";
const QICHIKAR_NOT_COMPLETED_MESSAGE =
  "This order cannot be received yet. Waiting for the Qichikar (cutting) worker to complete their work first.";
const COMPLETED_REASSIGN_BLOCK_MESSAGE =
  "This order completed, you can not assign it again";
const WORKER_PAYMENT_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const getRoleFieldKeys = (accountType) => {
  if (accountType === "QICHIKAR") {
    return {
      assignedToId: "qichikarAssignedToId",
      assignedAt: "qichikarAssignedAt",
      receivedById: "qichikarReceivedById",
      receivedAt: "qichikarReceivedAt",
      inProgress: "qichikarInProgress",
    };
  }
  if (accountType === "DOKHT") {
    return {
      assignedToId: "dokhtAssignedToId",
      assignedAt: "dokhtAssignedAt",
      receivedById: "dokhtReceivedById",
      receivedAt: "dokhtReceivedAt",
      inProgress: "dokhtInProgress",
    };
  }
  return null;
};

const getRoleOrderValues = (order, accountType) => {
  const keys = getRoleFieldKeys(accountType);
  if (!keys || !order) {
    return {
      assignedToId: order?.assignedToId ?? null,
      receivedById: order?.receivedById ?? null,
      receivedAt: order?.receivedAt ?? null,
      inProgress: Boolean(order?.inProgress),
    };
  }

  const assignedFallback =
    order?.assignedTo?.accountType === accountType ? order?.assignedToId : null;
  const receivedFallback =
    order?.receivedBy?.accountType === accountType ? order?.receivedById : null;

  return {
    assignedToId: order[keys.assignedToId] ?? assignedFallback,
    receivedById: order[keys.receivedById] ?? receivedFallback,
    receivedAt: order[keys.receivedAt] ?? order?.receivedAt ?? null,
    inProgress: Boolean(order[keys.inProgress]),
  };
};

function canWorkerSeeLookupOrder(order, user) {
  if (order.isCompleted) return false;

  // Dokht can only see orders after Qichikar has completed their part.
  if (user?.accountType === "DOKHT" && !order.qichikarCompletedAt) {
    return false;
  }

  const roleValues = getRoleOrderValues(order, user?.accountType);

  // Hard same-role lock: once assigned to a worker in this role, only that worker can see it.
  if (roleValues.assignedToId && roleValues.assignedToId !== user?.id) {
    return false;
  }

  // Same-role lock: if another worker of the same account type received it,
  // hide it from the current user.
  if (roleValues.receivedById && roleValues.receivedById !== user?.id) {
    return false;
  }

  // Shared policy for workers:
  // - own assignments visible
  // - unassigned visible
  // - same-role assignments by another user hidden
  if (WORKER_ACCOUNT_TYPES.includes(user?.accountType)) {
    if (roleValues.assignedToId === user.id) return true;
    if (!roleValues.assignedToId) return true;
    return false;
  }

  return !order.assignedToId || order.assignedToId === user.id;
}

function isSameRoleBlockedOrder(order, user) {
  if (order?.isCompleted) return false;
  const roleValues = getRoleOrderValues(order, user?.accountType);

  const blockedByReceived =
    roleValues.receivedById && roleValues.receivedById !== user?.id;

  const blockedByAssignment =
    roleValues.assignedToId && roleValues.assignedToId !== user?.id;

  return blockedByReceived || blockedByAssignment;
}

export const getAll = async (req, res, next) => {
  try {
    // QICHIKAR / DOKHT only see their assigned orders
    const user = req.user;
    const query = { ...req.query };
    if (
      user &&
      (user.accountType === "QICHIKAR" || user.accountType === "DOKHT")
    ) {
      const wantsWorkerClaimView =
        String(query.workerClaimView || "").toLowerCase() === "true";

      if (wantsWorkerClaimView) {
        query.workerClaimView = true;
        query.workerId = user.id;
        query.workerAccountType = user.accountType;
        query.workerRoleType = user.accountType;
      } else {
        // Default worker list should only include orders the worker has claimed.
        query.roleReceivedById = user.id;
        query.roleType = user.accountType;
      }
    }
    // Finance users only see the orders they created
    if (user && user.accountType === "FINANCE") {
      query.financeUserId = user.id;
    }
    res.json(await service.getAllOrders(query));
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const data = await service.getOrderById(req.params.id);
    if (!data) return res.status(404).json({ error: "Order not found" });
    // Finance users may only access orders they created
    if (req.user?.accountType === "FINANCE") {
      if (data.createdByFinanceId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You do not have permission to access this order." });
      }
    }
    const benefitDetails = await service.getOrderBenefitDetails(req.params.id);
    res.json({
      ...data,
      benefitDetails,
    });
  } catch (error) {
    next(error);
  }
};

export const getBill = async (req, res, next) => {
  try {
    const result = await service.getOrderBillByOrderId(req.params.id);
    if (!result) return res.status(404).json({ error: "Order not found" });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const lookup = async (req, res, next) => {
  try {
    const { billNumber, phoneNumber } = req.query;
    const user = req.user;
    const isWorker = WORKER_ACCOUNT_TYPES.includes(user?.accountType);

    const result = await service.lookupOrdersByBillOrPhone({
      billNumber,
      phoneNumber,
    });
    if (!result)
      return res.status(404).json({ error: "No matching record found" });

    if (!isWorker) {
      res.json(result);
      return;
    }

    const visibleOrders = (result.orders || []).filter((order) =>
      canWorkerSeeLookupOrder(order, user),
    );

    if (!visibleOrders.length) {
      const sameRoleBlocked = (result.orders || []).some((order) =>
        isSameRoleBlockedOrder(order, user),
      );
      if (sameRoleBlocked) {
        return res
          .status(409)
          .json({ error: SAME_ROLE_CLAIM_CONFLICT_MESSAGE });
      }

      // Dokht-specific: Qichikar hasn't finished yet.
      if (user?.accountType === "DOKHT") {
        const qichikarPending = (result.orders || []).some(
          (order) => !order.isCompleted && !order.qichikarCompletedAt,
        );
        if (qichikarPending) {
          return res
            .status(409)
            .json({ error: QICHIKAR_NOT_COMPLETED_MESSAGE });
        }
      }

      return res.status(404).json({
        error: "No eligible order found for this bill number.",
      });
    }

    res.json({
      customer: result.customer,
      orders: visibleOrders,
    });
  } catch (error) {
    next(error);
  }
};

export const getCompletedFromWorkers = async (req, res, next) => {
  try {
    const result = await service.getCompletedOrdersFromWorkers(req.query || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const createdByFinanceId =
      req.user?.accountType === "FINANCE" ? req.user.id : null;
    res
      .status(201)
      .json(await service.createOrder({ ...body, createdByFinanceId }));
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const body = updateOrderSchema.parse(req.body);
    res.json(await service.updateOrder(req.params.id, body));
  } catch (error) {
    next(error);
  }
};

export const updateBill = async (req, res, next) => {
  try {
    const body = updateOrderBillSchema.parse(req.body);
    res.json(await service.updateOrderBill(req.params.id, body));
  } catch (error) {
    next(error);
  }
};

export const markComplete = async (req, res, next) => {
  try {
    const user = req.user;
    const isDeliveryReceiveAction = req.body?.deliveryReceive === true;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: {
          select: { firstName: true, billNumber: true, phoneNumber: true },
        },
        receivedBy: { select: { id: true, name: true, accountType: true } },
        assignedTo: { select: { id: true, name: true, accountType: true } },
        assignedBy: { select: { id: true, name: true } },
        box: { select: { id: true, boxName: true } },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found." });

    const isWorker = WORKER_ACCOUNT_TYPES.includes(user.accountType);
    const isQichikar = user.accountType === "QICHIKAR";
    const roleValues = getRoleOrderValues(order, user.accountType);

    if (!isWorker && user.accountType !== "ADMIN") {
      return res.status(403).json({
        error: "Only admin can mark delivery completion for customer handover.",
      });
    }

    if (!isWorker && !isDeliveryReceiveAction) {
      return res.status(400).json({
        error:
          "Order completion is only allowed from Clothes Delivery Receive action.",
      });
    }

    if (isWorker && roleValues.assignedToId !== user.id) {
      return res
        .status(403)
        .json({ error: "You can only complete orders assigned to you." });
    }
    if (
      isWorker &&
      roleValues.receivedById &&
      roleValues.receivedById !== user.id
    ) {
      return res.status(409).json({
        error: SAME_ROLE_CLAIM_CONFLICT_MESSAGE,
      });
    }
    if (!isWorker && Number(order.remaining || 0) > 0) {
      return res.status(400).json({
        error:
          "This order cannot be marked as completed until full payment is confirmed by admin.",
      });
    }

    let result;
    let smsSent = false;
    const admins = await prisma.user.findMany({
      where: { accountType: "ADMIN" },
      select: { id: true },
    });

    if (isWorker) {
      if (order.isCompleted) {
        return res.status(400).json({ error: "Order already completed." });
      }

      if (isQichikar) {
        if (order.qichikarCompletedAt) {
          return res.status(400).json({
            error: "Qichikar work for this order is already completed.",
          });
        }

        const qichikarPaymentAmount = Number(order.qichikarPaymentAmount ?? 0);
        const shouldPayQichikar =
          Number.isFinite(qichikarPaymentAmount) && qichikarPaymentAmount > 0;
        const qichikarPaidAt = shouldPayQichikar ? new Date() : null;

        result = await prisma.order.update({
          where: { id: req.params.id },
          data: {
            qichikarCompletedAt: new Date(),
            qichikarInProgress: false,
            qichikarReceivedById: null,
            qichikarReceivedAt: null,
            qichikarPaymentStatus: shouldPayQichikar
              ? "PAID_TO_WORKER"
              : "UNPAID",
            qichikarPaymentAmount: shouldPayQichikar
              ? qichikarPaymentAmount
              : null,
            qichikarPaidAt,
            qichikarPaidById: null,
            // Keep legacy payment fields aligned for fallback screens.
            workerPaymentStatus: shouldPayQichikar
              ? "PAID_TO_WORKER"
              : "UNPAID",
            workerPaymentAmount: shouldPayQichikar
              ? qichikarPaymentAmount
              : null,
            workerPaidAt: qichikarPaidAt,
            workerPaidById: null,
            inProgress: false,
            receivedById: null,
            receivedAt: null,
          },
          include: {
            customer: true,
            box: true,
            assignedTo: { select: { id: true, name: true, accountType: true } },
            assignedBy: { select: { id: true, name: true } },
            receivedBy: { select: { id: true, name: true, accountType: true } },
          },
        });

        await service.recalculateOrderBenefit(req.params.id);

        const msg = `Qichikar Name: ${user.name} | Bill Number: ${order.customer.billNumber} | Order Type: ${order.type} | Customer Name: ${order.customer.firstName} | Cutting completed successfully and ready for Dokht.`;
        await Promise.all(
          admins.map((admin) =>
            prisma.userNotification.create({
              data: {
                userId: admin.id,
                orderId: req.params.id,
                message: msg,
                type: "WORK_COMPLETED",
              },
            }),
          ),
        );

        return res.json({ ...result, smsSent: false });
      }

      if (order.dokhtCompletedAt) {
        return res.status(400).json({
          error: "Dokht work for this order is already completed.",
        });
      }

      const dokhtPaymentAmount = Number(order.dokhtPaymentAmount ?? 0);
      const shouldPayDokht =
        Number.isFinite(dokhtPaymentAmount) && dokhtPaymentAmount > 0;
      const dokhtPaidAt = shouldPayDokht ? new Date() : null;

      result = await prisma.order.update({
        where: { id: req.params.id },
        data: {
          dokhtCompletedAt: new Date(),
          dokhtInProgress: false,
          dokhtReceivedById: null,
          dokhtReceivedAt: null,
          dokhtPaymentStatus: shouldPayDokht ? "PAID_TO_WORKER" : "UNPAID",
          dokhtPaymentAmount: shouldPayDokht ? dokhtPaymentAmount : null,
          dokhtPaidAt,
          dokhtPaidById: null,
          // Keep legacy payment fields aligned for fallback screens.
          workerPaymentStatus: shouldPayDokht ? "PAID_TO_WORKER" : "UNPAID",
          workerPaymentAmount: shouldPayDokht ? dokhtPaymentAmount : null,
          workerPaidAt: dokhtPaidAt,
          workerPaidById: null,
          inProgress: false,
          receivedById: null,
          receivedAt: null,
        },
        include: {
          customer: true,
          box: true,
          assignedTo: { select: { id: true, name: true, accountType: true } },
          assignedBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true, accountType: true } },
        },
      });

      await service.recalculateOrderBenefit(req.params.id);

      const msg = `Dokht Name: ${user.name} | Bill Number: ${order.customer.billNumber} | Order Type: ${order.type} | Customer Name: ${order.customer.firstName} | Stitching completed successfully and waiting for full payment / admin completion.`;
      await Promise.all(
        admins.map((admin) =>
          prisma.userNotification.create({
            data: {
              userId: admin.id,
              orderId: req.params.id,
              message: msg,
              type: "WORK_COMPLETED",
            },
          }),
        ),
      );

      // ── Customer SMS notification ──────────────────────────────────────────
      // Send only once per order and stamp smsSentAt after a confirmed send.
      if (!order.smsSentAt && order.customer?.phoneNumber) {
        try {
          await sendCustomerCompletionSMS(order.customer, order);
          await prisma.order.update({
            where: { id: req.params.id },
            data: { smsSentAt: new Date() },
          });
          smsSent = true;
        } catch (smsErr) {
          console.error(
            `[SMS] Failed to send completion SMS for order ${req.params.id}:`,
            smsErr.message,
          );
        }
      }

      return res.json({ ...result, smsSent });
    }

    try {
      result = await service.markComplete(req.params.id);
      if (!order.smsSentAt && order.customer?.phoneNumber) {
        try {
          await sendCustomerCompletionSMS(order.customer, order);
          await prisma.order.update({
            where: { id: req.params.id },
            data: { smsSentAt: new Date() },
          });
          smsSent = true;
        } catch (smsError) {
          console.error("Failed to send completion SMS:", smsError);
        }
      }
    } catch (error) {
      if (
        error?.code === "BOX_CAPACITY_FULL" ||
        error?.code === "BOX_NOT_FOUND_FOR_TYPE"
      ) {
        const boxSuffix = error?.boxName ? ` (${error.boxName})` : "";
        const baseMessage =
          error.code === "BOX_CAPACITY_FULL"
            ? `capacity of this box is full${boxSuffix}`
            : `No box found for ${order.type} orders`;
        const detailMessage = `${baseMessage} - ${order.customer.firstName} - Bill #${order.customer.billNumber} - ${order.type}.`;

        await Promise.all(
          admins.map((admin) =>
            prisma.userNotification.create({
              data: {
                userId: admin.id,
                orderId: req.params.id,
                message: detailMessage,
                type: "BOX_CAPACITY",
              },
            }),
          ),
        );

        return res
          .status(error.status || 400)
          .json({ error: error.message || baseMessage });
      }
      throw error;
    }

    const msg = `Order completed - ${order.type} - Bill #${order.customer.billNumber} (${order.customer.firstName}) by ${user.name}.`;
    await Promise.all(
      admins.map((admin) =>
        prisma.userNotification.create({
          data: {
            userId: admin.id,
            orderId: req.params.id,
            message: msg,
            type: "WORK_COMPLETED",
          },
        }),
      ),
    );

    res.json({ ...result, smsSent });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/orders/:id/progress - Toggle In Progress for a worker */
export const markInProgress = async (req, res, next) => {
  try {
    const user = req.user;
    const roleKeys = getRoleFieldKeys(user.accountType);
    const roleValues = (order) => getRoleOrderValues(order, user.accountType);
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { firstName: true, billNumber: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found." });

    // Workers can only update their own assigned orders
    if (["QICHIKAR", "DOKHT"].includes(user.accountType)) {
      if (roleValues(order).assignedToId !== user.id) {
        return res
          .status(403)
          .json({ error: "You can only update orders assigned to you." });
      }
      if (!roleValues(order).receivedById) {
        return res.status(400).json({
          error: "Receive this order before starting work.",
        });
      }
      if (roleValues(order).receivedById !== user.id) {
        return res.status(409).json({
          error: SAME_ROLE_CLAIM_CONFLICT_MESSAGE,
        });
      }
    }
    if (order.isCompleted) {
      return res
        .status(400)
        .json({ error: "Cannot update status of a completed order." });
    }

    const nowStarting = !roleValues(order).inProgress;

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(roleKeys ? { [roleKeys.inProgress]: nowStarting } : {}),
        inProgress: nowStarting,
      },
    });

    // Notify all admins when a worker starts working
    if (nowStarting) {
      const admins = await prisma.user.findMany({
        where: { accountType: "ADMIN" },
        select: { id: true },
      });
      const msg = `${user.name} started working on order for ${order.customer.firstName} - Bill #${order.customer.billNumber} (${order.type})`;
      await Promise.all(
        admins.map((admin) =>
          prisma.userNotification.create({
            data: {
              userId: admin.id,
              orderId: req.params.id,
              message: msg,
              type: "WORK_STARTED",
            },
          }),
        ),
      );
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/orders/:id/receive - Worker receives an assigned order */
export const markReceived = async (req, res, next) => {
  try {
    const user = req.user;
    const orderId = req.params.id;
    const roleKeys = getRoleFieldKeys(user.accountType);

    if (!roleKeys) {
      return res.status(400).json({ error: "Invalid worker role." });
    }

    const claim = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: { select: { firstName: true, billNumber: true } },
          assignedTo: { select: { id: true, name: true, accountType: true } },
          assignedBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true, accountType: true } },
        },
      });

      if (!order) return { kind: "NOT_FOUND" };
      if (order.isCompleted) return { kind: "COMPLETED" };

      // Sequential rule: Dokht can only receive after Qichikar completes.
      if (user.accountType === "DOKHT" && !order.qichikarCompletedAt) {
        return { kind: "QICHIKAR_NOT_COMPLETED" };
      }

      const roleAssignedToId =
        order[roleKeys.assignedToId] ??
        (order.assignedTo?.accountType === user.accountType
          ? order.assignedToId
          : null);
      const roleReceivedById =
        order[roleKeys.receivedById] ??
        (order.receivedBy?.accountType === user.accountType
          ? order.receivedById
          : null);

      const assignedToSameRoleOtherUser =
        roleAssignedToId && roleAssignedToId !== user.id;
      const receivedBySameRoleOtherUser =
        roleReceivedById && roleReceivedById !== user.id;

      if (assignedToSameRoleOtherUser || receivedBySameRoleOtherUser) {
        return { kind: "SAME_ROLE_CONFLICT" };
      }

      const now = new Date();
      const shouldAssignToSelf =
        !roleAssignedToId || roleAssignedToId !== user.id;

      // Optimistic concurrency guard: if row changed since our read, claim fails safely.
      const claimWrite = await tx.order.updateMany({
        where: {
          id: orderId,
          updatedAt: order.updatedAt,
          OR: [
            { [roleKeys.receivedById]: null },
            { [roleKeys.receivedById]: user.id },
          ],
        },
        data: {
          [roleKeys.assignedToId]: shouldAssignToSelf
            ? user.id
            : roleAssignedToId,
          [roleKeys.assignedAt]: shouldAssignToSelf
            ? now
            : order[roleKeys.assignedAt] || null,
          [roleKeys.receivedById]: user.id,
          [roleKeys.receivedAt]: now,
          [roleKeys.inProgress]: false,
          // Backward compatibility fields for existing screens/reports.
          assignedToId:
            order.assignedToId && order.assignedToId !== user.id
              ? order.assignedToId
              : user.id,
          assignedById: shouldAssignToSelf ? user.id : order.assignedById,
          assignedAt: shouldAssignToSelf ? now : order.assignedAt,
          assignmentNote:
            shouldAssignToSelf && !order.assignmentNote
              ? "Assigned to self from worker panel"
              : order.assignmentNote,
          receivedById:
            order.receivedById && order.receivedById !== user.id
              ? order.receivedById
              : user.id,
          receivedAt: now,
          inProgress: false,
        },
      });

      if (claimWrite.count === 0) {
        return { kind: "CONCURRENT_CONFLICT" };
      }

      const updated = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          box: true,
          assignedTo: { select: { id: true, name: true, accountType: true } },
          assignedBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true, accountType: true } },
        },
      });

      await tx.userNotification.updateMany({
        where: {
          userId: user.id,
          orderId,
          isRead: false,
          type: "ASSIGNMENT",
        },
        data: { isRead: true },
      });

      return {
        kind: "OK",
        updated,
        previousRoleReceivedById: roleReceivedById,
        shouldAssignToSelf,
        customer: order.customer,
        type: order.type,
      };
    });

    if (claim.kind === "NOT_FOUND") {
      return res.status(404).json({ error: "Order not found." });
    }
    if (claim.kind === "COMPLETED") {
      return res
        .status(400)
        .json({ error: "Completed orders cannot be received." });
    }
    if (claim.kind === "QICHIKAR_NOT_COMPLETED") {
      return res.status(409).json({ error: QICHIKAR_NOT_COMPLETED_MESSAGE });
    }
    if (
      claim.kind === "SAME_ROLE_CONFLICT" ||
      claim.kind === "CONCURRENT_CONFLICT"
    ) {
      return res.status(409).json({ error: SAME_ROLE_CLAIM_CONFLICT_MESSAGE });
    }

    const updated = claim.updated;
    if (!updated) {
      return res.status(409).json({ error: SAME_ROLE_CLAIM_CONFLICT_MESSAGE });
    }

    if (
      !claim.previousRoleReceivedById ||
      claim.previousRoleReceivedById !== user.id
    ) {
      const admins = await prisma.user.findMany({
        where: { accountType: "ADMIN" },
        select: { id: true },
      });
      const msg = claim.shouldAssignToSelf
        ? `${user.name} accepted and self-assigned order - ${claim.type} - Bill #${claim.customer.billNumber} (${claim.customer.firstName}).`
        : `${user.name} accepted order - ${claim.type} - Bill #${claim.customer.billNumber} (${claim.customer.firstName}).`;
      await Promise.all(
        admins.map((admin) =>
          prisma.userNotification.create({
            data: {
              userId: admin.id,
              orderId,
              message: msg,
              type: claim.shouldAssignToSelf
                ? "ASSIGNED_TO_SELF"
                : "WORK_RECEIVED",
            },
          }),
        ),
      );
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const payWorkerForCompletedOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const paymentAmount = parseNumberLocale(
      String(req.body?.paymentAmount ?? ""),
    );
    const requestedRole = ["QICHIKAR", "DOKHT"].includes(req.body?.workerRole)
      ? req.body.workerRole
      : null;

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        error: "Payment amount must be a valid positive number.",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { firstName: true, billNumber: true } },
        assignedTo: { select: { id: true, name: true, accountType: true } },
        qichikarAssignedTo: {
          select: { id: true, name: true, accountType: true },
        },
        dokhtAssignedTo: {
          select: { id: true, name: true, accountType: true },
        },
      },
    });

    if (!order) return res.status(404).json({ error: "Order not found." });
    const hasWorkerCompletion =
      !!order.qichikarCompletedAt ||
      !!order.dokhtCompletedAt ||
      order.isCompleted;
    if (!hasWorkerCompletion) {
      return res.status(400).json({
        error:
          "Only worker-completed orders can be paid (Qichikar or Dokht completion required).",
      });
    }
    const paymentRole =
      requestedRole ||
      (order.dokhtCompletedAt
        ? "DOKHT"
        : order.qichikarCompletedAt
          ? "QICHIKAR"
          : order.assignedTo?.accountType);

    const completedAtField =
      paymentRole === "DOKHT" ? "dokhtCompletedAt" : "qichikarCompletedAt";
    const completedWorker =
      paymentRole === "DOKHT"
        ? order.dokhtAssignedTo
        : paymentRole === "QICHIKAR"
          ? order.qichikarAssignedTo
          : order.assignedTo;

    if (
      requestedRole &&
      !order[completedAtField] &&
      !(order.isCompleted && completedWorker?.accountType === requestedRole)
    ) {
      return res.status(400).json({
        error: `${requestedRole === "DOKHT" ? "Dokht" : "Qichikar"} has not completed this order yet.`,
      });
    }

    const paymentStatusField =
      paymentRole === "DOKHT" ? "dokhtPaymentStatus" : "qichikarPaymentStatus";
    const paymentAmountField =
      paymentRole === "DOKHT" ? "dokhtPaymentAmount" : "qichikarPaymentAmount";
    const paidAtField =
      paymentRole === "DOKHT" ? "dokhtPaidAt" : "qichikarPaidAt";
    const paidByIdField =
      paymentRole === "DOKHT" ? "dokhtPaidById" : "qichikarPaidById";

    if (!completedWorker) {
      return res.status(400).json({ error: "Order has no assigned worker." });
    }
    if (!["QICHIKAR", "DOKHT"].includes(completedWorker.accountType)) {
      return res.status(400).json({ error: "Assigned user is not a worker." });
    }
    const isPaidAlready = order[paymentStatusField] === "PAID_TO_WORKER";
    const paidAtValue = order[paidAtField] || order.workerPaidAt || null;
    let isEditWindowOpen = false;
    if (isPaidAlready && paidAtValue) {
      const paidAtMs = new Date(paidAtValue).getTime();
      isEditWindowOpen =
        Number.isFinite(paidAtMs) &&
        Date.now() - paidAtMs <= WORKER_PAYMENT_EDIT_WINDOW_MS;
    }

    if (isPaidAlready && !isEditWindowOpen) {
      return res.status(409).json({
        error:
          "Payment edit window has expired. Payments can only be updated within 24 hours.",
        code: "PAYMENT_EDIT_WINDOW_EXPIRED",
      });
    }

    const now = new Date();
    const persistedPaidAt =
      isPaidAlready && paidAtValue ? new Date(paidAtValue) : now;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedToId: completedWorker.id,
        [paymentAmountField]: paymentAmount,
        [paymentStatusField]: "PAID_TO_WORKER",
        [paidAtField]: persistedPaidAt,
        [paidByIdField]: req.user.id,
        // Keep legacy fields updated for backward compatibility in legacy screens.
        workerPaymentAmount: paymentAmount,
        workerPaymentStatus: "PAID_TO_WORKER",
        workerPaidAt: persistedPaidAt,
        workerPaidById: req.user.id,
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, accountType: true } },
        workerPaidBy: { select: { id: true, name: true } },
        qichikarPaidBy: { select: { id: true, name: true } },
        dokhtPaidBy: { select: { id: true, name: true } },
      },
    });

    await service.recalculateOrderBenefit(orderId);

    const roleLabel = paymentRole === "DOKHT" ? "Dokht" : "Qichikar";
    const payoutMsg = isPaidAlready
      ? `Admin updated your completed ${roleLabel} payment - Bill #${order.customer.billNumber} (${order.customer.firstName}) - New Amount: ${Number(paymentAmount).toLocaleString()} AF.`
      : `Admin paid your completed ${roleLabel} order - Bill #${order.customer.billNumber} (${order.customer.firstName}) - Amount: ${Number(paymentAmount).toLocaleString()} AF.`;

    await prisma.userNotification.create({
      data: {
        userId: completedWorker.id,
        orderId,
        message: payoutMsg,
        type: "WORKER_PAYMENT",
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await service.deleteOrder(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/** GET /api/orders/report/monthly?month=4&year=2026 — PDF report for a specific month/year */
export const getMonthlyReport = async (req, res, next) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const language = normalizeReportLanguage(req.query.lang || "en");

    if (!month || !year || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ error: "Valid month (1-12) and year are required" });
    }

    const [orders, dashboardStats] = await Promise.all([
      service.getMonthlyReportOrders({ month, year }),
      getDashboardStats({ month, year }),
    ]);
    const pdfBuffer = await buildMonthlyReportPdf({
      month,
      year,
      orders,
      dashboardStats,
      language,
    });

    const monthLabel = new Intl.DateTimeFormat(getReportLocaleTag(language), {
      month: "long",
    }).format(new Date(year, month - 1, 1));
    const asciiFallback = `Monthly_Report_${month}_${year}.pdf`;
    const encodedFilename = encodeURIComponent(
      `Monthly_Report_${monthLabel}_${year}.pdf`,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/orders/:id/assign - Admin assigns an order to a worker */
export const assign = async (req, res, next) => {
  try {
    const { assignedToId, assignmentNote, assignmentPrice } = req.body;
    const orderId = req.params.id;

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        isCompleted: true,
        qichikarCompletedAt: true,
        dokhtCompletedAt: true,
        qichikarAssignedToId: true,
        dokhtAssignedToId: true,
        assignedToId: true,
        assignmentPrice: true,
        qichikarReceivedById: true,
        dokhtReceivedById: true,
        qichikarInProgress: true,
        dokhtInProgress: true,
        assignedTo: { select: { id: true, accountType: true } },
      },
    });
    if (!existingOrder)
      return res.status(404).json({ error: "Order not found." });

    let worker = null;
    let normalizedAssignmentPrice = null;

    if (assignedToId) {
      worker = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, name: true, accountType: true },
      });
      if (!worker) return res.status(404).json({ error: "User not found." });
      if (!["QICHIKAR", "DOKHT"].includes(worker.accountType)) {
        return res.status(400).json({
          error: "Orders can only be assigned to Qichikar or Dokht.",
        });
      }

      const isRoleCompleted =
        existingOrder.isCompleted ||
        (worker.accountType === "QICHIKAR"
          ? Boolean(existingOrder.qichikarCompletedAt)
          : Boolean(existingOrder.dokhtCompletedAt));

      if (isRoleCompleted) {
        return res.status(409).json({
          error: COMPLETED_REASSIGN_BLOCK_MESSAGE,
        });
      }

      const alreadyAssignedToRole =
        worker.accountType === "QICHIKAR"
          ? existingOrder.qichikarAssignedToId
          : existingOrder.dokhtAssignedToId;

      if (alreadyAssignedToRole) {
        return res.status(409).json({
          error: `This order is already assigned to a ${worker.accountType === "QICHIKAR" ? "Qichikar" : "Dokht"} worker and cannot be assigned again.`,
        });
      }

      if (
        assignmentPrice === undefined ||
        assignmentPrice === null ||
        assignmentPrice === ""
      ) {
        return res.status(400).json({
          error: "Assignment price is required when assigning an order.",
        });
      }

      const parsedPrice =
        typeof assignmentPrice === "number"
          ? assignmentPrice
          : parseNumberLocale(String(assignmentPrice));

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          error: "Assignment price must be a valid non-negative number.",
        });
      }
      normalizedAssignmentPrice = parsedPrice;
    }

    const storedAssignmentNote =
      assignedToId && typeof assignmentNote === "string"
        ? assignmentNote.trim() || null
        : null;
    const nextAssignedToId = assignedToId || null;
    const order = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          receivedById: true,
          receivedAt: true,
          qichikarAssignedToId: true,
          qichikarAssignedAt: true,
          qichikarReceivedById: true,
          qichikarReceivedAt: true,
          qichikarInProgress: true,
          dokhtAssignedToId: true,
          dokhtAssignedAt: true,
          dokhtReceivedById: true,
          dokhtReceivedAt: true,
          dokhtInProgress: true,
        },
      });

      const isAssigningQichikar =
        Boolean(nextAssignedToId) && worker?.accountType === "QICHIKAR";
      const isAssigningDokht =
        Boolean(nextAssignedToId) && worker?.accountType === "DOKHT";

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          assignedToId: nextAssignedToId,
          assignedById: nextAssignedToId ? req.user.id : null,
          assignedAt: nextAssignedToId ? new Date() : null,
          assignmentNote: storedAssignmentNote,
          assignmentPrice: nextAssignedToId ? normalizedAssignmentPrice : null,
          // Deferred worker payment: assignment keeps payment pending until completion.
          workerPaymentStatus: "UNPAID",
          workerPaymentAmount: null,
          workerPaidAt: null,
          workerPaidById: null,
          receivedById: nextAssignedToId ? null : currentOrder.receivedById,
          receivedAt: nextAssignedToId ? null : currentOrder.receivedAt,
          qichikarAssignedToId: isAssigningQichikar
            ? nextAssignedToId
            : currentOrder.qichikarAssignedToId,
          qichikarAssignedAt: isAssigningQichikar
            ? new Date()
            : currentOrder.qichikarAssignedAt,
          qichikarReceivedById: isAssigningQichikar
            ? null
            : currentOrder.qichikarReceivedById,
          qichikarReceivedAt: isAssigningQichikar
            ? null
            : currentOrder.qichikarReceivedAt,
          qichikarInProgress: isAssigningQichikar
            ? false
            : currentOrder.qichikarInProgress,
          qichikarPaymentStatus: isAssigningQichikar ? "UNPAID" : undefined,
          qichikarPaymentAmount: isAssigningQichikar
            ? normalizedAssignmentPrice
            : undefined,
          qichikarPaidAt: isAssigningQichikar ? null : undefined,
          qichikarPaidById: isAssigningQichikar ? null : undefined,
          dokhtAssignedToId: isAssigningDokht
            ? nextAssignedToId
            : currentOrder.dokhtAssignedToId,
          dokhtAssignedAt: isAssigningDokht
            ? new Date()
            : currentOrder.dokhtAssignedAt,
          dokhtReceivedById: isAssigningDokht
            ? null
            : currentOrder.dokhtReceivedById,
          dokhtReceivedAt: isAssigningDokht
            ? null
            : currentOrder.dokhtReceivedAt,
          dokhtInProgress: isAssigningDokht
            ? false
            : currentOrder.dokhtInProgress,
          dokhtPaymentStatus: isAssigningDokht ? "UNPAID" : undefined,
          dokhtPaymentAmount: isAssigningDokht
            ? normalizedAssignmentPrice
            : undefined,
          dokhtPaidAt: isAssigningDokht ? null : undefined,
          dokhtPaidById: isAssigningDokht ? null : undefined,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              billNumber: true,
              phoneNumber: true,
            },
          },
          assignedTo: { select: { id: true, name: true, accountType: true } },
          assignedBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true, accountType: true } },
        },
      });

      await service.recalculateOrderBenefit(orderId, tx);

      return updated;
    });
    const normalizedOrder = service.enrichOrderAssignment(order);

    if (assignedToId) {
      const msg = `New order assigned by ${req.user.name}: ${order.customer.firstName} - Bill #${order.customer.billNumber} (${order.type}) - Price: ${Number(normalizedAssignmentPrice || 0).toLocaleString()} AF${normalizedOrder.assignmentNote ? `. Note: ${normalizedOrder.assignmentNote}` : ""}`;
      await prisma.userNotification.create({
        data: {
          userId: assignedToId,
          orderId,
          message: msg,
          type: "ASSIGNMENT",
        },
      });
    }

    res.json(normalizedOrder);
  } catch (error) {
    next(error);
  }
};
