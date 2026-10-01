/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Fingerprint,
  ScanFace,
  Lock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics.ts';
import { biometricService } from '../services/biometricService.ts';
import { userService } from '../services/userService.ts';
import { useBiometricAuth } from '../hooks/useBiometricAuth.ts';
import { recordBiometricAuditLog } from './AuditTrailView.tsx';

interface SmartBiometricResetModalProps {
  isOpen: boolean;
  initialEmail?: string;
  initialPassword?: string;
  onClose: () => void;
  onResetComplete: (email: string, resetType: 'FACE' | 'FINGERPRINT' | 'ALL') => void;
  onNavigateEnroll: (method: 'FACE' | 'FINGERPRINT') => void;
}

export const SmartBiometricResetModal: React.FC<SmartBiometricResetModalProps> = ({
  isOpen,
  initialEmail = '',
  initialPassword = '',
  onClose,
  onResetComplete,
  onNavigateEnroll,
}) => {
  const [emailInput, setEmailInput] = useState<string>(initialEmail);
  const [passwordInput, setPasswordInput] = useState<string>(initialPassword);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [userStatusError, setUserStatusError] = useState<string | null>(null);

  // User Enrollment Status
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [hasFaceId, setHasFaceId] = useState<boolean>(false);
  const [hasFingerprint, setHasFingerprint] = useState<boolean>(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ isLocked: boolean; remainingSec: number } | null>(null);

  // Selection & Execution
  const [selectedTarget, setSelectedTarget] = useState<'FACE' | 'FINGERPRINT' | 'ALL'>('FACE');
  const [step, setStep] = useState<'DISCOVER' | 'CONFIRM' | 'SUCCESS'>('DISCOVER');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const { removeBiometric, refreshEnrolledStatus } = useBiometricAuth();

  // On open or email change, inspect user status
  useEffect(() => {
    if (isOpen) {
      setEmailInput(initialEmail);
      setPasswordInput(initialPassword);
      setStep('DISCOVER');
      setExecutionError(null);
      setSuccessNotice(null);
      if (initialEmail.trim()) {
        checkUserBiometricStatus(initialEmail.trim());
      } else {
        setUserExists(null);
        setHasFaceId(false);
        setHasFingerprint(false);
      }
    }
  }, [isOpen, initialEmail, initialPassword]);

  const checkUserBiometricStatus = async (emailToCheck: string) => {
    const norm = emailToCheck.toLowerCase().trim();
    if (!norm) {
      setUserStatusError('Please enter a valid corporate email address.');
      setUserExists(null);
      return;
    }

    setIsLoadingStatus(true);
    setUserStatusError(null);

    try {
      let stateData: any = null;
      try {
        const res = await fetch(`/api/auth/biometrics/lifecycle/${encodeURIComponent(norm)}`);
        if (res.ok) {
          stateData = await res.json();
        }
      } catch {}

      if (!stateData) {
        stateData = biometricService.getBiometricUserState(norm);
      }

      const user = userService.getByEmail(norm);
      if (!user) {
        setUserExists(false);
        setUserStatusError(`Account "${norm}" was not found in the Oromia Bank directory.`);
        setHasFaceId(false);
        setHasFingerprint(false);
        setIsLoadingStatus(false);
        return;
      }

      setUserExists(true);
      setUserName(user.name);
      setUserRole(user.role);

      const faceEnrolled =
        stateData.faceState === 'ACTIVE' ||
        stateData.faceState === 'ENROLLED' ||
        Boolean(user.biometricCredentials?.some((c) => c.type === 'FACE')) ||
        Boolean(stateData.credentials?.some((c: any) => c.type === 'FACE' && c.status === 'ENROLLED'));

      const fpEnrolled =
        stateData.fingerprintState === 'ACTIVE' ||
        stateData.fingerprintState === 'ENROLLED' ||
        Boolean(user.biometricCredentials?.some((c) => c.type === 'FINGERPRINT')) ||
        Boolean(stateData.credentials?.some((c: any) => c.type === 'FINGERPRINT' && c.status === 'ENROLLED'));

      setHasFaceId(faceEnrolled);
      setHasFingerprint(fpEnrolled);

      if (stateData.rateLimit?.isLocked) {
        setRateLimitInfo({
          isLocked: true,
          remainingSec: stateData.rateLimit.remainingLockoutSec || 900,
        });
      } else {
        setRateLimitInfo(null);
      }

      // Default selection to available enrolled option
      if (faceEnrolled && !fpEnrolled) {
        setSelectedTarget('FACE');
      } else if (!faceEnrolled && fpEnrolled) {
        setSelectedTarget('FINGERPRINT');
      } else if (faceEnrolled && fpEnrolled) {
        setSelectedTarget('ALL');
      }
    } catch (err: any) {
      setUserStatusError(err?.message || 'Failed to inspect biometric lifecycle status.');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleExecuteReset = async () => {
    const norm = emailInput.toLowerCase().trim();
    if (!norm) {
      setExecutionError('Corporate email is required.');
      return;
    }
    if (!passwordInput) {
      setExecutionError('Step-up password authentication is strictly required by NBE BSD/03/2020.');
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);

    try {
      // 1. Authoritative password verification & token request
      let reqResult: any = null;
      try {
        const reqRes = await fetch('/api/auth/biometrics/reset/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: norm,
            type: selectedTarget,
            password: passwordInput,
            reason: `Self-service biometric reset by officer (${selectedTarget})`,
          }),
        });
        reqResult = await reqRes.json();
      } catch {}

      if (!reqResult) {
        reqResult = biometricService.requestReset(
          norm,
          selectedTarget,
          passwordInput,
          `Self-service biometric reset (${selectedTarget})`
        );
      }

      if (!reqResult.success || !reqResult.resetToken) {
        throw new Error(reqResult.message || 'Invalid institutional password or authorization failed.');
      }

      // 2. Token consumption and revocation execution
      let execResult: any = null;
      try {
        const execRes = await fetch('/api/auth/biometrics/reset/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: norm,
            resetToken: reqResult.resetToken,
          }),
        });
        execResult = await execRes.json();
      } catch {}

      if (!execResult) {
        execResult = biometricService.executeReset(norm, reqResult.resetToken);
      }

      if (!execResult.success) {
        throw new Error(execResult.message || 'Failed to execute credential revocation.');
      }

      // 3. Local storage cleanup & synchronization
      removeBiometric(norm);
      refreshEnrolledStatus();

      // Synchronize client userService
      const user = userService.getByEmail(norm);
      if (user && user.biometricCredentials) {
        if (selectedTarget === 'ALL') {
          user.biometricCredentials = [];
        } else {
          user.biometricCredentials = user.biometricCredentials.filter((c) => c.type !== selectedTarget);
        }
      }

      // 4. Record Audit Log
      await recordBiometricAuditLog({
        actorId: norm,
        actorName: userName || norm,
        actorRole: userRole || 'MAKER',
        action: 'BIOMETRIC_PREFERENCE_DISABLED',
        type: selectedTarget === 'ALL' ? 'FINGERPRINT' : selectedTarget,
        entityId: norm,
        details: `[NBE Directive BSD/03/2020 Compliance] Officer executed authenticated biometric reset for ${selectedTarget}. Prior credentials revoked and purged.`,
      });

      triggerHaptic('success');
      setSuccessNotice(
        `Biometric passkeys (${selectedTarget === 'ALL' ? 'Face ID and Fingerprint' : selectedTarget === 'FACE' ? 'Face ID Profile' : 'Fingerprint Passkey'}) were permanently revoked and cleared from this device.`
      );
      setStep('SUCCESS');
      onResetComplete(norm, selectedTarget);
    } catch (err: any) {
      setExecutionError(err?.message || 'Biometric reset failed.');
      triggerHaptic('error');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] overflow-y-auto transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Smart Biometric Reset</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono font-bold rounded">
                  NBE BSD/03/2020
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Context-aware revocation & passkey re-enrollment
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {step === 'DISCOVER' && (
            <div className="space-y-4">
              {/* Account Identifier Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Officer Corporate Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') checkUserBiometricStatus(emailInput);
                    }}
                    placeholder="e.g. abebe.kebede@oromiabank.com"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ob-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => checkUserBiometricStatus(emailInput)}
                    disabled={isLoadingStatus || !emailInput.trim()}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-ob-indigo-600 hover:bg-ob-indigo-700 text-white transition-all cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                  >
                    {isLoadingStatus ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Inspect</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Alert or Error */}
              {userStatusError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">{userStatusError}</p>
                </div>
              )}

              {rateLimitInfo && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    Account is locked due to consecutive authentication failures. Providing valid institutional password below will authorize reset and unlock the account.
                  </p>
                </div>
              )}

              {/* Verified Account Details & Enrollment Status Cards */}
              {userExists && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{userName}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {emailInput.toLowerCase().trim()} • {userRole}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                      Verified Account
                    </span>
                  </div>

                  {/* Enrollment Status Assessment */}
                  {!hasFaceId && !hasFingerprint ? (
                    /* Scenario A: Neither biometric enrolled */
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2.5">
                      <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          No Biometrics Enrolled Yet
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug max-w-xs mx-auto mt-0.5">
                          {userName} currently has no active Face ID or WebAuthn passkeys registered. Reset is not necessary.
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateEnroll('FACE');
                          }}
                          className="flex-1 py-2 px-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <ScanFace className="w-3.5 h-3.5" />
                          <span>Enroll Face ID</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateEnroll('FINGERPRINT');
                          }}
                          className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          <span>Enroll Fingerprint</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Scenarios B, C, D: At least one enrolled */
                    <div className="space-y-2.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Select Biometric Credential to Reset:
                      </label>

                      <div className="space-y-2">
                        {/* Option 1: Face ID */}
                        <label
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            !hasFaceId
                              ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                              : selectedTarget === 'FACE'
                              ? 'bg-rose-500/10 border-rose-500/60 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="resetTarget"
                              value="FACE"
                              disabled={!hasFaceId}
                              checked={selectedTarget === 'FACE'}
                              onChange={() => setSelectedTarget('FACE')}
                              className="accent-rose-600"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <ScanFace className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span className="font-bold text-xs text-slate-900 dark:text-white">Face ID Profile</span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                                {hasFaceId ? 'Active template registered in NBE vault' : 'Not currently enrolled'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              hasFaceId
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {hasFaceId ? 'ENROLLED' : 'UNENROLLED'}
                          </span>
                        </label>

                        {/* Option 2: Fingerprint */}
                        <label
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            !hasFingerprint
                              ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                              : selectedTarget === 'FINGERPRINT'
                              ? 'bg-rose-500/10 border-rose-500/60 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="resetTarget"
                              value="FINGERPRINT"
                              disabled={!hasFingerprint}
                              checked={selectedTarget === 'FINGERPRINT'}
                              onChange={() => setSelectedTarget('FINGERPRINT')}
                              className="accent-rose-600"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-bold text-xs text-slate-900 dark:text-white">WebAuthn Passkey</span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                                {hasFingerprint ? 'Hardware authenticator bound' : 'Not currently enrolled'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              hasFingerprint
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {hasFingerprint ? 'ENROLLED' : 'UNENROLLED'}
                          </span>
                        </label>

                        {/* Option 3: Both (if both enrolled) */}
                        {hasFaceId && hasFingerprint && (
                          <label
                            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                              selectedTarget === 'ALL'
                                ? 'bg-rose-500/15 border-rose-500/70 shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="resetTarget"
                                value="ALL"
                                checked={selectedTarget === 'ALL'}
                                onChange={() => setSelectedTarget('ALL')}
                                className="accent-rose-600"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <RotateCcw className="w-4 h-4 text-rose-600" />
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    Purge All Biometrics
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                                  Revoke both Face ID profile and platform passkeys
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              COMPLETE WIPE
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Step-Up Institutional Password Input */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Institutional Password (Step-Up Security)</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Required</span>
                        </label>
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Enter your institutional password to authorize reset"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      {executionError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{executionError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleExecuteReset}
                        disabled={isExecuting || !passwordInput}
                        className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-press"
                      >
                        {isExecuting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying & Revoking Passkeys...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Authorize & Reset {selectedTarget}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Biometric Reset Successful
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed mt-1">
                  {successNotice}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account:</span>
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{emailInput}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Revocation Scope:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{selectedTarget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Audit Reference:</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    OB-NBE-REV-{Date.now().toString(16).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateEnroll(selectedTarget === 'FINGERPRINT' ? 'FINGERPRINT' : 'FACE');
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer touch-press transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Re-Enroll Fresh Biometrics</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
