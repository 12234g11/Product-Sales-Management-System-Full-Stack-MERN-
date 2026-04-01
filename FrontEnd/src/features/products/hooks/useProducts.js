import { useEffect, useRef, useState } from "react";
import { productsApi } from "../api/productsApi";

export function useProducts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lastQueryRef = useRef({ type: "all", filters: null });

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    lastQueryRef.current = { type: "all", filters: null };

    try {
      const data = await productsApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.userMessage || "حصل خطأ أثناء تحميل المنتجات");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const search = async (filters) => {
    setLoading(true);
    setError("");
    lastQueryRef.current = { type: "search", filters };

    try {
      const data = await productsApi.search(filters || {});
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.userMessage || "حصل خطأ أثناء البحث");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const reloadLast = async () => {
    const last = lastQueryRef.current;
    if (last.type === "search") return search(last.filters || {});
    return fetchAll();
  };

  const create = async (payload) => {
    setBusy(true);
    setError("");
    try {
      await productsApi.create(payload);
      await reloadLast();
    } catch (e) {
      setError(e.userMessage || "فشل إضافة المنتج");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const update = async (oldId, payload) => {
    setBusy(true);
    setError("");
    try {
      await productsApi.update(oldId, payload);
      await reloadLast();
    } catch (e) {
      setError(e.userMessage || "فشل تعديل المنتج");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    setError("");
    try {
      await productsApi.remove(id);
      await reloadLast();
    } catch (e) {
      setError(e.userMessage || "فشل حذف المنتج");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const adjustStock = async (id, payload) => {
    setBusy(true);
    setError("");
    try {
      const data = await productsApi.adjustStock(id, payload);
      await reloadLast();
      return data;
    } catch (e) {
      setError(e.userMessage || "فشل تسوية المخزون");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return {
    items,
    loading,
    busy,
    error,
    fetchAll,
    search,
    create,
    update,
    remove,
    adjustStock,
  };
}