/**
 * Vitest unit tests for the IRCTC redirect builders.
 *
 * Documents the exact URL shapes from PDF Appendix A. Run with:
 *   npm run test
 *
 * The vendor ID is mocked per-test via `vi.doMock` since the builders read it
 * at module load time from `./config`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helper: re-import the builder module with a mocked config so we can pin
// IRCTC_VENDOR_ID_B64 to the value used in the PDF examples.
const VENDOR_ID_B64 = "NjMyMDAxNA=="; // base64 of "6320014"
const BASE = "https://stage-ecatering.ipsator.com";

async function loadBuilder(vendorId: string = VENDOR_ID_B64, baseUrl: string = BASE) {
  vi.resetModules();
  vi.doMock("./config", () => ({
    IRCTC_BASE_URL: baseUrl,
    IRCTC_VENDOR_ID_B64: vendorId,
    IRCTC_HANDOFF_USER_ENABLED: true,
  }));
  return await import("./redirectBuilder");
}

describe("encodeUser", () => {
  it("base64-encodes name:mobile:email", async () => {
    const { encodeUser } = await loadBuilder();
    // "User Name:9999999999:user@example.com" -> VXNlciBOYW1lOjk5OTk5OTk5OTk6dXNlckBleGFtcGxlLmNvbQ==
    expect(encodeUser("User Name", "9999999999", "user@example.com")).toBe(
      "VXNlciBOYW1lOjk5OTk5OTk5OTk6dXNlckBleGFtcGxlLmNvbQ=="
    );
  });
});

describe("buildPnrRedirectUrl", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.resetModules());

  it("builds a PNR URL with user param (PDF Appendix A example)", async () => {
    const { buildPnrRedirectUrl } = await loadBuilder();
    const url = buildPnrRedirectUrl("2721880872", {
      name: "User Name",
      mobile: "9999999999",
      email: "user@example.com",
    });
    expect(url).toBe(
      `${BASE}/2721880872/outlets?reqId=NjMyMDAxNA%3D%3D&user=VXNlciBOYW1lOjk5OTk5OTk5OTk6dXNlckBleGFtcGxlLmNvbQ%3D%3D`
    );
  });

  it("omits the user param when no user is provided", async () => {
    const { buildPnrRedirectUrl } = await loadBuilder();
    const url = buildPnrRedirectUrl("2721880872");
    expect(url).toBe(`${BASE}/2721880872/outlets?reqId=NjMyMDAxNA%3D%3D`);
    expect(url).not.toContain("user=");
  });

  it("throws when PNR is empty", async () => {
    const { buildPnrRedirectUrl } = await loadBuilder();
    expect(() => buildPnrRedirectUrl("")).toThrow(/pnr/);
    expect(() => buildPnrRedirectUrl("   ")).toThrow(/pnr/);
  });

  it("throws when vendor ID is not configured", async () => {
    const { buildPnrRedirectUrl } = await loadBuilder("");
    expect(() => buildPnrRedirectUrl("2721880872")).toThrow(/aggregator not configured/);
  });
});

describe("buildTrainRedirectUrl", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.resetModules());

  it("builds a train URL with boardingDate and reqId", async () => {
    const { buildTrainRedirectUrl } = await loadBuilder();
    const url = buildTrainRedirectUrl("12951", "BRC", "2025-01-01");
    expect(url).toBe(
      `${BASE}/train/12951/BRC?boardingDate=2025-01-01&reqId=NjMyMDAxNA%3D%3D`
    );
  });

  it("appends user param when provided", async () => {
    const { buildTrainRedirectUrl } = await loadBuilder();
    const url = buildTrainRedirectUrl("12951", "BRC", "2025-01-01", {
      name: "User Name",
      mobile: "9999999999",
      email: "user@example.com",
    });
    expect(url).toContain("boardingDate=2025-01-01");
    expect(url).toContain("reqId=NjMyMDAxNA%3D%3D");
    expect(url).toContain("user=VXNlciBOYW1lOjk5OTk5OTk5OTk6dXNlckBleGFtcGxlLmNvbQ%3D%3D");
  });

  it("throws when any required field is empty", async () => {
    const { buildTrainRedirectUrl } = await loadBuilder();
    expect(() => buildTrainRedirectUrl("", "BRC", "2025-01-01")).toThrow(/trainNo/);
    expect(() => buildTrainRedirectUrl("12951", "", "2025-01-01")).toThrow(/boardingStation/);
    expect(() => buildTrainRedirectUrl("12951", "BRC", "")).toThrow(/boardingDate/);
  });
});

describe("buildStationRedirectUrl", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.resetModules());

  it("builds a station URL with reqId", async () => {
    const { buildStationRedirectUrl } = await loadBuilder();
    const url = buildStationRedirectUrl("NDLS");
    expect(url).toBe(`${BASE}/station/NDLS/outlets?reqId=NjMyMDAxNA%3D%3D`);
  });

  it("appends user param when provided", async () => {
    const { buildStationRedirectUrl } = await loadBuilder();
    const url = buildStationRedirectUrl("NDLS", {
      name: "User Name",
      mobile: "9999999999",
      email: "user@example.com",
    });
    expect(url).toContain("reqId=NjMyMDAxNA%3D%3D");
    expect(url).toContain("user=VXNlciBOYW1lOjk5OTk5OTk5OTk6dXNlckBleGFtcGxlLmNvbQ%3D%3D");
  });

  it("throws when station code is empty", async () => {
    const { buildStationRedirectUrl } = await loadBuilder();
    expect(() => buildStationRedirectUrl("")).toThrow(/stationCode/);
  });
});
