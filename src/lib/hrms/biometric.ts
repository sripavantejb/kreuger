/**
 * Biometric / eSSL integration abstraction.
 *
 * Today this returns mock data. Replace the MockBiometricService implementation
 * with a real eSSL client when hardware credentials are available — callers
 * should depend only on BiometricService.
 */

import type { BiometricDevice, BiometricPunch, SyncLog } from "./types";
import { BIOMETRIC_DEVICE, BIOMETRIC_PUNCHES, SYNC_LOGS } from "./mock-data";

export interface BiometricService {
  getDevice(): Promise<BiometricDevice>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  syncNow(): Promise<{ ok: boolean; punchesImported: number; message: string }>;
  getPunches(opts?: { since?: string; employeeId?: string }): Promise<BiometricPunch[]>;
  getSyncLogs(): Promise<SyncLog[]>;
  isDemoMode(): boolean;
}

class MockBiometricService implements BiometricService {
  isDemoMode() {
    return true;
  }

  async getDevice(): Promise<BiometricDevice> {
    return { ...BIOMETRIC_DEVICE };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message: "Demo Mode — connection simulated successfully to eSSL X990.",
    };
  }

  async syncNow(): Promise<{ ok: boolean; punchesImported: number; message: string }> {
    const todayPunches = BIOMETRIC_PUNCHES.filter((p) => p.punchedAt.startsWith("2026-09-12"));
    return {
      ok: true,
      punchesImported: todayPunches.length,
      message: `Demo Mode — Attendance is being generated from mock biometric data. Imported ${todayPunches.length} punches.`,
    };
  }

  async getPunches(opts?: { since?: string; employeeId?: string }): Promise<BiometricPunch[]> {
    let rows = [...BIOMETRIC_PUNCHES];
    if (opts?.employeeId) rows = rows.filter((p) => p.employeeId === opts.employeeId);
    if (opts?.since) rows = rows.filter((p) => p.punchedAt >= opts.since!);
    return rows.sort((a, b) => b.punchedAt.localeCompare(a.punchedAt));
  }

  async getSyncLogs(): Promise<SyncLog[]> {
    return [...SYNC_LOGS];
  }
}

/** Singleton — swap this factory when wiring real eSSL. */
export const biometricService: BiometricService = new MockBiometricService();
