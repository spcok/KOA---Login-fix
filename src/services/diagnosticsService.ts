import { Animal, Task, User, AnimalCategory, LogType, HealthRecordType, HealthCondition, UserRole } from '@/types';

export interface DiagnosticIssue {
  id: string;
  timestamp: number;
  severity: 'Critical' | 'Warning' | 'Info';
  category: 'Database' | 'Security' | 'Logic' | 'Compliance';
  message: string;
  remediation?: string;
  subjectId?: string;
}

export const diagnosticsService = {
  /**
   * Runs a statutory compliance audit based on the Zoo Licensing Act 1981
   * and Secretary of State's Standards of Modern Zoo Practice (SSSMZP).
   */
  runFullAudit: (animals: Animal[], tasks: Task[], users: User[]): DiagnosticIssue[] => {
    const issues: DiagnosticIssue[] = [];
    const timestamp = Date.now();

    animals.forEach(a => {
      // 1. STATUTORY IDENTIFICATION (ZLA Section 9)
      const hasId = a.ring_number || a.microchip_id || a.has_no_id;
      if (!hasId) {
        issues.push({
          id: `comp_id_${a.id}`,
          timestamp,
          severity: 'Critical',
          category: 'Compliance',
          message: `Animal "${a.name}" lacks statutory unique identifier (Ring or Microchip).`,
          remediation: 'ZLA 1981 requires individual identification. Assign a ring/chip or verify "No ID" status.',
          subjectId: a.id
        });
      }

      // 2. ACQUISITION RECORDS (ZLA Section 9)
      if (!a.acquisition_date || !a.origin) {
        issues.push({
          id: `comp_orig_${a.id}`,
          timestamp,
          severity: 'Warning',
          category: 'Compliance',
          message: `Animal "${a.name}" is missing acquisition history (Arrival Date or Origin).`,
          remediation: 'Update the animal profile with legal origin data.',
          subjectId: a.id
        });
      }

      // 3. TAXONOMY (SSSMZP Standard 1)
      if (!a.latin_name || a.latin_name === 'Unknown') {
        issues.push({
          id: `comp_tax_${a.id}`,
          timestamp,
          severity: 'Warning',
          category: 'Compliance',
          message: `Animal "${a.name}" has incomplete scientific taxonomy.`,
          remediation: 'Use the AI Auto-fill tool in the profile editor to fetch the Latin name.',
          subjectId: a.id
        });
      }

      // 4. VETERINARY COMPLIANCE (SSSMZP Standard 3)
      const healthLogs = (a.logs || []).filter(l => l.log_type === LogType.HEALTH);
      const medicationLogs = healthLogs.filter(l => l.health_record_type === HealthRecordType.MEDICATION);
      
      medicationLogs.forEach(ml => {
          if (!ml.medication_batch || !ml.prescribed_by_user_id) {
              issues.push({
                  id: `comp_med_${ml.id}`,
                  timestamp,
                  severity: 'Warning',
                  category: 'Compliance',
                  message: `Medication record for "${a.name}" (${ml.log_date}) is missing batch or prescriber data.`,
                  remediation: 'RCVS/DEFRA standards require full traceability of dispensed controlled substances.',
                  subjectId: a.id
              });
          }
      });

      // 5. DECEASED PROTOCOL
      const deceasedLog = healthLogs.find(l => l.condition === HealthCondition.DECEASED);
      if (deceasedLog && (!deceasedLog.cause_of_death || !deceasedLog.disposal_method)) {
          issues.push({
              id: `comp_eol_${a.id}`,
              timestamp,
              severity: 'Critical',
              category: 'Compliance',
              message: `Deceased record for "${a.name}" lacks mandatory cause or disposal method.`,
              remediation: 'Complete the "End of Life" protocol in the medical record.',
              subjectId: a.id
          });
      }
    });

    // 6. PERSONNEL & ACCESS (Security)
    const activeAdmins = users.filter(u => u.role === 'Admin' && u.active);
    if (activeAdmins.length === 0) {
        issues.push({
            id: `sec_no_admin`,
            timestamp,
            severity: 'Critical',
            category: 'Security',
            message: 'No active Administrators found in the registry.',
            remediation: 'System lockout risk. Elevate a user to Admin immediately.'
        });
    }

    return issues;
  }
};