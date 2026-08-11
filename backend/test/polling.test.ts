import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parsePollingConfigFromEnv,
  startPolling,
  ThresholdWatcher,
  type PollingConfig,
} from "../src/polling/engine.js";

describe("parsePollingConfigFromEnv", () => {
  it("devuelve null si falta POLLING_ASSET_ID", () => {
    expect(parsePollingConfigFromEnv({})).toBeNull();
  });

  it("devuelve null si hay asset pero ningún umbral", () => {
    expect(parsePollingConfigFromEnv({ POLLING_ASSET_ID: "bitcoin" })).toBeNull();
  });

  it("parsea una config completa con defaults razonables", () => {
    const config = parsePollingConfigFromEnv({
      POLLING_ASSET_ID: "bitcoin",
      POLLING_ALERT_ABOVE: "100000",
    });
    expect(config).toEqual({
      assetId: "bitcoin",
      currency: "usd",
      above: 100000,
      below: undefined,
      intervalMs: 60_000,
    });
  });

  it("respeta currency e intervalMs explícitos", () => {
    const config = parsePollingConfigFromEnv({
      POLLING_ASSET_ID: "ethereum",
      POLLING_CURRENCY: "ars",
      POLLING_ALERT_BELOW: "500",
      POLLING_INTERVAL_MS: "5000",
    });
    expect(config).toMatchObject({ currency: "ars", below: 500, intervalMs: 5000 });
  });
});

describe("ThresholdWatcher", () => {
  const config: PollingConfig = {
    assetId: "bitcoin",
    currency: "usd",
    above: 100,
    below: 50,
    intervalMs: 1000,
  };

  it("no dispara mientras el precio está dentro del rango normal", () => {
    const watcher = new ThresholdWatcher();
    expect(watcher.check(75, config)).toBeNull();
  });

  it("dispara al cruzar el umbral 'above'", () => {
    const watcher = new ThresholdWatcher();
    const alert = watcher.check(150, config);
    expect(alert).toMatchObject({ category: "price_above", price: 150, threshold: 100 });
  });

  it("no repite la misma alerta mientras se mantiene cruzado", () => {
    const watcher = new ThresholdWatcher();
    expect(watcher.check(150, config)).not.toBeNull();
    expect(watcher.check(160, config)).toBeNull();
    expect(watcher.check(155, config)).toBeNull();
  });

  it("vuelve a disparar si baja del umbral y lo vuelve a cruzar", () => {
    const watcher = new ThresholdWatcher();
    expect(watcher.check(150, config)).not.toBeNull();
    expect(watcher.check(75, config)).toBeNull(); // vuelve al rango normal
    expect(watcher.check(150, config)).not.toBeNull(); // cruza de nuevo
  });

  it("dispara al cruzar el umbral 'below'", () => {
    const watcher = new ThresholdWatcher();
    const alert = watcher.check(10, config);
    expect(alert).toMatchObject({ category: "price_below", price: 10, threshold: 50 });
  });
});

describe("startPolling", () => {
  const config: PollingConfig = {
    assetId: "bitcoin",
    currency: "usd",
    above: 100,
    intervalMs: 1000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("hace un broadcast cuando el precio cruza el umbral", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 150 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const broadcast = vi.fn();

    const stop = startPolling(config, { connectedCount: () => 0, broadcast });
    await vi.waitFor(() => expect(broadcast).toHaveBeenCalled());

    expect(broadcast).toHaveBeenCalledWith(
      "alert",
      expect.objectContaining({ category: "price_above", price: 150 })
    );
    stop();
  });

  it("no hace broadcast si el precio no cruza el umbral", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 50 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const broadcast = vi.fn();

    const stop = startPolling(config, { connectedCount: () => 0, broadcast });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    await Promise.resolve();

    expect(broadcast).not.toHaveBeenCalled();
    stop();
  });

  it("no tira una excepción sin manejar si la fuente falla", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);
    const broadcast = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const stop = startPolling(config, { connectedCount: () => 0, broadcast });
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());

    expect(broadcast).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    stop();
  });
});
