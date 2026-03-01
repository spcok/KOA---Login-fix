import { supabase } from './supabaseClient';
import { db } from '@/src/db';
import { Table } from 'dexie';

export interface SyncableEntity {
  id: string;
  updated_at?: Date | string;
  created_at?: Date | string;
  [key: string]: any;
}

/**
 * Generic function to sync a table from Supabase down to Dexie.
 * It fetches all records (or records updated since last sync) and bulk puts them into Dexie.
 */
export async function syncTable<T extends SyncableEntity>(
  tableName: string,
  dexieTable: Table<T, string>,
  lastSyncDate?: string
): Promise<void> {
  try {
    let query = supabase.from(tableName).select('*');
    
    if (lastSyncDate) {
      query = query.gte('updated_at', lastSyncDate);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42501') {
        console.warn(`[Sync Warning] RLS Access Denied for ${tableName}. Skipping sync.`);
        return;
      }
      console.error(`[Sync Error] Failed to fetch ${tableName} from Supabase:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      await dexieTable.bulkPut(data as T[]);
      console.log(`[Sync Success] Synced ${data.length} records to local ${tableName}.`);
    }
  } catch (err) {
    console.error(`[Sync Exception] Table ${tableName}:`, err);
    throw err;
  }
}

/**
 * Generic function to create a record in Supabase and then in Dexie.
 */
export async function createRecord<T extends SyncableEntity>(
  tableName: string,
  dexieTable: Table<T, string>,
  record: T
): Promise<T> {
  try {
    const recordToInsert = {
      ...record,
      updated_at: new Date().toISOString(),
      created_at: record.created_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(tableName)
      .insert(recordToInsert)
      .select()
      .single();

    if (error) throw error;

    const savedRecord = data as T;
    await dexieTable.put(savedRecord);
    return savedRecord;
  } catch (err) {
    console.error(`[Create Error] Table ${tableName}:`, err);
    throw err;
  }
}

/**
 * Generic function to update a record in Supabase and then in Dexie.
 */
export async function updateRecord<T extends SyncableEntity>(
  tableName: string,
  dexieTable: Table<T, string>,
  id: string,
  updates: Partial<T>
): Promise<T> {
  try {
    const recordToUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(tableName)
      .update(recordToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updatedRecord = data as T;
    await dexieTable.put(updatedRecord);
    return updatedRecord;
  } catch (err) {
    console.error(`[Update Error] Table ${tableName}:`, err);
    throw err;
  }
}

/**
 * Generic function to delete a record in Supabase and then in Dexie.
 */
export async function deleteRecord<T extends SyncableEntity>(
  tableName: string,
  dexieTable: Table<T, string>,
  id: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;

    await dexieTable.delete(id);
  } catch (err) {
    console.error(`[Delete Error] Table ${tableName}:`, err);
    throw err;
  }
}

/**
 * Perform a full sync of all tables.
 */
export async function syncAllTables(): Promise<void> {
  const tablesToSync = [
    { name: 'users', table: db.users },
    { name: 'animals', table: db.animals },
    { name: 'log_entries', table: db.log_entries },
    { name: 'global_documents', table: db.documents },
    { name: 'tasks', table: db.tasks },
    { name: 'site_log_entries', table: db.site_log_entries },
    { name: 'incidents', table: db.incidents },
    { name: 'first_aid_log_entries', table: db.first_aid_log_entries },
    { name: 'organisation_profiles', table: db.organisation_profiles },
    { name: 'audit_log_entries', table: db.audit_log_entries },
    { name: 'daily_round_entries', table: db.daily_round_entries },
    { name: 'bcs_data', table: db.bcs_data },
    { name: 'animal_movements', table: db.animal_movements },
    { name: 'contacts', table: db.contacts },
    { name: 'holiday_requests', table: db.holiday_requests },
  ];

  const syncPromises = tablesToSync.map(({ name, table }) => syncTable(name, table as any));
  await Promise.all(syncPromises);
  console.log('[Sync] All tables synced successfully.');
}

// Export a unified data service object
export const dataService = {
  syncTable,
  createRecord,
  updateRecord,
  deleteRecord,
  syncAllTables
};
