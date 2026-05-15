/**
 * Vitest unit tests for the admin IRCTC API schemas.
 *
 * Covers only the runtime-validation layer — we don't exercise axios here.
 * Mirrors the test style of `src/integrations/irctc/redirectBuilder.test.ts`.
 */

import { describe, it, expect } from "vitest";

import { __test } from "./adminIrctcApi";

const { adminOrderSummarySchema, adminStatsSchema, adminPageSchema } = __test;

describe("adminOrderSummarySchema", () => {
  it("accepts a minimal valid row", () => {
    const ok = adminOrderSummarySchema.safeParse({
      internalOrderId: 1,
      externalOrderId: "EXT-1",
      status: "CONFIRMED",
      paymentType: "CASH_ON_DELIVERY",
      customerName: "Test",
      customerMobile: "9999999999",
      amountPayable: 100,
      bookingDate: "2026-05-15",
      updatedAt: "2026-05-15T12:00:00Z",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects unknown status", () => {
    const bad = adminOrderSummarySchema.safeParse({
      internalOrderId: 1,
      externalOrderId: "EXT-1",
      status: "ZZZ",
      paymentType: "CASH_ON_DELIVERY",
      customerName: "Test",
      customerMobile: "9999999999",
      amountPayable: 100,
      bookingDate: "2026-05-15",
      updatedAt: "2026-05-15T12:00:00Z",
    });
    expect(bad.success).toBe(false);
  });
});

describe("adminStatsSchema", () => {
  it("accepts a populated stats payload", () => {
    const ok = adminStatsSchema.safeParse({
      countsByStatus: { CONFIRMED: 12, PENDING: 3 },
      stuckPending: 0,
      stuckPushFailed: 1,
      stuckRefundFailed: 0,
      todayCounts: { ingested: 50, confirmed: 30, cancelled: 5 },
      lastSweeperRunMs: 1715760000000,
      circuitOpen: false,
    });
    expect(ok.success).toBe(true);
  });

  it("accepts a null lastSweeperRunMs", () => {
    const ok = adminStatsSchema.safeParse({
      countsByStatus: {},
      stuckPending: 0,
      stuckPushFailed: 0,
      stuckRefundFailed: 0,
      todayCounts: { ingested: 0, confirmed: 0, cancelled: 0 },
      lastSweeperRunMs: null,
      circuitOpen: false,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects non-numeric countsByStatus values", () => {
    const bad = adminStatsSchema.safeParse({
      countsByStatus: { CONFIRMED: "twelve" },
      stuckPending: 0,
      stuckPushFailed: 0,
      stuckRefundFailed: 0,
      todayCounts: { ingested: 0, confirmed: 0, cancelled: 0 },
      lastSweeperRunMs: null,
      circuitOpen: false,
    });
    expect(bad.success).toBe(false);
  });
});

describe("adminPageSchema", () => {
  it("validates a paged response", () => {
    const schema = adminPageSchema(adminOrderSummarySchema);
    const ok = schema.safeParse({
      content: [
        {
          internalOrderId: 1,
          externalOrderId: "EXT-1",
          status: "DELIVERED",
          paymentType: "PREPAID",
          customerName: "A",
          customerMobile: "9000000000",
          amountPayable: 250.5,
          bookingDate: "2026-05-01",
          updatedAt: "2026-05-15T10:00:00Z",
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 25,
    });
    expect(ok.success).toBe(true);
  });
});
