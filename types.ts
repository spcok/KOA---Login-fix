
export type SortOption = 'alpha-asc' | 'alpha-desc' | 'custom';

export enum UserRole {
  ADMIN = 'Admin',
  VOLUNTEER = 'Volunteer',
  STAFF = 'Staff',
  VETERINARIAN = 'Veterinarian',
  KEEPER = 'Keeper',
  SENIOR_KEEPER = 'Senior Keeper',
  DIRECTOR = 'Director'
}

export enum AnimalCategory {
  OWLS = 'Owls',
  RAPTORS = 'Raptors',
  MAMMALS = 'Mammals',
  EXOTICS = 'Exotics',

}

export enum LogType {
  WEIGHT = 'Weight',
  FEED = 'Feed',
  HEALTH = 'Health',
  FLIGHT = 'Flight',
  ENRICHMENT = 'Enrichment',
  WEATHERING = 'Weathering',
  TRAINING = 'Training',
  TEMPERATURE = 'Temperature',
  MISTING = 'Misting',
  WATER = 'Water',
  EGG = 'Egg',
  GENERAL = 'General',
  MOVEMENT = 'Movement',
  EVENT = 'Event',
  CONSERVATION = 'Conservation',
  EDUCATION = 'Education',
  AUDIT = 'Audit' // Added for audit trail logging
}

export enum HealthRecordType {
  OBSERVATION = 'Observation',
  MEDICATION = 'Medication',
  QUARANTINE = 'Quarantine',
  RELEASE = 'Release',
  VETERINARY_EXAM = 'Veterinary Exam',
  DIAGNOSIS = 'Diagnosis',
  TREATMENT = 'Treatment',
  SURGERY = 'Surgery',
  VACCINATION = 'Vaccination',
  DEATH = 'Death'
}

export enum HealthCondition {
  HEALTHY = 'Healthy',
  MONITORING = 'Monitoring',
  ILL = 'Ill',
  INJURED = 'Injured',
  DECEASED = 'Deceased',
  RECOVERING = 'Recovering'
}

export enum HazardRating {
  NONE = 'None',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  EXTREME = 'Extreme' // Added for more granular hazard assessment
}

export enum ConservationStatus {
  LC = 'LC', // Least Concern
  NT = 'NT', // Near Threatened
  VU = 'VU', // Vulnerable
  EN = 'EN', // Endangered
  CR = 'CR', // Critically Endangered
  EW = 'EW', // Extinct in the Wild
  EX = 'EX', // Extinct
  DD = 'DD', // Data Deficient
  NE = 'NE', // Not Evaluated
  NC = 'NC' // Not Classified (custom for internal use if needed)
}

export enum ShellQuality {
  NORMAL = 'Normal',
  THIN = 'Thin',
  SOFT = 'Soft',
  ROUGH = 'Rough',
  DAMAGED = 'Damaged' // Added for more detail
}

export enum EggOutcome {
  INCUBATOR = 'Incubator',
  HATCHED = 'Hatched',
  BROKEN = 'Broken',
  INFERTILE = 'Infertile',
  DISPOSED = 'Disposed',
  PREDATED = 'Predated'
}

export enum IncidentType {
  ANIMAL_INJURY_ILLNESS = 'Animal Injury/Illness',
  STAFF_INJURY = 'Staff Injury',
  PUBLIC_INJURY = 'Public Injury',
  ANIMAL_ESCAPE = 'Animal Escape',
  SECURITY_BREACH = 'Security Breach',
  EQUIPMENT_FAILURE = 'Equipment Failure',
  NATURAL_DISASTER = 'Natural Disaster',
  OTHER = 'Other'
}

export enum IncidentSeverity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
  FATAL = 'Fatal' // Added for extreme cases
}

export enum MovementType {
  ACQUISITION = 'Acquisition',
  DISPOSITION = 'Disposition',
  TRANSFER = 'Transfer',
  LOAN_IN = 'Loan In',
  LOAN_OUT = 'Loan Out',
  BIRTH = 'Birth',
  DEATH = 'Death'
}

export enum MovementReason {
  PURCHASE = 'Purchase',
  DONATION = 'Donation',
  BREEDING_PROGRAM = 'Breeding Program',
  RESCUE = 'Rescue',
  EXCHANGE = 'Exchange',
  VETERINARY_CARE = 'Veterinary Care',
  EXHIBIT_CHANGE = 'Exhibit Change',
  SALE = 'Sale',
  EUTHANASIA = 'Euthanasia',
  NATURAL_CAUSES = 'Natural Causes',
  OTHER = 'Other'
}

// Base interface for all entities stored in Supabase/Dexie
export interface BaseEntity {
  readonly id: string; // UUID from Supabase
  readonly created_at: Date; // Timestamp of creation
  created_by: string; // User ID of creator
  updated_at: Date; // Timestamp of last update
  last_modified_by: string; // User ID of last modifier
}

export interface UserPermissions {
  dashboard: boolean;
  dailyLog: boolean;
  tasks: boolean;
  medical: boolean;
  movements: boolean;
  safety: boolean;
  maintenance: boolean;
  settings: boolean;
  flightRecords: boolean;
  feedingSchedule: boolean;
  attendance: boolean;
  attendanceManager: boolean;
  holidayApprover: boolean;
  missingRecords: boolean;
  reports: boolean;
  rounds: boolean;
  animalManagement: boolean; // Added for managing animal profiles
  userManagement: boolean; // Added for managing users and permissions
  documentManagement: boolean; // Added for managing global documents
}

export interface User extends BaseEntity {
  name: string;
  initials: string;
  role: UserRole;
  job_position?: string; // Renamed for consistency
  pin: string;
  active: boolean;
  permissions: UserPermissions; // Made mandatory
  signature_image_url?: string; // Renamed for clarity
}

export interface Animal extends BaseEntity {
  name: string;
  species: string;
  latin_name?: string; // Renamed for consistency
  category: AnimalCategory;
  dob: Date; // Changed to Date object
  is_dob_unknown: boolean; // Renamed for consistency
  sex: 'Male' | 'Female' | 'Unknown'; // Made mandatory
  location: string; // Current enclosure/location
  description?: string;
  special_requirements?: string; // Renamed for consistency
  critical_husbandry_notes?: string[]; // Renamed for consistency
  toxicity?: string; // e.g., 'Venomous', 'Poisonous', 'Non-toxic'
  image_url: string; // Renamed for consistency
  distribution_map_url?: string; // Renamed for consistency
  
  weight_unit: 'g' | 'oz' | 'lbs_oz'; // Renamed for consistency
  summer_weight_g?: number; // Added unit suffix for clarity
  winter_weight_g?: number; // Added unit suffix for clarity
  flying_weight_g?: number; // Added unit suffix for clarity
  
  ring_number?: string; // Renamed for consistency
  microchip_id?: string; // Renamed for consistency
  has_no_id: boolean; // Renamed for consistency
  
  acquisition_date: Date; // Renamed and made mandatory for compliance
  origin: string; // Source of acquisition (e.g., another zoo, rescue)
  sire_id?: string; // Link to another animal ID
  dam_id?: string; // Link to another animal ID
  
  is_venomous: boolean; // Renamed and made mandatory
  hazard_rating: HazardRating; // Made mandatory
  red_list_status: ConservationStatus; // Renamed and made mandatory
  
  target_day_temp_c?: number; // Added unit suffix
  target_night_temp_c?: number; // Added unit suffix
  target_basking_temp_c?: number; // Added unit suffix
  target_cool_temp_c?: number; // Added unit suffix
  target_humidity_min_percent?: number; // Added unit suffix
  target_humidity_max_percent?: number; // Added unit suffix
  misting_frequency?: string; // e.g., 'Daily', 'Twice a week'
  water_type?: string; // e.g., 'Tap', 'RO', 'Distilled'
  
  // Denormalized for quick access, actual logs are in LogEntry table
  logs?: LogEntry[]; 
  documents?: GlobalDocument[];
  
  archived: boolean; // Made mandatory
  is_quarantine: boolean; // Renamed and made mandatory
  quarantine_start_date?: Date; // Renamed and changed to Date object
  quarantine_reason?: string; // Reason for quarantine
  display_order: number; // Renamed for consistency
  is_group_animal: boolean; // Renamed for consistency, indicates if this entry represents a group
  group_member_ids?: string[]; // If is_group_animal is true, list member IDs
}

export interface LogEntry extends BaseEntity {
  animal_id: string; // Foreign key to Animal
  log_date: Date; // Changed to Date object
  log_type: LogType; // Renamed for consistency
  value: string; // General value, e.g., weight in kg, feed amount
  notes?: string;
  attachment_url?: string; // Renamed for consistency
  
  // Type specific fields
  weight_grams?: number; // For LogType.WEIGHT
  feed_method?: string; // For LogType.FEED, e.g., 'Hand-fed', 'Scatter'
  has_cast?: boolean; // For LogType.FEED
  
  health_record_type?: HealthRecordType; // For LogType.HEALTH
  condition?: HealthCondition; // For LogType.HEALTH
  bcs?: number; // Body Condition Score, for LogType.HEALTH
  feather_condition?: string; // For LogType.HEALTH
  medication_name?: string; // For LogType.HEALTH (Medication)
  medication_batch?: string; // For LogType.HEALTH (Medication)
  medication_dosage?: string; // For LogType.HEALTH (Medication)
  medication_route?: string; // For LogType.HEALTH (Medication)
  medication_frequency?: string; // For LogType.HEALTH (Medication)
  medication_end_date?: Date; // For LogType.HEALTH (Medication), changed to Date
  prescribed_by_user_id?: string; // For LogType.HEALTH (Medication), link to User ID
  cause_of_death?: string; // For LogType.HEALTH (Death)
  disposal_method?: string; // For LogType.HEALTH (Death)
  veterinarian_id?: string; // For LogType.HEALTH (Vet Exam, Diagnosis, Treatment, Surgery), link to User ID
  diagnosis?: string; // For LogType.HEALTH (Diagnosis)
  treatment_details?: string; // For LogType.HEALTH (Treatment)
  surgery_details?: string; // For LogType.HEALTH (Surgery)
  vaccine_name?: string; // For LogType.HEALTH (Vaccination)
  vaccine_batch?: string; // For LogType.HEALTH (Vaccination)
  next_due_date?: Date; // For LogType.HEALTH (Vaccination), changed to Date

  temperature_c?: number; // For LogType.TEMPERATURE
  basking_temp_c?: number; // For LogType.TEMPERATURE
  cool_temp_c?: number; // For LogType.TEMPERATURE
  
  weather_description?: string; // For LogType.WEATHERING
  wind_speed_mph?: number; // For LogType.WEATHERING
  flight_duration_minutes?: number; // For LogType.FLIGHT
  flight_quality?: string; // For LogType.FLIGHT
  gps_track_url?: string; // For LogType.FLIGHT
  
  movement_type?: MovementType; // For LogType.MOVEMENT
  movement_reason?: MovementReason; // For LogType.MOVEMENT
  source_location?: string; // For LogType.MOVEMENT
  destination_location?: string; // For LogType.MOVEMENT
  transferred_to_animal_id?: string; // For LogType.MOVEMENT (Transfer), link to another Animal ID
  transferred_from_animal_id?: string; // For LogType.MOVEMENT (Transfer), link to another Animal ID
  external_party_name?: string; // For LogType.MOVEMENT (Acquisition/Disposition/Loan)
  external_party_contact?: string; // For LogType.MOVEMENT (Acquisition/Disposition/Loan)
  
  weathering_start_time?: Date; // For LogType.WEATHERING
  weathering_end_time?: Date; // For LogType.WEATHERING
  
  egg_count?: number; // For LogType.EGG
  egg_weight_grams?: number; // For LogType.EGG
  shell_quality?: ShellQuality; // For LogType.EGG
  egg_outcome?: EggOutcome; // For LogType.EGG

  event_type?: string; // For LogType.EVENT
  event_start_time?: Date; // For LogType.EVENT
  event_end_time?: Date; // For LogType.EVENT
  event_duration_minutes?: number; // For LogType.EVENT
  event_animal_ids?: string[]; // For LogType.EVENT
}

export interface GlobalDocument extends BaseEntity {
  name: string;
  category: 'Licensing' | 'Insurance' | 'Protocol' | 'Safety' | 'Veterinary'; // Added Veterinary
  file_url: string; // Renamed for consistency
  upload_date: Date; // Changed to Date object
  expiry_date?: Date; // Changed to Date object
  notes?: string;
  animal_id?: string; // Optional: link document to a specific animal
}

export interface Task extends BaseEntity {
  title: string;
  task_type: LogType; // Renamed for consistency
  animal_id?: string; // Foreign key to Animal
  due_date: Date; // Changed to Date object
  completed: boolean;
  recurring: boolean;
  assigned_to_user_id?: string; // Renamed and linked to User ID
  notes?: string;
  completed_at?: Date; // When the task was completed
  completed_by_user_id?: string; // Who completed the task
}

export interface SiteLogEntry extends BaseEntity {
  log_date: Date; // Changed to Date object
  title: string;
  description: string;
  location: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'; // Added Urgent
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'; // Added Cancelled
  estimated_cost?: number; // Renamed for clarity
  actual_cost?: number; // Added for actual cost tracking
  logged_by_user_id: string; // Renamed and linked to User ID
  completed_by_user_id?: string; // Who completed the maintenance
  completion_date?: Date; // When the maintenance was completed
}

export interface Incident extends BaseEntity {
  incident_date: Date; // Renamed and changed to Date object
  incident_time: string; // Time of incident (e.g., '14:30')
  incident_type: IncidentType; // Renamed for consistency
  severity: IncidentSeverity;
  description: string;
  location: string;
  status: 'Open' | 'Closed' | 'Investigating'; // Defined statuses
  reported_by_user_id: string; // Renamed and linked to User ID
  actions_taken?: string; // Renamed for consistency
  animal_id?: string; // Foreign key to Animal
  investigated_by_user_id?: string; // Who investigated the incident
  investigation_notes?: string;
  closure_date?: Date; // When the incident was closed
}

export interface FirstAidLogEntry extends BaseEntity {
  log_date: Date; // Renamed and changed to Date object
  log_time: string; // Time of log (e.g., '09:15')
  person_name: string; // Renamed for consistency
  incident_type: 'Injury' | 'Illness' | 'Near Miss'; // Renamed for consistency
  description: string;
  treatment: string;
  treated_by_user_id: string; // Renamed and linked to User ID
  location: string;
  outcome: 'Returned to Work' | 'Restricted Duties' | 'Sent Home' | 'GP Visit' | 'Hospital' | 'Ambulance Called' | 'Refused Treatment' | 'Monitoring' | 'None';
  follow_up_required: boolean; // Added for compliance
  follow_up_date?: Date; // Date for follow-up
  follow_up_notes?: string;
}

export interface TimeLogEntry extends BaseEntity {
  user_id: string; // Renamed for consistency
  start_time: Date; // Changed to Date object
  end_time?: Date; // Changed to Date object
  duration_minutes?: number;
  status: 'Active' | 'Completed' | 'Approved' | 'Rejected'; // Added Approved/Rejected for timesheet approval
  approved_by_user_id?: string; // Who approved the timesheet
  approval_date?: Date; // When the timesheet was approved
}

export interface HolidayRequest extends BaseEntity {
  user_id: string; // Renamed for consistency
  start_date: Date; // Changed to Date object
  end_date: Date; // Changed to Date object
  notes: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'; // Added Cancelled
  approved_by_user_id?: string; // Renamed and linked to User ID
  approval_date?: Date; // When the request was approved/rejected
}

export interface Contact extends BaseEntity {
  name: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  contact_type: 'Veterinarian' | 'Emergency' | 'Supplier' | 'Regulatory' | 'Other'; // Added contact type
}

export interface OrganisationProfile extends BaseEntity {
  name: string;
  address: string;
  licence_number: string; // Renamed for consistency and compliance
  licence_expiry_date?: Date; // Added for compliance
  local_authority?: string; // Added for compliance
  last_inspection_date?: Date; // Added for compliance
  next_inspection_date?: Date; // Added for compliance
  contact_email: string; // Renamed for consistency
  contact_phone: string; // Renamed for consistency
  logo_url?: string; // Renamed and made optional
  website_url?: string; // Renamed and made optional
  adoption_url?: string; // Renamed and made optional
  emergency_contact_ids?: string[]; // Links to Contact IDs
  regulatory_body_contact_ids?: string[]; // Links to Contact IDs
}

export interface SystemPreferences extends BaseEntity {
  unit_system: 'Metric' | 'Imperial'; // Renamed for consistency
  temp_unit: 'C' | 'F'; // Renamed for consistency
  dashboard_density: 'Compact' | 'Standard' | 'Comfortable'; // Renamed for consistency
  brand_colour: string; // Renamed for consistency
  session_timeout_minutes: number; // Renamed for consistency
  auto_purge_days: number; // Renamed for consistency
  default_animal_category: AnimalCategory; // Added default category
}

export interface AuditLogEntry extends BaseEntity {
  affected_entity_id?: string; // ID of the entity that was affected (e.g., animal_id, user_id)
  affected_entity_table?: string; // Table name of the affected entity
  action_type: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE'; // Specific action type
  description: string; // Detailed description of the action
  ip_address?: string; // IP address of the user performing the action
  user_agent?: string; // User agent of the client
}

export interface LocalBackupConfig extends BaseEntity {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly'; // Added monthly
  retention_count: number; // Renamed for consistency
  last_backup_date?: Date; // When the last backup was performed
}

export interface LocalBackupEntry extends BaseEntity {
  backup_date: Date; // Renamed and changed to Date object
  size_bytes: number; // Renamed and added unit suffix
  file_path: string; // Path to the backup file (e.g., in IndexedDB or local storage)
}

export interface StaffTraining extends BaseEntity {
  user_id: string;
  training_name: string;
  completion_date: Date;
  expiry_date?: Date;
  certificate_url?: string;
  notes?: string;
  status: 'Valid' | 'Expired' | 'Pending';
}

export interface WeatherData {
  id: string;
  location: string;
  date: Date;
  temperature_c: number;
  weather_description: string;
  wind_speed_mph: number;
  humidity_percent: number;
  precipitation_mm?: number;
  sunrise_time: Date;
  sunset_time: Date;
  updated_at: Date;
}

export interface DailyRoundEntry extends BaseEntity {
  round_date: Date;
  animal_id: string;
  notes?: string;
  is_checked: boolean;
}

export interface BCSData {
  id: string;
  animal_id: string;
  date: Date;
  bcs_score: number;
  notes?: string;
  recorded_by_user_id: string;
  updated_at: Date;
}

export interface AnimalMovement extends BaseEntity {
  animal_id: string;
  movement_type: MovementType;
  movement_reason: MovementReason;
  movement_date: Date;
  source_location: string;
  destination_location: string;
  responsible_user_id: string;
  notes?: string;
  external_party_name?: string;
  external_party_contact?: string;
  licence_reference?: string; // For compliance
  veterinary_approval_id?: string; // Link to a health record if vet approval needed
}
