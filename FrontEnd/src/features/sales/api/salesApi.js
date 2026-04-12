import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (typeof value === "boolean") {
      if (value) cleaned[key] = true;
      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
}

export const salesApi = {
  async createDraft(payload) {
    const res = await axiosClient.post("/invoices", payload);
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async listInvoices(params = {}) {
    const res = await axiosClient.get("/invoices", {
      params: cleanParams(params),
    });
    return unwrap(res);
  },

  async getInvoice(invoiceId) {
    const res = await axiosClient.get(`/invoices/${encodeURIComponent(invoiceId)}`);
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async getInvoiceReturns(invoiceId) {
    const res = await axiosClient.get(`/invoices/${encodeURIComponent(invoiceId)}/returns`);
    return unwrap(res);
  },

  async addItem(invoiceId, payload) {
    const res = await axiosClient.post(
      `/invoices/${encodeURIComponent(invoiceId)}/items`,
      payload
    );
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async updateItemQty(invoiceId, itemId, quantity) {
    const res = await axiosClient.patch(
      `/invoices/${encodeURIComponent(invoiceId)}/items/${encodeURIComponent(itemId)}`,
      { quantity }
    );
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async applyItemDiscount(invoiceId, itemId, itemDiscountPercent) {
    const res = await axiosClient.patch(
      `/invoices/${encodeURIComponent(invoiceId)}/items/${encodeURIComponent(itemId)}/discount`,
      { itemDiscountPercent }
    );
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async removeItem(invoiceId, itemId) {
    const res = await axiosClient.delete(
      `/invoices/${encodeURIComponent(invoiceId)}/items/${encodeURIComponent(itemId)}`
    );
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async applyInvoiceDiscount(invoiceId, invoiceDiscountPercent) {
    const res = await axiosClient.patch(
      `/invoices/${encodeURIComponent(invoiceId)}/discount`,
      { invoiceDiscountPercent }
    );
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async finalizeInvoice(invoiceId) {
    const res = await axiosClient.post(`/invoices/${encodeURIComponent(invoiceId)}/finalize`);
    return unwrap(res)?.invoice ?? unwrap(res);
  },

  async openReceipt(invoiceId) {
    const res = await axiosClient.get(`/invoices/${encodeURIComponent(invoiceId)}/receipt.pdf`, {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 60000);

    return url;
  },

  async listReturns(params = {}) {
    const res = await axiosClient.get("/returns", {
      params: cleanParams(params),
    });
    return unwrap(res);
  },

  async returnsSummary(params = {}) {
    const res = await axiosClient.get("/returns/summary", {
      params: cleanParams(params),
    });
    return unwrap(res)?.summary ?? unwrap(res);
  },

  async getReturn(returnId) {
    const res = await axiosClient.get(`/returns/${encodeURIComponent(returnId)}`);
    return unwrap(res)?.return ?? unwrap(res);
  },

  async createReturn(payload) {
    const res = await axiosClient.post("/returns", payload);
    return unwrap(res)?.return ?? unwrap(res);
  },
};