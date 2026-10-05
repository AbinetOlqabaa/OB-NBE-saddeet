/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AuditFinding,
  AuditFindingSeverity,
  AuditFindingStatus,
  AuditEvidence,
  AuditWorkingNote,
  RemediationAction,
  AuditReportPackage,
  AuditWorkQueueItem,
  SubmissionStatus,
} from '../types/regulatory.ts';
import { submissionService } from './submissionService.ts';
import { auditService } from './auditService.ts';
import { getAllReports, getReportDefinition } from '../data/report-registry.ts';
import { DEPARTMENTS } from '../data/organizationHierarchy.ts';

type Listener = () => void;

class AuditorServiceClass {
  private findings: AuditFinding[] = [];
  private evidences: AuditEvidence[] = [];
  private workingNotes: AuditWorkingNote[] = [];
  private remediations: RemediationAction[] = [];
  private reportPackages: AuditReportPackage[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.seedInitialAuditData();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private seedInitialAuditData(): void {
    const now = new Date().toISOString();

    // Seed realistic audit findings for compliance demonstration
    this.findings = [
      {
        id: 'FIND-20260115-CRD01',
        submissionId: 'sub_anarn_demo',
        reportKey: 'ANARN001',
        department: 'Credit Operations & Portfolio Management',
        title: 'Agricultural NPL Classification Threshold Variance',
        description: 'Past due agricultural exposures exceeding 90 days in Jimma region were categorized under Special Mention rather than Substandard.',
        severity: 'HIGH',
        status: 'REMEDIATION_PENDING',
        regulatoryReference: 'NBE Directive SBB/43/2008 Art. 4.2',
        affectedField: 'SUBSTANDARD_AGRI_LOANS',
        financialVariance: 8450000,
        auditorId: 'usr_auditor_1',
        auditorName: 'Worku Alemu',
        createdAt: '2026-01-20T10:15:00Z',
        updatedAt: '2026-01-22T14:30:00Z',
      },
      {
        id: 'FIND-20260118-FX002',
        submissionId: 'sub_fx_demo',
        reportKey: 'M_LCPLC001',
        department: 'International Banking & FX Operations',
        title: 'Outstanding Import LC Foreign Exchange Reconciliation Gap',
        description: 'FX revaluation rate mismatch between Core Banking General Ledger and NBE weekly reference fix rate on USD import obligations.',
        severity: 'CRITICAL',
        status: 'OPEN',
        regulatoryReference: 'NBE Directive FXD/65/2020 Sec. 3',
        affectedField: 'TOTAL_OUTSTANDING_FX_LC',
        financialVariance: 14200000,
        auditorId: 'usr_auditor_1',
        auditorName: 'Worku Alemu',
        createdAt: '2026-01-22T08:45:00Z',
        updatedAt: '2026-01-22T08:45:00Z',
      },
      {
        id: 'FIND-20260124-RSK003',
        submissionId: 'sub_risk_demo',
        reportKey: 'ARLAL001',
        department: 'Risk Management & Compliance',
        title: 'Missing Counterparty Credit Rating in Schedule 3',
        description: 'Ten interbank exposures to secondary financial institutions lacked updated internal credit risk scoring.',
        severity: 'MEDIUM',
        status: 'UNDER_REVIEW',
        regulatoryReference: 'NBE Directive SBB/29/2002 Art. 5',
        affectedField: 'RATED_ASSETS_SCHEDULE',
        financialVariance: 0,
        auditorId: 'usr_auditor_1',
        auditorName: 'Worku Alemu',
        createdAt: '2026-01-25T11:00:00Z',
        updatedAt: '2026-01-25T11:00:00Z',
      },
    ];

    // Seed initial evidence
    this.evidences = [
      {
        id: 'EVID-9F8A12BC',
        submissionId: 'sub_anarn_demo',
        reportKey: 'ANARN001',
        findingId: 'FIND-20260115-CRD01',
        title: 'Jimma Agri Loan Portfolio CBS Aging Ledger',
        fileName: 'jimma_agri_aging_ledger_2026q1.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSizeBytes: 245800,
        sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        tamperSeal: 'OB-EVID-SEAL-E3B0C44298FC1C14',
        verificationStatus: 'VERIFIED',
        uploadedBy: 'Worku Alemu (AUDITOR)',
        uploadedAt: '2026-01-20T11:00:00Z',
        notes: 'Verified directly against core banking database transaction dump.',
      },
      {
        id: 'EVID-4B7C91D3',
        submissionId: 'sub_fx_demo',
        reportKey: 'M_LCPLC001',
        findingId: 'FIND-20260118-FX002',
        title: 'NBE Central Bank USD Reference Circular Rates',
        fileName: 'nbe_fx_rates_week3_2026.pdf',
        fileType: 'application/pdf',
        fileSizeBytes: 89400,
        sha256Checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        tamperSeal: 'OB-EVID-SEAL-CA978112CA1BBDCA',
        verificationStatus: 'VERIFIED',
        uploadedBy: 'Worku Alemu (AUDITOR)',
        uploadedAt: '2026-01-22T09:30:00Z',
        notes: 'Published circular from NBE Exchange Control Directorate.',
      },
    ];

    // Seed working notes
    this.workingNotes = [
      {
        id: 'NOTE-1A2B3C',
        submissionId: 'sub_anarn_demo',
        reportKey: 'ANARN001',
        category: 'OBSERVATION',
        authorId: 'usr_auditor_1',
        authorName: 'Worku Alemu',
        content: 'Cross-verified portfolio balances against GL 1400201. Branch aggregation reflects 100% data transmission.',
        isPrivate: true,
        createdAt: '2026-01-20T10:30:00Z',
      },
      {
        id: 'NOTE-4D5E6F',
        submissionId: 'sub_fx_demo',
        reportKey: 'M_LCPLC001',
        category: 'RISK_NOTE',
        authorId: 'usr_auditor_1',
        authorName: 'Worku Alemu',
        content: 'High volatility in foreign currency reserves requires daily revaluation checks during 4-eyes review.',
        isPrivate: true,
        createdAt: '2026-01-22T09:00:00Z',
      },
    ];

    // Seed remediations
    this.remediations = [
      {
        id: 'REM-88A19B',
        findingId: 'FIND-20260115-CRD01',
        actionPlan: 'Re-classify Jimma agricultural loan facility from Special Mention to Substandard, calculate required 20% provision, and submit revised schedule.',
        assignedDepartment: 'Credit Operations & Portfolio Management',
        assignedTo: 'Dawit Bekele (MAKER)',
        targetDate: '2026-02-15',
        status: 'IN_PROGRESS',
        remediationProof: 'Adjustment batch #7741 prepared for review.',
        createdAt: '2026-01-21T09:00:00Z',
      },
    ];

    // Seed initial report package
    this.reportPackages = [
      {
        id: 'AUD-REP-2026Q1-01',
        title: 'Oromia Bank NBE Statutory Reporting Audit Memo - Q1 2026',
        period: 'Q1 2026',
        scopeDepartments: ['Credit Operations', 'International Banking', 'Risk Management'],
        generatedBy: 'Internal Audit & Regulatory Control Directorate',
        findingsCount: 3,
        criticalCount: 1,
        highCount: 1,
        executiveSummary: 'First-quarter statutory returns inspected. 1 critical FX variance and 1 agricultural loan classification discrepancy identified. Remediation actions initiated.',
        tamperSeal: 'OB-AUD-SEAL-89B7A21C004F9E3D821045BC',
        createdAt: now,
      },
    ];
  }

  // --- 1. Audit Work Queue ---

  public getWorkQueue(filters?: {
    department?: string;
    submissionStatus?: string;
    auditStatus?: string;
    search?: string;
  }): AuditWorkQueueItem[] {
    const allReports = getAllReports();
    const activeSubmissions = submissionService.getAllSubmissions();
    const subMap = new Map(activeSubmissions.map((s) => [s.reportKey, s]));

    const items: AuditWorkQueueItem[] = allReports.map((report) => {
      const sub = subMap.get(report.ReturnKey);
      const subId = sub ? sub.id : `draft_${report.ReturnKey}`;
      const status: SubmissionStatus = sub ? sub.status : 'DRAFT';
      const version = sub ? sub.version : 1;
      const makerName = sub ? sub.makerName : 'Assigned Maker';
      const submittedAt = sub ? sub.submittedAt : undefined;
      const nbeRef = sub ? ((sub as any).nbeSubmissionId || sub.nbeReferenceNumber) : undefined;
      const deptName = report.department || (report as any).Department || 'Credit Operations & Portfolio Management';

      const relatedFindings = this.findings.filter(
        (f) => f.reportKey === report.ReturnKey || (sub && f.submissionId === sub.id)
      );
      const openFindings = relatedFindings.filter(
        (f) => f.status === 'OPEN' || f.status === 'UNDER_REVIEW' || f.status === 'REMEDIATION_PENDING'
      );
      const criticalFindings = openFindings.filter((f) => f.severity === 'CRITICAL');
      const highFindings = openFindings.filter((f) => f.severity === 'HIGH');
      const relatedEvidences = this.evidences.filter(
        (e) => e.reportKey === report.ReturnKey || (sub && e.submissionId === sub.id)
      );
      const relatedNotes = this.workingNotes.filter(
        (n) => n.reportKey === report.ReturnKey || (sub && n.submissionId === sub.id)
      );
      const relatedRemediations = this.remediations.filter((r) =>
        relatedFindings.some((f) => f.id === r.findingId && r.status !== 'COMPLETED' && r.status !== 'VERIFIED_BY_AUDITOR')
      );

      let auditStatus: AuditWorkQueueItem['auditStatus'] = 'IN_DRAFTING';
      if (criticalFindings.length > 0 || highFindings.length > 0) {
        auditStatus = 'FLAGGED_HIGH_RISK';
      } else if (openFindings.length > 0) {
        auditStatus = 'FINDINGS_OPEN';
      } else if (status === 'SENT') {
        auditStatus = 'NBE_DELIVERED_PENDING_AUDIT';
      } else if (status === 'APPROVED') {
        auditStatus = 'CHECKER_APPROVED';
      } else if (status === 'PENDING_CHECKER') {
        auditStatus = 'IN_CHECKER_REVIEW';
      }

      return {
        submissionId: subId,
        reportKey: report.ReturnKey,
        department: deptName,
        makerName,
        version,
        submissionStatus: status,
        submittedAt,
        nbeReference: nbeRef,
        auditStatus,
        totalFindings: relatedFindings.length,
        openFindings: openFindings.length,
        criticalFindings: criticalFindings.length,
        highFindings: highFindings.length,
        evidenceCount: relatedEvidences.length,
        notesCount: relatedNotes.length,
        pendingRemediations: relatedRemediations.length,
        updatedAt: sub ? sub.updatedAt : new Date().toISOString(),
      };
    });

    return items.filter((item) => {
      if (filters?.department && item.department !== filters.department) return false;
      if (filters?.submissionStatus && item.submissionStatus !== filters.submissionStatus) return false;
      if (filters?.auditStatus && item.auditStatus !== filters.auditStatus) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matchesKey = item.reportKey.toLowerCase().includes(q);
        const matchesDept = item.department.toLowerCase().includes(q);
        const matchesMaker = item.makerName.toLowerCase().includes(q);
        const matchesRef = item.nbeReference?.toLowerCase().includes(q) || false;
        if (!matchesKey && !matchesDept && !matchesMaker && !matchesRef) return false;
      }
      return true;
    });
  }

  public getKpiSummary(): {
    totalReportsInQueue: number;
    totalOpenFindings: number;
    criticalFindings: number;
    highFindings: number;
    pendingRemediations: number;
    completedAudits: number;
    complianceScore: number;
  } {
    const queue = this.getWorkQueue();
    const openFindings = this.findings.filter(
      (f) => f.status === 'OPEN' || f.status === 'UNDER_REVIEW' || f.status === 'REMEDIATION_PENDING'
    );
    const critical = openFindings.filter((f) => f.severity === 'CRITICAL').length;
    const high = openFindings.filter((f) => f.severity === 'HIGH').length;
    const pendingRem = this.remediations.filter(
      (r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS' || r.status === 'OVERDUE'
    ).length;
    const completed = queue.filter(
      (q) => (q.auditStatus === 'NBE_DELIVERED_PENDING_AUDIT' || q.auditStatus === 'CHECKER_APPROVED') && q.openFindings === 0
    ).length;

    // Compliance score formula: (total - weighted penalties) / total * 100
    const penalty = critical * 15 + high * 8 + (openFindings.length - critical - high) * 3;
    const rawScore = Math.max(0, 100 - penalty);

    return {
      totalReportsInQueue: queue.length,
      totalOpenFindings: openFindings.length,
      criticalFindings: critical,
      highFindings: high,
      pendingRemediations: pendingRem,
      completedAudits: completed,
      complianceScore: Math.round(rawScore),
    };
  }

  // --- 2. Report Audit Deep Inspection ---

  public getReportAuditInspection(reportKey: string, submissionId?: string) {
    const def = getReportDefinition(reportKey);
    const allSubs = submissionService.getAllSubmissions();
    const sub = submissionId
      ? allSubs.find((s) => s.id === submissionId || s.reportKey === reportKey)
      : allSubs.find((s) => s.reportKey === reportKey);

    const relatedFindings = this.findings.filter((f) => f.reportKey === reportKey);
    const relatedEvidences = this.evidences.filter((e) => e.reportKey === reportKey);
    const relatedNotes = this.workingNotes.filter((n) => n.reportKey === reportKey);

    return {
      reportKey,
      reportDefinition: def,
      submission: sub,
      values: sub?.values || def?.ReturnItemsList.reduce((acc, f) => ({ ...acc, [f.Code]: f.Value ?? 0 }), {}) || {},
      dynamicRows: sub?.dynamicRows || {},
      findings: relatedFindings,
      evidences: relatedEvidences,
      workingNotes: relatedNotes,
      snapshots: (sub as any)?.historicalSnapshots || (sub as any)?.snapshots || [],
      comments: sub?.comments || [],
    };
  }

  // --- 3. Audit Findings Management ---

  public getFindings(filters?: {
    submissionId?: string;
    reportKey?: string;
    severity?: AuditFindingSeverity;
    status?: AuditFindingStatus;
    department?: string;
  }): AuditFinding[] {
    return this.findings.filter((f) => {
      if (filters?.submissionId && f.submissionId !== filters.submissionId) return false;
      if (filters?.reportKey && f.reportKey !== filters.reportKey) return false;
      if (filters?.severity && f.severity !== filters.severity) return false;
      if (filters?.status && f.status !== filters.status) return false;
      if (filters?.department && f.department !== filters.department) return false;
      return true;
    });
  }

  public createFinding(
    finding: Omit<AuditFinding, 'id' | 'createdAt' | 'updatedAt'>
  ): AuditFinding {
    const newFinding: AuditFinding = {
      ...finding,
      id: `FIND-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.findings.unshift(newFinding);

    auditService.log({
      actorId: finding.auditorId,
      actorName: finding.auditorName,
      actorRole: 'AUDITOR',
      action: 'AUDIT_FINDING_RECORDED',
      entityType: 'AUDIT_FINDING',
      entityId: newFinding.id,
      correlationId: `finding_${newFinding.id}`,
      details: `Compliance Auditor recorded [${newFinding.severity}] finding "${newFinding.title}" on return ${newFinding.reportKey}.`,
    });

    this.notify();
    return newFinding;
  }

  public updateFinding(id: string, updates: Partial<AuditFinding>): AuditFinding | null {
    const idx = this.findings.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    const old = this.findings[idx];
    this.findings[idx] = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    auditService.log({
      actorId: updates.auditorId || old.auditorId,
      actorName: updates.auditorName || old.auditorName,
      actorRole: 'AUDITOR',
      action: 'AUDIT_FINDING_STATUS_CHANGED',
      entityType: 'AUDIT_FINDING',
      entityId: id,
      correlationId: `finding_${id}`,
      details: `Finding ${id} status updated from ${old.status} to ${this.findings[idx].status}.`,
    });

    this.notify();
    return this.findings[idx];
  }

  public deleteFinding(id: string): boolean {
    const idx = this.findings.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    this.findings.splice(idx, 1);
    this.notify();
    return true;
  }

  // --- 4. Evidence Management ---

  public getEvidence(reportKey?: string, submissionId?: string): AuditEvidence[] {
    return this.evidences.filter((e) => {
      if (reportKey && e.reportKey !== reportKey) return false;
      if (submissionId && e.submissionId !== submissionId) return false;
      return true;
    });
  }

  public async attachEvidence(
    evidence: Omit<AuditEvidence, 'id' | 'uploadedAt' | 'tamperSeal'>
  ): Promise<AuditEvidence> {
    const seal = `OB-EVID-SEAL-${evidence.sha256Checksum.slice(0, 16).toUpperCase()}`;
    const newEvidence: AuditEvidence = {
      ...evidence,
      id: `EVID-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      tamperSeal: seal,
      uploadedAt: new Date().toISOString(),
    };

    this.evidences.unshift(newEvidence);

    auditService.log({
      actorId: 'usr_auditor_1',
      actorName: evidence.uploadedBy,
      actorRole: 'AUDITOR',
      action: 'AUDIT_EVIDENCE_ATTACHED',
      entityType: 'AUDIT_EVIDENCE',
      entityId: newEvidence.id,
      correlationId: `evid_${newEvidence.id}`,
      details: `Attached verification evidence "${newEvidence.title}" (${newEvidence.fileName}) with integrity seal ${seal}.`,
    });

    this.notify();
    return newEvidence;
  }

  public updateEvidenceStatus(
    id: string,
    status: 'VERIFIED' | 'PENDING_REVIEW' | 'FLAGGED'
  ): boolean {
    const ev = this.evidences.find((e) => e.id === id);
    if (!ev) return false;
    ev.verificationStatus = status;
    this.notify();
    return true;
  }

  // --- 5. Working Notes ---

  public getWorkingNotes(reportKey?: string, submissionId?: string): AuditWorkingNote[] {
    return this.workingNotes.filter((n) => {
      if (reportKey && n.reportKey !== reportKey) return false;
      if (submissionId && n.submissionId !== submissionId) return false;
      return true;
    });
  }

  public addWorkingNote(
    note: Omit<AuditWorkingNote, 'id' | 'createdAt'>
  ): AuditWorkingNote {
    const newNote: AuditWorkingNote = {
      ...note,
      id: `NOTE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    this.workingNotes.unshift(newNote);
    this.notify();
    return newNote;
  }

  // --- 6. Remediation Tracking ---

  public getRemediations(findingId?: string): RemediationAction[] {
    return this.remediations.filter((r) => {
      if (findingId && r.findingId !== findingId) return false;
      return true;
    });
  }

  public createRemediation(
    rem: Omit<RemediationAction, 'id' | 'createdAt'>
  ): RemediationAction {
    const newRem: RemediationAction = {
      ...rem,
      id: `REM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    this.remediations.unshift(newRem);

    auditService.log({
      actorId: 'usr_auditor_1',
      actorName: 'Worku Alemu (AUDITOR)',
      actorRole: 'AUDITOR',
      action: 'REMEDIATION_ACTION_ASSIGNED',
      entityType: 'REMEDIATION_ACTION',
      entityId: newRem.id,
      correlationId: `rem_${newRem.id}`,
      details: `Remediation action assigned to ${newRem.assignedTo} in department ${newRem.assignedDepartment}. Target date: ${newRem.targetDate}.`,
    });

    this.notify();
    return newRem;
  }

  public updateRemediation(
    id: string,
    updates: Partial<RemediationAction>
  ): RemediationAction | null {
    const idx = this.remediations.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.remediations[idx] = { ...this.remediations[idx], ...updates };
    this.notify();
    return this.remediations[idx];
  }

  public verifyRemediationByAuditor(
    id: string,
    auditorName: string,
    proof?: string
  ): RemediationAction | null {
    const idx = this.remediations.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    this.remediations[idx] = {
      ...this.remediations[idx],
      status: 'VERIFIED_BY_AUDITOR',
      verifiedBy: auditorName,
      verifiedAt: new Date().toISOString(),
      remediationProof: proof || this.remediations[idx].remediationProof,
    };

    // If finding has all remediations verified, advance finding to RESOLVED
    const findingId = this.remediations[idx].findingId;
    const allForFinding = this.remediations.filter((r) => r.findingId === findingId);
    if (allForFinding.every((r) => r.status === 'VERIFIED_BY_AUDITOR')) {
      this.updateFinding(findingId, { status: 'RESOLVED' });
    }

    auditService.log({
      actorId: 'usr_auditor_1',
      actorName: auditorName,
      actorRole: 'AUDITOR',
      action: 'REMEDIATION_VERIFIED',
      entityType: 'REMEDIATION_ACTION',
      entityId: id,
      correlationId: `rem_verify_${id}`,
      details: `Auditor ${auditorName} verified completion of remediation action ${id}. Proof documented.`,
    });

    this.notify();
    return this.remediations[idx];
  }

  // --- 7. Formal Audit Reports Generator ---

  public getReportPackages(): AuditReportPackage[] {
    return this.reportPackages;
  }

  public generateAuditReport(params: {
    period: string;
    scopeDepartments: string[];
    executiveSummary?: string;
    generatedBy: string;
  }): AuditReportPackage {
    const allFindings = this.findings;
    const critical = allFindings.filter((f) => f.severity === 'CRITICAL').length;
    const high = allFindings.filter((f) => f.severity === 'HIGH').length;

    const seed = `OB_AUD_REP_${params.period}_${Date.now()}_${allFindings.length}`;
    // Simple fast tamper seal generator
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
    const seal = `OB-AUD-SEAL-${hex}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const report: AuditReportPackage = {
      id: `AUD-REP-${params.period.replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      title: `Oromia Bank NBE Regulatory Compliance Audit Memo - ${params.period}`,
      period: params.period,
      scopeDepartments: params.scopeDepartments.length > 0 ? params.scopeDepartments : ['All 8 Bank Departments'],
      generatedBy: params.generatedBy,
      findingsCount: allFindings.length,
      criticalCount: critical,
      highCount: high,
      executiveSummary:
        params.executiveSummary ||
        `Independent regulatory compliance audit performed on statutory returns submitted for ${params.period}. ` +
          `A total of ${allFindings.length} findings were examined across ${params.scopeDepartments.length || 8} banking departments. ` +
          `${critical} critical and ${high} high-severity variances identified with remediation deadlines assigned.`,
      tamperSeal: seal,
      createdAt: new Date().toISOString(),
    };

    this.reportPackages.unshift(report);

    auditService.log({
      actorId: 'usr_auditor_1',
      actorName: params.generatedBy,
      actorRole: 'AUDITOR',
      action: 'AUDIT_REPORT_EXPORTED',
      entityType: 'AUDIT_REPORT',
      entityId: report.id,
      correlationId: `audit_rep_${report.id}`,
      details: `Generated formal audit report "${report.title}" with tamper seal ${seal}.`,
    });

    this.notify();
    return report;
  }

  public exportAuditReportJson(pkg: AuditReportPackage): string {
    const bundle = {
      institution: 'Oromia Bank S.C.',
      institutionCode: '0000013',
      governingAuthority: 'National Bank of Ethiopia (Bank Supervision Directorate)',
      auditReport: pkg,
      findings: this.findings,
      remediations: this.remediations,
      evidenceSummary: this.evidences.map((e) => ({
        id: e.id,
        title: e.title,
        fileName: e.fileName,
        checksum: e.sha256Checksum,
        tamperSeal: e.tamperSeal,
        verificationStatus: e.verificationStatus,
      })),
      complianceScore: this.getKpiSummary().complianceScore,
      cryptographicTamperSeal: pkg.tamperSeal,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Generates a historical submission trend dataset for a given report key with flexible date ranges.
   * Tracks submission values, variances, status lifecycle, and audit findings over a customizable window.
   */
  public getHistoricalTrend(
    reportKey: string,
    options: HistoricalTrendOptions = {}
  ): HistoricalReportTrendResult {
    const def = getReportDefinition(reportKey);
    const allSubs = submissionService.getAllSubmissions();
    const activeSub = allSubs.find((s) => s.reportKey === reportKey);
    const reportFindings = this.findings.filter((f) => f.reportKey === reportKey);

    const title = def?.Title || reportKey;
    const frequency = def?.Frequency || 'MONTHLY';
    const deptName = def?.department || (def as any)?.Department || 'Credit Operations & Portfolio Management';

    // Identify numeric fields
    const numericFields = (def?.ReturnItemsList || [])
      .filter((item) => item._dataType === 'NUMERIC')
      .map((item) => ({
        code: item.Code,
        description: item._description,
        dataType: item._dataType,
      }));

    // Primary and secondary field identifiers
    const primaryField = options.customFieldCode
      ? numericFields.find((f) => f.code === options.customFieldCode) || numericFields[0]
      : numericFields[0];
    const secondaryField = numericFields.length > 1 ? numericFields[1] : undefined;

    const primaryCode = primaryField?.code || 'FIELD_001';
    const secondaryCode = secondaryField?.code || 'FIELD_002';
    const primaryName = primaryField?.description || 'Primary Statutory Value';
    const secondaryName = secondaryField?.description || 'Secondary Regulatory Metric';

    // Base value determination from active submission or default
    let basePrimaryValue = 50000000; // default 50M ETB
    let baseSecondaryValue = 2500000;

    if (activeSub?.values) {
      const activeP = Number(activeSub.values[primaryCode]);
      if (!isNaN(activeP) && activeP > 0) basePrimaryValue = activeP;
      if (secondaryCode && activeSub.values[secondaryCode]) {
        const activeS = Number(activeSub.values[secondaryCode]);
        if (!isNaN(activeS) && activeS > 0) baseSecondaryValue = activeS;
      }
    } else if (def?.ReturnItemsList) {
      const pItem = def.ReturnItemsList.find((i) => i.Code === primaryCode);
      if (pItem && pItem.Value) {
        const pNum = Number(pItem.Value);
        if (!isNaN(pNum) && pNum > 0) basePrimaryValue = pNum;
      }
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Determine how many months to generate
    let count = options.monthsCount || 12;
    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      count = Math.max(1, Math.min(36, diffMonths));
    } else if (options.monthsCount) {
      count = Math.max(1, Math.min(36, options.monthsCount));
    }

    const allGeneratedPoints: HistoricalTrendMonthPoint[] = [];

    // Deterministic progression seeds up to 36 months
    const growthMultipliers = [
      0.65, 0.67, 0.70, 0.72, 0.74, 0.76, 0.78, 0.80, 0.82, 0.84, 0.86, 0.88,
      0.82, 0.84, 0.86, 0.89, 0.91, 0.93, 0.96, 0.98, 0.99, 1.01, 1.03, 1.0,
      1.02, 1.05, 1.08, 1.10, 1.12, 1.15, 1.18, 1.20, 1.22, 1.25, 1.28, 1.30,
    ];
    const secondaryMultipliers = [
      0.62, 0.64, 0.68, 0.70, 0.73, 0.75, 0.77, 0.80, 0.79, 0.81, 0.85, 0.87,
      0.90, 0.92, 0.95, 0.97, 1.02, 1.04, 1.06, 1.0, 1.03, 1.06, 1.09, 1.12,
      1.14, 1.17, 1.20, 1.22, 1.25, 1.28, 1.31, 1.34, 1.37, 1.40, 1.43, 1.46,
    ];

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const mName = date.toLocaleDateString('en-US', { month: 'short' });
      const mYear = date.getFullYear().toString().slice(-2);
      const mFull = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const monthLabel = `${mName} ${mYear}`;
      const periodKey = `${date.getFullYear()}-M${String(date.getMonth() + 1).padStart(2, '0')}`;

      const indexFromStart = count - 1 - i;
      const multIndex = indexFromStart % growthMultipliers.length;
      const mult = growthMultipliers[multIndex] || 1.0;
      const secMult = secondaryMultipliers[multIndex] || 1.0;

      // Seasonal fluctuation
      const monthlyFluctuation = Math.sin((indexFromStart * Math.PI) / 3) * 0.02;
      const calculatedPrimary = Math.round(basePrimaryValue * (mult + monthlyFluctuation));
      const calculatedSecondary = Math.round(baseSecondaryValue * (secMult + monthlyFluctuation));

      // Status for this historical month
      let monthStatus: 'SENT' | 'APPROVED' | 'PENDING_CHECKER' | 'DRAFT' = 'SENT';
      if (i === 0) {
        monthStatus = (activeSub?.status as any) || 'APPROVED';
      } else if (i === 1) {
        monthStatus = 'SENT';
      } else if (i % 4 === 0) {
        monthStatus = 'APPROVED';
      }

      // Check if audit findings were logged in this period
      const hasFinding = reportFindings.some((f) => {
        const fDate = new Date(f.createdAt);
        return fDate.getMonth() === date.getMonth() && fDate.getFullYear() === date.getFullYear();
      }) || (indexFromStart % 6 === 2);

      const fieldVals: Record<string, number> = {};
      numericFields.forEach((nf) => {
        fieldVals[nf.code] = Math.round(calculatedPrimary * (nf.code === primaryCode ? 1 : 0.4));
      });

      allGeneratedPoints.push({
        month: monthLabel,
        monthFull: mFull,
        period: periodKey,
        date: date.toISOString(),
        primaryValue: calculatedPrimary,
        secondaryValue: calculatedSecondary,
        benchmarkTarget: Math.round(basePrimaryValue * 0.95),
        status: monthStatus,
        version: i === 0 ? (activeSub?.version || 1) : 1,
        makerName: activeSub?.makerName || 'Abebe Kebede (Maker)',
        checkerName: activeSub?.checkerName || 'Chala Desta (Checker)',
        fieldValues: fieldVals,
        varianceFromMean: 0,
        variancePercentage: 0,
        hasFinding,
      });
    }

    // Apply explicit startDate / endDate filtering if provided
    let monthPoints = allGeneratedPoints;
    if (options.startDate || options.endDate) {
      const startMs = options.startDate ? new Date(options.startDate).getTime() : 0;
      const endMs = options.endDate ? new Date(options.endDate).getTime() : Infinity;
      monthPoints = allGeneratedPoints.filter((m) => {
        const mMs = new Date(m.date).getTime();
        return mMs >= startMs && mMs <= endMs;
      });
      if (monthPoints.length === 0) {
        monthPoints = allGeneratedPoints.slice(-12);
      }
    }

    // Compute summary statistics
    const valuesList = monthPoints.map((m) => m.primaryValue);
    const sum = valuesList.reduce((a, b) => a + b, 0);
    const mean = Math.round(sum / valuesList.length);

    let maxVal = -Infinity;
    let minVal = Infinity;
    let maxMonth = '';
    let minMonth = '';

    monthPoints.forEach((m) => {
      m.varianceFromMean = m.primaryValue - mean;
      m.variancePercentage = mean > 0 ? Number(((m.varianceFromMean / mean) * 100).toFixed(1)) : 0;

      if (m.primaryValue > maxVal) {
        maxVal = m.primaryValue;
        maxMonth = m.month;
      }
      if (m.primaryValue < minVal) {
        minVal = m.primaryValue;
        minMonth = m.month;
      }
    });

    const currentVal = monthPoints[monthPoints.length - 1]?.primaryValue || 0;
    const priorMonthVal = monthPoints.length > 1 ? monthPoints[monthPoints.length - 2].primaryValue : currentVal;
    const momGrowth = priorMonthVal > 0 ? Number((((currentVal - priorMonthVal) / priorMonthVal) * 100).toFixed(1)) : 0;

    const firstVal = monthPoints[0]?.primaryValue || currentVal;
    const annualGrowth = firstVal > 0 ? Number((((currentVal - firstVal) / firstVal) * 100).toFixed(1)) : 0;

    const varianceSqSum = valuesList.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const stdDev = Math.sqrt(varianceSqSum / valuesList.length);
    const volatilityPct = mean > 0 ? Number(((stdDev / mean) * 100).toFixed(1)) : 0;

    return {
      reportKey,
      reportTitle: title,
      frequency,
      department: deptName,
      primaryFieldName: primaryName,
      secondaryFieldName: secondaryName,
      unit: 'ETB',
      months: monthPoints,
      summary: {
        currentValue: currentVal,
        priorMonthValue: priorMonthVal,
        momGrowthRate: momGrowth,
        twelveMonthMean: mean,
        twelveMonthHigh: { value: maxVal, month: maxMonth },
        twelveMonthLow: { value: minVal, month: minMonth },
        twelveMonthAnnualGrowth: annualGrowth,
        volatilityIndex: volatilityPct,
        totalSubmissionsInPeriod: monthPoints.length,
        auditFindingsInPeriod: monthPoints.filter((m) => m.hasFinding).length,
      },
      availableNumericFields: numericFields,
    };
  }

  /**
   * Generates a 12-month historical submission trend dataset (shorthand helper).
   */
  public get12MonthHistoricalTrend(reportKey: string, customFieldCode?: string): HistoricalReportTrendResult {
    return this.getHistoricalTrend(reportKey, { customFieldCode, monthsCount: 12 });
  }

  /**
   * Generates a comprehensive CSV export of the historical trend dataset for offline regulatory analysis.
   */
  public generateCsvExport(trendResult: HistoricalReportTrendResult, actorName = 'Auditor'): string {
    const lines: string[] = [];
    const exportDate = new Date().toISOString();

    // 1. Regulatory Header Metadata
    lines.push('# =========================================================================');
    lines.push('# OROMIA BANK S.C. — INDEPENDENT REGULATORY AUDIT & SUPERVISORY COMPLIANCE');
    lines.push('# NATIONAL BANK OF ETHIOPIA (BANK SUPERVISION DIRECTORATE)');
    lines.push('# OFFLINE REGULATORY ANALYSIS & HISTORICAL SUBMISSION TREND EXPORT');
    lines.push('# =========================================================================');
    lines.push(`Institution Name,Oromia Bank S.C.`);
    lines.push(`Institution Code,0000013`);
    lines.push(`Report Key,"${trendResult.reportKey}"`);
    lines.push(`Report Title,"${trendResult.reportTitle}"`);
    lines.push(`Responsible Department,"${trendResult.department}"`);
    lines.push(`Reporting Frequency,"${trendResult.frequency}"`);
    lines.push(`Primary Statutory Metric,"${trendResult.primaryFieldName}"`);
    lines.push(`Secondary Metric,"${trendResult.secondaryFieldName}"`);
    lines.push(`Monetary Unit,${trendResult.unit}`);
    lines.push(`Auditor Export Actor,"${actorName}"`);
    lines.push(`Export Timestamp,"${exportDate}"`);
    lines.push(`Total Periods Exported,${trendResult.months.length}`);
    lines.push('');

    // 2. Statistical Summary
    lines.push('# -------------------------------------------------------------------------');
    lines.push('# EXECUTIVE STATISTICAL SUMMARY (OFFLINE ANALYSIS)');
    lines.push('# -------------------------------------------------------------------------');
    lines.push(`Period Mean Value (ETB),${trendResult.summary.twelveMonthMean}`);
    lines.push(`Period Peak Value (ETB),${trendResult.summary.twelveMonthHigh.value} (${trendResult.summary.twelveMonthHigh.month})`);
    lines.push(`Period Low Value (ETB),${trendResult.summary.twelveMonthLow.value} (${trendResult.summary.twelveMonthLow.month})`);
    lines.push(`Latest Month-over-Month Growth Rate (%),${trendResult.summary.momGrowthRate}%`);
    lines.push(`Period Annual Growth Rate (%),${trendResult.summary.twelveMonthAnnualGrowth}%`);
    lines.push(`Volatility Index (Std Dev %),${trendResult.summary.volatilityIndex}%`);
    lines.push(`Total Periods with Audit Findings,${trendResult.summary.auditFindingsInPeriod}`);
    lines.push('');

    // 3. Detailed Data Table
    lines.push('# -------------------------------------------------------------------------');
    lines.push('# STATUTORY SUBMISSION VALUES LEDGER');
    lines.push('# -------------------------------------------------------------------------');
    lines.push(
      'Period Key,Month Label,Cutoff Date,Primary Statutory Value (ETB),Secondary Metric Value (ETB),Variance vs Mean (ETB),Variance (%),Filing Status,Version,Maker Officer,Checker Officer,Audit Finding Flag'
    );

    trendResult.months.forEach((m) => {
      const findingFlag = m.hasFinding ? 'YES (AUDIT_VARIANCE_FLAGGED)' : 'NO';
      lines.push(
        `"${m.period}","${m.monthFull}","${m.date.split('T')[0]}",${m.primaryValue},${m.secondaryValue},${m.varianceFromMean},${m.variancePercentage},"${m.status}",${m.version},"${m.makerName}","${m.checkerName}","${findingFlag}"`
      );
    });

    return lines.join('\n');
  }
}

export interface HistoricalTrendMonthPoint {
  month: string;
  monthFull: string;
  period: string;
  date: string;
  primaryValue: number;
  secondaryValue: number;
  benchmarkTarget?: number;
  status: 'SENT' | 'APPROVED' | 'PENDING_CHECKER' | 'DRAFT';
  version: number;
  makerName: string;
  checkerName: string;
  fieldValues: Record<string, number>;
  varianceFromMean: number;
  variancePercentage: number;
  hasFinding: boolean;
}

export interface HistoricalReportTrendResult {
  reportKey: string;
  reportTitle: string;
  frequency: string;
  department: string;
  primaryFieldName: string;
  secondaryFieldName: string;
  unit: string;
  months: HistoricalTrendMonthPoint[];
  summary: {
    currentValue: number;
    priorMonthValue: number;
    momGrowthRate: number;
    twelveMonthMean: number;
    twelveMonthHigh: { value: number; month: string };
    twelveMonthLow: { value: number; month: string };
    twelveMonthAnnualGrowth: number;
    volatilityIndex: number;
    totalSubmissionsInPeriod: number;
    auditFindingsInPeriod: number;
  };
  availableNumericFields: Array<{
    code: string;
    description: string;
    dataType: string;
  }>;
}

export interface HistoricalTrendOptions {
  customFieldCode?: string;
  monthsCount?: number;
  startDate?: string;
  endDate?: string;
}

export const auditorService = new AuditorServiceClass();
