import Dexie, { Table } from 'dexie';
import {
  User,
  Animal,
  LogEntry,
  GlobalDocument,
  Task,
  SiteLogEntry,
  Incident,
  FirstAidLogEntry,
  OrganisationProfile,
  AuditLogEntry,
  DailyRoundEntry,
  BCSData,
  AnimalMovement,
  StaffTraining
} from '@/types';

export class KoaDatabase extends Dexie {
  users!: Table<User, string>;
  animals!: Table<Animal, string>;
  log_entries!: Table<LogEntry, string>;
  documents!: Table<GlobalDocument, string>;
  tasks!: Table<Task, string>;
  site_log_entries!: Table<SiteLogEntry, string>;
  incidents!: Table<Incident, string>;
  first_aid_log_entries!: Table<FirstAidLogEntry, string>;
  organisation_profiles!: Table<OrganisationProfile, string>;
  audit_log_entries!: Table<AuditLogEntry, string>;
  daily_round_entries!: Table<DailyRoundEntry, string>;
  bcs_data!: Table<BCSData, string>;
  animal_movements!: Table<AnimalMovement, string>;
  staff_training!: Table<StaffTraining, string>;
  contacts!: Table<any, string>;
  holiday_requests!: Table<any, string>;

  constructor() {
    super('KoaDatabase');
    
    // Version 1: Initial schema with core tables
    this.version(1).stores({
      users: 'id, role, active',
      animals: 'id, category, species, location, archived',
      log_entries: 'id, animal_id, log_date, log_type, created_by',
      documents: 'id, category, upload_date',
      tasks: 'id, animal_id, due_date, completed, assigned_to_user_id',
      site_log_entries: 'id, log_date, status, priority',
      incidents: 'id, incident_date, status, severity, animal_id',
      first_aid_log_entries: 'id, log_date, incident_type',
      organisation_profiles: 'id'
    });

    // Version 10: Flattened schema with all tables. 
    // Jumping to 10 to ensure we override any messy intermediate versions (2, 3, etc.)
    this.version(10).stores({
      users: 'id, role, active',
      animals: 'id, category, species, location, archived',
      log_entries: 'id, animal_id, log_date, log_type, created_by',
      documents: 'id, category, upload_date',
      tasks: 'id, animal_id, due_date, completed, assigned_to_user_id',
      site_log_entries: 'id, log_date, status, priority',
      incidents: 'id, incident_date, status, severity, animal_id',
      first_aid_log_entries: 'id, log_date, incident_type',
      organisation_profiles: 'id',
      audit_log_entries: 'id, affected_entity_id, action_type, created_at',
      daily_round_entries: 'id, round_date, animal_id',
      bcs_data: 'id, animal_id, date',
      animal_movements: 'id, animal_id, movement_date, movement_type',
      staff_training: 'id, user_id, completion_date, status',
      contacts: 'id',
      holiday_requests: 'id'
    });
  }

  // Fail-safe: If the database fails to open due to a schema/upgrade error, 
  // we delete it and start fresh. This prevents the app from being stuck.
  async open() {
    try {
      return await super.open();
    } catch (err: any) {
      if (err.name === 'UpgradeError' || err.name === 'SchemaError' || err.name === 'VersionError') {
        console.error(`[DB] ${err.name} detected. Resetting local database...`, err);
        await Dexie.delete('KoaDatabase');
        return await super.open();
      }
      throw err;
    }
  }
}

export const db = new KoaDatabase();
