/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHASE 19 ACCEPTANCE TEST SUITE: Context-Aware Biometric Reset & Enrollment Discovery
 * Compliance: NBE Directive BSD/03/2020 & 19_CONTEXT_AWARE_BIOMETRIC_RESET_AND_ENROLLMENT_DISCOVERY.md
 */

import { biometricService } from '../services/biometricService.ts';
import { userService } from '../services/userService.ts';

function assert(condition: any, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

export async function runPhase19ContextAwareBiometricResetTests() {
  console.log('\n========================================================================');
  console.log('--- PHASE 19: CONTEXT-AWARE BIOMETRIC RESET & ENROLLMENT SUITE ---');
  console.log('========================================================================\n');

  console.log('--- 1. Discovery Assessment for Non-Enrolled User ---');
  const freshEmail = `fresh_officer_${Date.now()}@oromiabank.com`;
  const reg1 = userService.register({
    email: freshEmail,
    name: 'Aster Aweke',
    role: 'CHECKER',
    department: 'Internal Audit & Regulatory Control',
  });
  if (reg1.user) userService.updateUserStatus(reg1.user.id, 'ACTIVE', 'Super Admin');

  const freshState = biometricService.getBiometricUserState(freshEmail);
  assert(freshState.faceState === 'NOT_ENROLLED', 'Fresh officer has faceState NOT_ENROLLED');
  assert(freshState.fingerprintState === 'NOT_ENROLLED', 'Fresh officer has fingerprintState NOT_ENROLLED');
  assert(freshState.credentials.length === 0, 'Zero credentials registered');

  console.log('\n--- 2. Face ID Only Enrolled Officer Scenario ---');
  const faceOnlyEmail = `face_only_${Date.now()}@oromiabank.com`;
  const reg2 = userService.register({
    email: faceOnlyEmail,
    name: 'Solomon Bogale',
    role: 'MAKER',
    department: 'Trade Services & Foreign Exchange',
  });
  if (reg2.user) userService.updateUserStatus(reg2.user.id, 'ACTIVE', 'Super Admin');

  const faceCh = biometricService.createChallenge(faceOnlyEmail, 'FACE', 'REGISTRATION');
  const faceEnroll = biometricService.enrollFaceBiometric(
    faceOnlyEmail,
    faceCh.id,
    'face_optical_135_130_125_lum_130_dim_640x480'
  );
  assert(faceEnroll.success, 'Face ID enrolled for officer');

  const faceOnlyState = biometricService.getBiometricUserState(faceOnlyEmail);
  assert(faceOnlyState.faceState === 'ENROLLED' || faceOnlyState.faceState === 'ACTIVE', 'Face state is ENROLLED');
  assert(faceOnlyState.fingerprintState === 'NOT_ENROLLED', 'Fingerprint state is NOT_ENROLLED');

  // Request reset for FACE with valid password
  const resetFaceReq = biometricService.requestReset(faceOnlyEmail, 'FACE', 'password', 'Camera upgrade');
  assert(resetFaceReq.success, 'Step-up authorized reset request succeeds for Face ID');
  assert(Boolean(resetFaceReq.resetToken), 'One-time resetToken issued');

  // Execute reset
  const execFaceReset = biometricService.executeReset(faceOnlyEmail, resetFaceReq.resetToken!);
  assert(execFaceReset.success, 'Face ID reset executes successfully');
  assert(execFaceReset.revokedCount === 1, 'Exactly 1 face credential revoked');

  const afterFaceResetState = biometricService.getBiometricUserState(faceOnlyEmail);
  assert(afterFaceResetState.faceState === 'NOT_ENROLLED', 'Face ID state transitioned back to NOT_ENROLLED');

  console.log('\n--- 3. WebAuthn Fingerprint Only Enrolled Officer Scenario ---');
  const fpOnlyEmail = `fp_only_${Date.now()}@oromiabank.com`;
  const reg3 = userService.register({
    email: fpOnlyEmail,
    name: 'Derartu Tulu',
    role: 'AUDITOR',
    department: 'Compliance & Legal Governance',
  });
  if (reg3.user) userService.updateUserStatus(reg3.user.id, 'ACTIVE', 'Super Admin');

  const fpCh = biometricService.createChallenge(fpOnlyEmail, 'FINGERPRINT', 'REGISTRATION');
  const fpReg = biometricService.verifyWebAuthnRegistration(
    fpOnlyEmail,
    fpCh.id,
    {
      credentialId: `raw_fp_${Date.now()}`,
      publicKeyPem: 'PUBLIC_KEY_PEM_DATA',
      counter: 0,
      deviceLabel: 'YubiKey 5 FIDO2 USB-C Authenticator',
    }
  );
  assert(fpReg.success, 'WebAuthn passkey registered');

  const fpOnlyState = biometricService.getBiometricUserState(fpOnlyEmail);
  assert(fpOnlyState.fingerprintState === 'ENROLLED' || fpOnlyState.fingerprintState === 'ACTIVE', 'Fingerprint state is ENROLLED');
  assert(fpOnlyState.faceState === 'NOT_ENROLLED', 'Face state is NOT_ENROLLED');

  // Reset FINGERPRINT
  const resetFpReq = biometricService.requestReset(fpOnlyEmail, 'FINGERPRINT', 'password', 'Key replaced');
  assert(resetFpReq.success, 'Step-up reset request succeeds for Fingerprint');
  const execFpReset = biometricService.executeReset(fpOnlyEmail, resetFpReq.resetToken!);
  assert(execFpReset.success, 'Fingerprint credential revoked successfully');

  console.log('\n--- 4. Multi-Modal Officer Scenario (Both Enrolled -> Selective or ALL Reset) ---');
  const dualEmail = `dual_bio_${Date.now()}@oromiabank.com`;
  const reg4 = userService.register({
    email: dualEmail,
    name: 'Kenenisa Bekele',
    role: 'MAKER',
    department: 'Credit Operations & Portfolio Management',
  });
  if (reg4.user) userService.updateUserStatus(reg4.user.id, 'ACTIVE', 'Super Admin');

  const dualFaceCh = biometricService.createChallenge(dualEmail, 'FACE', 'REGISTRATION');
  biometricService.enrollFaceBiometric(dualEmail, dualFaceCh.id, 'face_optical_142_138_130_lum_136');
  const dualFpCh = biometricService.createChallenge(dualEmail, 'FINGERPRINT', 'REGISTRATION');
  biometricService.verifyWebAuthnRegistration(dualEmail, dualFpCh.id, {
    credentialId: `raw_dual_${Date.now()}`,
    publicKeyPem: 'PUBKEY',
    counter: 0,
    deviceLabel: 'Touch ID',
  });

  const dualState = biometricService.getBiometricUserState(dualEmail);
  assert(dualState.faceState === 'ENROLLED' || dualState.faceState === 'ACTIVE', 'Dual user face is ENROLLED');
  assert(dualState.fingerprintState === 'ENROLLED' || dualState.fingerprintState === 'ACTIVE', 'Dual user fingerprint is ENROLLED');

  // Execute ALL reset
  const resetAllReq = biometricService.requestReset(dualEmail, 'ALL', 'password', 'Complete hardware re-provisioning');
  assert(resetAllReq.success, 'Reset request for ALL biometrics authorized');
  const execAllReset = biometricService.executeReset(dualEmail, resetAllReq.resetToken!);
  assert(execAllReset.success, 'ALL biometrics wiped cleanly');
  assert(execAllReset.revokedCount === 2, 'Both Face and Fingerprint credentials revoked (count 2)');

  const afterAllState = biometricService.getBiometricUserState(dualEmail);
  assert(afterAllState.faceState === 'NOT_ENROLLED', 'Face state cleared');
  assert(afterAllState.fingerprintState === 'NOT_ENROLLED', 'Fingerprint state cleared');

  console.log('\n--- 5. Step-Up Password Security Enforcement ---');
  // Attempt reset with invalid password
  const badPwAttempt = biometricService.requestReset(freshEmail, 'FACE', 'wrong_password_2026', 'Unauthorized attempt');
  assert(!badPwAttempt.success, 'Reset request with invalid password is strictly rejected');
  assert(badPwAttempt.message?.includes('password') || badPwAttempt.message?.includes('Invalid'), 'Clear step-up failure message returned');

  console.log('\n========================================================================');
  console.log('✅ ALL PHASE 19 CONTEXT-AWARE BIOMETRIC RESET TESTS PASSED');
  console.log('========================================================================\n');
}
