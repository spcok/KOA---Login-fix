
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
      created_at: new Date().toISOString(),
      // @ts-ignore
      sex: legacyAnimal.sex || 'Unknown',
      hatch_date: legacyAnimal.hatch_date || null,
      weight_unit: 'g',
    };
    animalsToCreate.push(newAnimal);

    if (legacyAnimal.logs && Array.isArray(legacyAnimal.logs)) {
      for (const legacyLog of legacyAnimal.logs) {
        const newLog: LogEntry = {
          id: uuidv4(),
          animal_id: newAnimalId,
          timestamp: legacyLog.timestamp || new Date().toISOString(),
          type: legacyLog.type || 'note',
          notes: legacyLog.notes || '',
          created_by: userId,
          weight: legacyLog.weight || null,
          weight_unit: legacyLog.weight_unit || 'g',
          enclosure: legacyLog.enclosure || null,
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
