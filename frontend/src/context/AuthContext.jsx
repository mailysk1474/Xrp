import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { api, apiError, wsUrl } from "@/lib/api";
import * as storage from "@/lib/storage";
import { pushNotify } from "@/lib/notify";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [serverState, setServerState] = useState(null);
  const [ready, setReady] = useState(false);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const serverOffset = useRef(0);

  const refresh = useCallback(async () => {
    if (!storage.getToken()) {
      setReady(true);
      return null;
    }
    try {
      const { data } = await api.get("/state");
      setServerState(data);
      setUser(data.user);
      if (data.server_time) {
        serverOffset.current = new Date(data.server_time).getTime() - Date.now();
      }
      return data;
    } catch (err) {
      if (err?.response?.status === 401) {
        storage.clearToken();
        setUser(null);
        setServerState(null);
      }
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  const connectWs = useCallback(() => {
    if (!storage.getToken()) return;
    try {
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "notify") {
            refresh();
            window.dispatchEvent(new CustomEvent("xp-refresh", { detail: msg }));
            if (msg.event === "deposit_confirmed") {
              const body = `${Number(msg.amount).toLocaleString()} XRP credited to your wallet.`;
              pushNotify("Deposit confirmed ✅", body);
              toast.success(body);
            } else if (msg.event === "withdrawal_approved") {
              const body = `${Number(msg.amount).toLocaleString()} XRP withdrawal approved.`;
              pushNotify("Withdrawal approved ✅", body);
              toast.success(body);
            }
          } else if (msg.type === "state_updated" || msg.type === "admin_updated") {
            refresh();
            window.dispatchEvent(new CustomEvent("xp-refresh", { detail: msg }));
          }
        } catch (e) {
          console.debug("ws message parse failed", e);
        }
      };
      ws.onclose = () => {
        wsRef.current = null;
        setTimeout(() => {
          if (storage.getToken()) connectWs();
        }, 4000);
      };
      ws.onerror = () => {
        try { ws.close(); } catch (e) { console.debug("ws close failed", e); }
      };
    } catch (e) {
      console.debug("ws connect failed", e);
    }
  }, [refresh]);

  const startLiveSync = useCallback(() => {
    refresh();
    connectWs();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(refresh, 5000); // fallback polling
  }, [refresh, connectWs]);

  const stopLiveSync = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (wsRef.current) { try { wsRef.current.close(); } catch {} }
    wsRef.current = null;
  }, []);

  useEffect(() => {
    if (storage.getToken()) startLiveSync();
    else setReady(true);
    return () => stopLiveSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async ({ first_name, last_name, username }) => {
    const { data } = await api.post("/auth/register", { first_name, last_name, username });
    storage.setToken(data.token);
    setUser(data.user);
    return data; // includes phrase
  };

  const login = async (username, phrase) => {
    const { data } = await api.post("/auth/login", { username, phrase });
    storage.setToken(data.token);
    setUser(data.user);
    return data;
  };

  const beginSession = () => {
    startLiveSync();
  };

  const lock = () => {
    // keep vault, drop session token -> requires PIN
    stopLiveSync();
    storage.clearToken();
    setUser(null);
    setServerState(null);
  };

  const logout = () => {
    // full logout: forget wallet on this device
    stopLiveSync();
    storage.clearToken();
    storage.clearVault();
    setUser(null);
    setServerState(null);
  };

  const value = {
    user,
    serverState,
    ready,
    serverOffset,
    register,
    login,
    beginSession,
    refresh,
    lock,
    logout,
    apiError,
    hasVault: storage.hasVault,
    getVault: storage.getVault,
    setVault: storage.setVault,
    isAuthed: () => !!storage.getToken(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
