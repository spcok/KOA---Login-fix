import React, { createContext, useContext } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/src/db';
import { createRecord, updateRecord, deleteRecord } from '@/src/services/dataService';
import { Animal, LogEntry, Task, User, SiteLogEntry, Incident, FirstAidLogEntry, DailyRoundEntry, BCSData, AnimalMovement, OrganisationProfile, Contact, HolidayRequest, GlobalDocument, LogType, AnimalCategory } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/src/store/authStore';
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS, DEFAULT_EVENT_TYPES } from '@/constants';

export const useAppDataValues = () => {
  const { user: authUser, profile: authProfile } = useAuthStore();

  // Reactive data feeds from Dexie
  const animals = useLiveQuery(() => db.animals.toArray(), []) || [];
  const log_entries = useLiveQuery(() => db.log_entries.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const site_log_entries = useLiveQuery(() => db.site_log_entries.toArray(), []) || [];
  const incidents = useLiveQuery(() => db.incidents.toArray(), []) || [];
  const first_aid_log_entries = useLiveQuery(() => db.first_aid_log_entries.toArray(), []) || [];
  const daily_round_entries = useLiveQuery(() => db.daily_round_entries.toArray(), []) || [];
  const bcs_data = useLiveQuery(() => db.bcs_data.toArray(), []) || [];
  const animal_movements = useLiveQuery(() => db.animal_movements.toArray(), []) || [];
  const staff_training = useLiveQuery(() => db.staff_training.toArray(), []) || [];
  const orgProfile = useLiveQuery(async () => {
    const profiles = await db.organisation_profiles.toArray();
    return profiles[0];
  }, []) || undefined;
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const holidayRequests = useLiveQuery(() => db.holiday_requests.toArray(), []) || [];
  const documents = useLiveQuery(() => db.documents.toArray(), []) || [];

  // Find the current user's profile from the users table
  const currentUser = React.useMemo(() => {
    if (!authProfile) return null;
    return users.find(u => u.id === authProfile.id) || authProfile;
  }, [authProfile, users]);

  const [sortOption, setSortOption] = React.useState<'alpha-asc' | 'alpha-desc' | 'custom'>('alpha-asc');

  // --- Mutation Functions ---
  const addAnimal = async (animal: Omit<Animal, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newAnimal: Animal = {
      ...animal,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
      logs: [],
      documents: []
    };
    await createRecord('animals', db.animals, newAnimal);
  };

  const updateAnimal = async (updates: Partial<Animal>) => {
    if (!currentUser) throw new Error('User not authenticated');
    await updateRecord('animals', db.animals, updates.id!, { ...updates, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const deleteAnimal = async (id: string) => {
    await deleteRecord('animals', db.animals, id);
  };

  const archiveAnimal = async (id: string, reason: string, type: 'Disposition' | 'Death') => {
    if (!currentUser) throw new Error('User not authenticated');
    
    // 1. Update animal record
    await updateRecord('animals', db.animals, id, { 
      archived: true, 
      updated_at: new Date(), 
      last_modified_by: currentUser.id 
    });

    // 2. Create a formal log entry for the archive event
    const logEntry: Omit<LogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'> = {
      animal_id: id,
      log_date: new Date(),
      log_type: type === 'Death' ? LogType.HEALTH : LogType.MOVEMENT,
      value: `${type}: ${reason}`,
      notes: `Subject archived from active registry. Reason: ${reason}`,
      user_initials: currentUser.initials,
      ...(type === 'Death' ? { health_record_type: 'Death' as any } : { movement_type: 'Disposition' as any })
    };

    await addLogEntry(id, logEntry);
  };

  const addLogEntry = async (animalId: string, entry: Omit<LogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newEntry: LogEntry = {
      ...entry,
      id: uuidv4(),
      animal_id: animalId,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('log_entries', db.log_entries, newEntry);
  };

  const updateLogEntry = async (updates: Partial<LogEntry>) => {
    if (!currentUser) throw new Error('User not authenticated');
    await updateRecord('log_entries', db.log_entries, updates.id!, { ...updates, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const deleteLogEntry = async (id: string) => {
    await deleteRecord('log_entries', db.log_entries, id);
  };

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newTask: Task = {
      ...task,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('tasks', db.tasks, newTask);
  };

  const updateTask = async (updates: Partial<Task>) => {
    if (!currentUser) throw new Error('User not authenticated');
    await updateRecord('tasks', db.tasks, updates.id!, { ...updates, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const deleteTask = async (id: string) => {
    await deleteRecord('tasks', db.tasks, id);
  };

  const addTasks = async (newTasks: Task[]) => {
    if (!currentUser) throw new Error('User not authenticated');
    for (const task of newTasks) {
      const taskWithMeta: Task = {
        ...task,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: currentUser.id,
        last_modified_by: currentUser.id,
      };
      await createRecord('tasks', db.tasks, taskWithMeta);
    }
  };

  const addSiteLog = async (entry: Omit<SiteLogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by' | 'logged_by_user_id'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newEntry: SiteLogEntry = {
      ...entry,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
      logged_by_user_id: currentUser.id,
    };
    await createRecord('site_log_entries', db.site_log_entries, newEntry);
  };

  const addIncident = async (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by' | 'reported_by_user_id'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newIncident: Incident = {
      ...incident,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
      reported_by_user_id: currentUser.id,
    };
    await createRecord('incidents', db.incidents, newIncident);
  };

  const addUser = async (user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newUser: User = {
      ...user,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('users', db.users, newUser);
  };

  const updateUsers = async (updates: Partial<User>) => {
    if (!currentUser) throw new Error('User not authenticated');
    await updateRecord('users', db.users, updates.id!, { ...updates, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const deleteUser = async (id: string) => {
    await deleteRecord('users', db.users, id);
  };

  const updateOrgProfile = async (updates: Partial<OrganisationProfile>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const id = updates.id?.toString() || orgProfile?.id || '00000000-0000-0000-0000-000000000001';
    await updateRecord('organisation_profiles', db.organisation_profiles, id, { ...updates, id, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const addContact = async (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newContact: Contact = {
      ...contact,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('contacts', db.contacts, newContact);
  };

  const updateContact = async (updates: Partial<Contact>) => {
    if (!currentUser) throw new Error('User not authenticated');
    await updateRecord('contacts', db.contacts, updates.id!, { ...updates, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const deleteContact = async (id: string) => {
    await deleteRecord('contacts', db.contacts, id);
  };

  const addHolidayRequest = async (request: Omit<HolidayRequest, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newRequest: HolidayRequest = {
      ...request,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('holiday_requests', db.holiday_requests, newRequest);
  };

  const updateHolidayRequest = async (updates: Partial<HolidayRequest>) => {
    if (!currentUser) throw new Error('User not authenticated');
    await updateRecord('holiday_requests', db.holiday_requests, updates.id!, { ...updates, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const deleteHolidayRequest = async (id: string) => {
    await deleteRecord('holiday_requests', db.holiday_requests, id);
  };

  const addDocument = async (doc: Omit<GlobalDocument, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newDoc: GlobalDocument = {
      ...doc,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('global_documents', db.documents, newDoc);
  };

  const deleteDocument = async (id: string) => {
    await deleteRecord('global_documents', db.documents, id);
  };

  const addFirstAidLog = async (entry: Omit<FirstAidLogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newEntry: FirstAidLogEntry = {
      ...entry,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('first_aid_log_entries', db.first_aid_log_entries, newEntry);
  };

  const addDailyRound = async (entry: Omit<DailyRoundEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newEntry: DailyRoundEntry = {
      ...entry,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('daily_round_entries', db.daily_round_entries, newEntry);
  };

  const addBCSData = async (data: Omit<BCSData, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newData: BCSData = {
      ...data,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('bcs_data', db.bcs_data, newData);
  };

  const addAnimalMovement = async (movement: Omit<AnimalMovement, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newMovement: AnimalMovement = {
      ...movement,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('animal_movements', db.animal_movements, newMovement);
  };

  const addStaffTraining = async (training: Omit<StaffTraining, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    const newTraining: StaffTraining = {
      ...training,
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: currentUser.id,
      last_modified_by: currentUser.id,
    };
    await createRecord('staff_training', db.staff_training, newTraining);
  };

  const updateStaffTraining = async (updates: Partial<StaffTraining>) => {
    if (!currentUser) throw new Error('User not authenticated');
    await updateRecord('staff_training', db.staff_training, updates.id!, { ...updates, updated_at: new Date(), last_modified_by: currentUser.id });
  };

  const deleteStaffTraining = async (id: string) => {
    await deleteRecord('staff_training', db.staff_training, id);
  };

  return {
    currentUser,
    animals,
    log_entries,
    tasks,
    users,
    site_log_entries,
    siteLogs: site_log_entries, // Alias for backward compatibility
    incidents,
    first_aid_log_entries,
    daily_round_entries,
    bcs_data,
    animal_movements,
    staff_training,
    orgProfile,
    contacts,
    holidayRequests,
    documents,
    sortOption,
    setSortOption,
    foodOptions: DEFAULT_FOOD_OPTIONS,
    feedMethods: DEFAULT_FEED_METHODS,
    eventTypes: DEFAULT_EVENT_TYPES,
    addAnimal,
    updateAnimal,
    deleteAnimal,
    archiveAnimal,
    addLogEntry,
    updateLogEntry,
    deleteLogEntry,
    addTask,
    addTasks,
    updateTask,
    deleteTask,
    addSiteLog,
    addIncident,
    addUser,
    updateUsers,
    deleteUser,
    updateOrgProfile,
    addContact,
    updateContact,
    deleteContact,
    addHolidayRequest,
    updateHolidayRequest,
    deleteHolidayRequest,
    addDocument,
    deleteDocument,
    addFirstAidLog,
    addDailyRound,
    addBCSData,
    addAnimalMovement,
    addStaffTraining,
    updateStaffTraining,
    deleteStaffTraining,
  };
};

// Define the shape of the context data
export interface AppContextType {
  currentUser: any;
  animals: Animal[];
  log_entries: LogEntry[];
  tasks: Task[];
  users: User[];
  site_log_entries: SiteLogEntry[];
  siteLogs: SiteLogEntry[];
  incidents: Incident[];
  first_aid_log_entries: FirstAidLogEntry[];
  daily_round_entries: DailyRoundEntry[];
  bcs_data: BCSData[];
  animal_movements: AnimalMovement[];
  staff_training: StaffTraining[];
  orgProfile: OrganisationProfile | undefined;
  contacts: Contact[];
  holidayRequests: HolidayRequest[];
  documents: GlobalDocument[];
  sortOption: 'alpha-asc' | 'alpha-desc' | 'custom';
  setSortOption: (option: 'alpha-asc' | 'alpha-desc' | 'custom') => void;
  foodOptions: typeof DEFAULT_FOOD_OPTIONS;
  feedMethods: typeof DEFAULT_FEED_METHODS;
  eventTypes: string[];

  addAnimal: (animal: Omit<Animal, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by' | 'logs' | 'documents'>) => Promise<void>;
  updateAnimal: (updates: Partial<Animal>) => Promise<void>;
  deleteAnimal: (id: string) => Promise<void>;
  archiveAnimal: (id: string, reason: string, type: 'Disposition' | 'Death') => Promise<void>;
  addLogEntry: (animalId: string, entry: Omit<LogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  updateLogEntry: (updates: Partial<LogEntry>) => Promise<void>;
  deleteLogEntry: (id: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  addTasks: (tasks: Task[]) => Promise<void>;
  updateTask: (updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addSiteLog: (entry: Omit<SiteLogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by' | 'logged_by_user_id'>) => Promise<void>;
  addIncident: (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by' | 'reported_by_user_id'>) => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  updateUsers: (updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateOrgProfile: (updates: Partial<OrganisationProfile>) => Promise<void>;
  addContact: (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  updateContact: (updates: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addHolidayRequest: (request: Omit<HolidayRequest, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  updateHolidayRequest: (updates: Partial<HolidayRequest>) => Promise<void>;
  deleteHolidayRequest: (id: string) => Promise<void>;
  addDocument: (doc: Omit<GlobalDocument, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addFirstAidLog: (entry: Omit<FirstAidLogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  addDailyRound: (entry: Omit<DailyRoundEntry, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  addBCSData: (data: Omit<BCSData, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  addAnimalMovement: (movement: Omit<AnimalMovement, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  addStaffTraining: (training: Omit<StaffTraining, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_modified_by'>) => Promise<void>;
  updateStaffTraining: (updates: Partial<StaffTraining>) => Promise<void>;
  deleteStaffTraining: (id: string) => Promise<void>;
}

// Create the context
export const AppContext = createContext<AppContextType | null>(null);

// Create the provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appData = useAppDataValues();

  return (
    <AppContext.Provider value={appData as AppContextType}>
      {children}
    </AppContext.Provider>
  );
};

// Create the consumer hook
export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
};
