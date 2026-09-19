import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const PriceContext = createContext(null);

const REFRESH_MS = 60000;

export function PriceProvider({ children }) {
  const [rate, setRate] = useState(null); // XRP -> USD
  const [source, setSource] = useState(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/price/xrp");
      if (data && data.usd) {
        setRate(Number(data.usd));
        setSource(data.source || null);
      }
    } catch (e) {
      // keep last known rate on failure
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const toUSD = useCallback((xrp) => {
    if (rate == null || xrp == null || isNaN(xrp)) return null;
    return Number(xrp) * rate;
  }, [rate]);

  return (
    <PriceContext.Provider value={{ rate, source, ready, toUSD, refresh: load }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrice() {
  const ctx = useContext(PriceContext);
  if (!ctx) return { rate: null, source: null, ready: false, toUSD: () => null, refresh: () => {} };
  return ctx;
}
