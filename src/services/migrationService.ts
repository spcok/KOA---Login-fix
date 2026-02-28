
import { db } from '@/src/db';
import { Animal, LogEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const migrateLegacyData = async (userId: string, jsonData: any[]): Promise<{ animalCount: number, logCount: number }> => {
  const animalsToCreate: Animal[] = [];
  const logsToCreate: LogEntry[] = [];

  for (const legacyAnimal of jsonData) {
    const newAnimalId = uuidv4();
    
    const newAnimal: Animal = {
      id: newAnimalId,
      name: legacyAnimal.name || 'Unknown',
      species: legacyAnimal.species || 'Unknown',
      category: legacyAnimal.category || 'uncategorized',
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
      last_modified_by: userId,
      // @ts-ignore
      sex: legacyAnimal.sex || 'Unknown',
      dob: legacyAnimal.hatch_date ? new Date(legacyAnimal.hatch_date) : new Date(),
      is_dob_unknown: !legacyAnimal.hatch_date,
      weight_unit: 'g',
      location: 'Unknown',
      acquisition_date: new Date(),
      origin: 'Unknown',
      is_venomous: false,
      hazard_rating: 'None' as any,
      red_list_status: 'NE' as any,
      archived: false,
      is_quarantine: false,
      display_order: 0,
      is_group_animal: false,
      has_no_id: false,
      image_url: '',
      logs: [],
      documents: []
    };
    animalsToCreate.push(newAnimal);

    if (legacyAnimal.logs && Array.isArray(legacyAnimal.logs)) {
      for (const legacyLog of legacyAnimal.logs) {
        const newLog: LogEntry = {
          id: uuidv4(),
          animal_id: newAnimalId,
          log_date: legacyLog.timestamp ? new Date(legacyLog.timestamp) : new Date(),
          log_type: legacyLog.type || 'GENERAL',
          value: legacyLog.value || '',
          notes: legacyLog.notes || '',
          created_by: userId,
          weight_grams: legacyLog.weight || undefined,
          created_at: new Date(),
          updated_at: new Date(),
          last_modified_by: userId
        };
        logsToCreate.push(newLog);
      }
    }
  }

  await db.animals.bulkPut(animalsToCreate);
  await db.log_entries.bulkPut(logsToCreate);

  return {
    animalCount: animalsToCreate.length,
    logCount: logsToCreate.length,
  };
};
