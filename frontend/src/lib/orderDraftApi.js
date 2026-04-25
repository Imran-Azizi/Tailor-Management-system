import api from "./api.js";

export async function listOrderDrafts() {
  const { data } = await api.get("/orders/drafts");
  return Array.isArray(data) ? data : [];
}

export async function getOrderDraft(id) {
  if (!id) return null;
  const { data } = await api.get(`/orders/drafts/${id}`);
  return data || null;
}

export async function upsertOrderDraft(payload) {
  const { data } = await api.post("/orders/drafts", payload);
  return data;
}

export async function deleteOrderDraft(id) {
  if (!id) return;
  await api.delete(`/orders/drafts/${id}`);
}
