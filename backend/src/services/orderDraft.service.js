import { prisma } from "../lib/prisma.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toSummaryOrderTypes(orderTypes = []) {
  return (orderTypes || [])
    .map((entry) => entry?.type)
    .filter(Boolean)
    .slice(0, 20);
}

function buildDraftData(input = {}) {
  return {
    customerInfo: input.customerInfo || {},
    orderTypes: input.orderTypes || [],
    measurements: input.measurements || {},
  };
}

function draftResponse(draft) {
  return {
    id: draft.id,
    clientKey: draft.clientKey,
    customerName: draft.customerName,
    orderTypes: draft.orderTypes || [],
    step: draft.step || 0,
    status: draft.status,
    draftData: draft.draftData || {},
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export async function listOrderDrafts(userId) {
  const drafts = await prisma.orderDraft.findMany({
    where: { userId, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
  });

  return drafts.map(draftResponse);
}

export async function getOrderDraftById(userId, id) {
  const draft = await prisma.orderDraft.findFirst({
    where: { id, userId, status: "DRAFT" },
  });
  if (!draft) {
    throw Object.assign(new Error("Draft not found"), { status: 404 });
  }
  return draftResponse(draft);
}

export async function upsertOrderDraft(userId, payload) {
  const draftData = buildDraftData(payload);
  const customerName = normalizeText(payload.customerInfo?.firstName) || null;
  const orderTypesSummary = toSummaryOrderTypes(payload.orderTypes);
  const step = Math.max(0, Math.min(Number(payload.step || 0), 10));

  if (payload.id) {
    const existing = await prisma.orderDraft.findFirst({
      where: { id: payload.id, userId, status: "DRAFT" },
    });
    if (!existing) {
      throw Object.assign(new Error("Draft not found"), { status: 404 });
    }

    const updated = await prisma.orderDraft.update({
      where: { id: existing.id },
      data: {
        clientKey: payload.clientKey,
        customerName,
        orderTypes: orderTypesSummary,
        step,
        draftData,
      },
    });

    return draftResponse(updated);
  }

  const created = await prisma.orderDraft.upsert({
    where: {
      userId_clientKey: {
        userId,
        clientKey: payload.clientKey,
      },
    },
    create: {
      userId,
      clientKey: payload.clientKey,
      customerName,
      orderTypes: orderTypesSummary,
      step,
      status: "DRAFT",
      draftData,
    },
    update: {
      customerName,
      orderTypes: orderTypesSummary,
      step,
      status: "DRAFT",
      draftData,
    },
  });

  return draftResponse(created);
}

export async function deleteOrderDraft(userId, id) {
  const existing = await prisma.orderDraft.findFirst({
    where: { id, userId, status: "DRAFT" },
    select: { id: true },
  });

  if (!existing) {
    throw Object.assign(new Error("Draft not found"), { status: 404 });
  }

  await prisma.orderDraft.delete({ where: { id: existing.id } });
}
