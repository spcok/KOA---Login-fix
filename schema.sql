-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('Admin', 'Volunteer', 'Staff', 'Veterinarian');
CREATE TYPE animal_category AS ENUM ('Owls', 'Raptors', 'Mammals', 'Exotics', 'Reptiles', 'Amphibians', 'Fish', 'Invertebrates');
CREATE TYPE log_type AS ENUM ('Weight', 'Feed', 'Health', 'Flight', 'Enrichment', 'Weathering', 'Training', 'Temperature', 'Misting', 'Water', 'Egg', 'General', 'Movement', 'Event', 'Audit');
CREATE TYPE health_record_type AS ENUM ('Observation', 'Medication', 'Quarantine', 'Release', 'Veterinary Exam', 'Diagnosis', 'Treatment', 'Surgery', 'Vaccination', 'Death');
CREATE TYPE health_condition AS ENUM ('Healthy', 'Monitoring', 'Ill', 'Injured', 'Deceased', 'Recovering');
CREATE TYPE hazard_rating AS ENUM ('None', 'Low', 'Medium', 'High', 'Extreme');
CREATE TYPE conservation_status AS ENUM ('LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE', 'NC');
CREATE TYPE shell_quality AS ENUM ('Normal', 'Thin', 'Soft', 'Rough', 'Damaged');
CREATE TYPE egg_outcome AS ENUM ('Incubator', 'Hatched', 'Broken', 'Infertile', 'Disposed', 'Predated');
CREATE TYPE incident_type AS ENUM ('Animal Injury/Illness', 'Staff Injury', 'Public Injury', 'Animal Escape', 'Security Breach', 'Equipment Failure', 'Natural Disaster', 'Other');
CREATE TYPE incident_severity AS ENUM ('Low', 'Medium', 'High', 'Critical', 'Fatal');
CREATE TYPE movement_type AS ENUM ('Acquisition', 'Disposition', 'Transfer', 'Loan In', 'Loan Out', 'Birth', 'Death');
CREATE TYPE movement_reason AS ENUM ('Purchase', 'Donation', 'Breeding Program', 'Rescue', 'Exchange', 'Veterinary Care', 'Exhibit Change', 'Sale', 'Euthanasia', 'Natural Causes', 'Other');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    last_modified_by UUID,
    
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    role user_role NOT NULL,
    job_position TEXT,
    pin TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL,
    signature_image_url TEXT
);

ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT fk_users_last_modified_by FOREIGN KEY (last_modified_by) REFERENCES users(id);

-- Animals Table
CREATE TABLE animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    latin_name TEXT,
    category animal_category NOT NULL,
    dob DATE NOT NULL,
    is_dob_unknown BOOLEAN NOT NULL DEFAULT false,
    sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Unknown')),
    location TEXT NOT NULL,
    description TEXT,
    special_requirements TEXT,
    critical_husbandry_notes TEXT[],
    toxicity TEXT,
    image_url TEXT NOT NULL,
    distribution_map_url TEXT,
    
    weight_unit TEXT NOT NULL CHECK (weight_unit IN ('g', 'oz', 'lbs_oz')),
    summer_weight_g NUMERIC,
    winter_weight_g NUMERIC,
    flying_weight_g NUMERIC,
    
    ring_number TEXT,
    microchip_id TEXT,
    has_no_id BOOLEAN NOT NULL DEFAULT false,
    
    acquisition_date DATE NOT NULL,
    origin TEXT NOT NULL,
    sire_id UUID REFERENCES animals(id),
    dam_id UUID REFERENCES animals(id),
    
    is_venomous BOOLEAN NOT NULL DEFAULT false,
    hazard_rating hazard_rating NOT NULL,
    red_list_status conservation_status NOT NULL,
    
    target_day_temp_c NUMERIC,
    target_night_temp_c NUMERIC,
    target_basking_temp_c NUMERIC,
    target_cool_temp_c NUMERIC,
    target_humidity_min_percent NUMERIC,
    target_humidity_max_percent NUMERIC,
    misting_frequency TEXT,
    water_type TEXT,
    
    archived BOOLEAN NOT NULL DEFAULT false,
    is_quarantine BOOLEAN NOT NULL DEFAULT false,
    quarantine_start_date DATE,
    quarantine_reason TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_group_animal BOOLEAN NOT NULL DEFAULT false,
    group_member_ids UUID[]
);

-- LogEntry Table
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    animal_id UUID NOT NULL REFERENCES animals(id),
    log_date TIMESTAMP WITH TIME ZONE NOT NULL,
    log_type log_type NOT NULL,
    value TEXT NOT NULL,
    notes TEXT,
    attachment_url TEXT,
    
    weight_grams NUMERIC,
    feed_method TEXT,
    has_cast BOOLEAN,
    
    health_record_type health_record_type,
    condition health_condition,
    bcs NUMERIC,
    feather_condition TEXT,
    medication_name TEXT,
    medication_batch TEXT,
    medication_dosage TEXT,
    medication_route TEXT,
    medication_frequency TEXT,
    medication_end_date DATE,
    prescribed_by_user_id UUID REFERENCES users(id),
    cause_of_death TEXT,
    disposal_method TEXT,
    veterinarian_id UUID REFERENCES users(id),
    diagnosis TEXT,
    treatment_details TEXT,
    surgery_details TEXT,
    vaccine_name TEXT,
    vaccine_batch TEXT,
    next_due_date DATE,
    
    temperature_c NUMERIC,
    basking_temp_c NUMERIC,
    cool_temp_c NUMERIC,
    
    weather_description TEXT,
    wind_speed_mph NUMERIC,
    flight_duration_minutes NUMERIC,
    flight_quality TEXT,
    gps_track_url TEXT,
    
    movement_type movement_type,
    movement_reason movement_reason,
    source_location TEXT,
    destination_location TEXT,
    transferred_to_animal_id UUID REFERENCES animals(id),
    transferred_from_animal_id UUID REFERENCES animals(id),
    external_party_name TEXT,
    external_party_contact TEXT,
    
    weathering_start_time TIMESTAMP WITH TIME ZONE,
    weathering_end_time TIMESTAMP WITH TIME ZONE,
    
    egg_count INTEGER,
    egg_weight_grams NUMERIC,
    shell_quality shell_quality,
    egg_outcome egg_outcome,
    
    event_type TEXT,
    event_start_time TIMESTAMP WITH TIME ZONE,
    event_end_time TIMESTAMP WITH TIME ZONE,
    event_duration_minutes NUMERIC,
    event_animal_ids UUID[]
);

-- GlobalDocument Table
CREATE TABLE global_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Licensing', 'Insurance', 'Protocol', 'Safety', 'Veterinary')),
    file_url TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    animal_id UUID REFERENCES animals(id)
);

-- Task Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    title TEXT NOT NULL,
    task_type log_type NOT NULL,
    animal_id UUID REFERENCES animals(id),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    recurring BOOLEAN NOT NULL DEFAULT false,
    assigned_to_user_id UUID REFERENCES users(id),
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_user_id UUID REFERENCES users(id)
);

-- SiteLogEntry Table
CREATE TABLE site_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    log_date TIMESTAMP WITH TIME ZONE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    estimated_cost NUMERIC,
    actual_cost NUMERIC,
    logged_by_user_id UUID NOT NULL REFERENCES users(id),
    completed_by_user_id UUID REFERENCES users(id),
    completion_date TIMESTAMP WITH TIME ZONE
);

-- Incident Table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    incident_date DATE NOT NULL,
    incident_time TEXT NOT NULL,
    incident_type incident_type NOT NULL,
    severity incident_severity NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Open', 'Closed', 'Investigating')),
    reported_by_user_id UUID NOT NULL REFERENCES users(id),
    actions_taken TEXT,
    animal_id UUID REFERENCES animals(id),
    investigated_by_user_id UUID REFERENCES users(id),
    investigation_notes TEXT,
    closure_date TIMESTAMP WITH TIME ZONE
);

-- FirstAidLogEntry Table
CREATE TABLE first_aid_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    log_date DATE NOT NULL,
    log_time TEXT NOT NULL,
    person_name TEXT NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('Injury', 'Illness', 'Near Miss')),
    description TEXT NOT NULL,
    treatment TEXT NOT NULL,
    treated_by_user_id UUID NOT NULL REFERENCES users(id),
    location TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('Returned to Work', 'Restricted Duties', 'Sent Home', 'GP Visit', 'Hospital', 'Ambulance Called', 'Refused Treatment', 'Monitoring', 'None')),
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    follow_up_date DATE,
    follow_up_notes TEXT
);

-- OrganisationProfile Table
CREATE TABLE organisation_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    licence_number TEXT NOT NULL,
    licence_expiry_date DATE,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    adoption_url TEXT,
    emergency_contact_ids UUID[],
    regulatory_body_contact_ids UUID[]
);

-- AuditLogEntry Table
CREATE TABLE audit_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    affected_entity_id UUID,
    affected_entity_table TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE')),
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

-- DailyRoundEntry Table
CREATE TABLE daily_round_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    round_date DATE NOT NULL,
    animal_id UUID NOT NULL REFERENCES animals(id),
    notes TEXT,
    is_checked BOOLEAN NOT NULL DEFAULT false
);

-- BCSData Table
CREATE TABLE bcs_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    animal_id UUID NOT NULL REFERENCES animals(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    bcs_score NUMERIC NOT NULL,
    notes TEXT,
    recorded_by_user_id UUID NOT NULL REFERENCES users(id)
);

-- AnimalMovement Table
CREATE TABLE animal_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID NOT NULL REFERENCES users(id),
    
    animal_id UUID NOT NULL REFERENCES animals(id),
    movement_type movement_type NOT NULL,
    movement_reason movement_reason NOT NULL,
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    source_location TEXT NOT NULL,
    destination_location TEXT NOT NULL,
    responsible_user_id UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    external_party_name TEXT,
    external_party_contact TEXT,
    licence_reference TEXT,
    veterinary_approval_id UUID REFERENCES log_entries(id)
);
