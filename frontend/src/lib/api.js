import axios from "axios";
import { getToken, clearToken } from "@/lib/storage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Cache-Control": "no-store" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function wsUrl() {
  const token = getToken();
  const base = BACKEND_URL.replace(/^http/, "ws");
  return `${base}/api/ws?token=${token}`;
}

export function apiError(err) {  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export { clearToken };

// Authenticated file download for transaction export (CSV / PDF).
export async function downloadTransactions(fmt = "csv") {
  const res = await api.get("/transactions/export", {
    params: { fmt },
    responseType: "blob",
  });
  const mime = fmt === "pdf" ? "application/pdf" : "text/csv";
  const blob = new Blob([res.data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `xamanprotocol_transactions_${stamp}.${fmt}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
