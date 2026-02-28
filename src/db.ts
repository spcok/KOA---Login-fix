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
  AnimalMovement
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
  organisation_profile!: Table<OrganisationProfile, string>;
  audit_log_entries!: Table<AuditLogEntry, string>;
  daily_round_entries!: Table<DailyRoundEntry, string>;
  bcs_data!: Table<BCSData, string>;
  animal_movements!: Table<AnimalMovement, string>;
  contacts!: Table<any, string>;
  holiday_requests!: Table<any, string>;

  constructor() {
    super('KoaDatabase');
    
    this.version(1).stores({
      users: 'id, role, active',
      animals: 'id, category, species, location, archived',
      log_entries: 'id, animal_id, log_date, log_type, created_by',
      documents: 'id, category, upload_date',
      tasks: 'id, animal_id, due_date, completed, assigned_to_user_id',
      site_log_entries: 'id, log_date, status, priority',
      incidents: 'id, incident_date, status, severity, animal_id',
      first_aid_log_entries: 'id, log_date, incident_type',
      organisation_profile: 'id',
      audit_log_entries: 'id, affected_entity_id, action_type, created_at',
      daily_round_entries: 'id, round_date, animal_id',
      bcs_data: 'id, animal_id, date',
      animal_movements: 'id, animal_id, movement_date, movement_type',
      contacts: 'id',
      holiday_requests: 'id'
    });
  }
}

export const db = new KoaDatabase();
