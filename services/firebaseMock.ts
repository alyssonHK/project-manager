
import type { User, Project, Task, Note, TaskNote, ProjectFile } from '../types';
import { TaskStatus } from '../types';

// --- Helper Functions ---
const subscribers: ((user: User | null) => void)[] = [];

const notifySubscribers = (user: User | null) => {
  subscribers.forEach(callback => callback(user));
};

const generateId = () => Math.random().toString(36).substring(2, 15);

const getFromStorage = <T,>(key: string): Map<string, T> => {
  try {
    const item = localStorage.getItem(key);
    return item ? new Map(JSON.parse(item)) : new Map();
  } catch {
    return new Map();
  }
};

const saveToStorage = <T,>(key: string, data: Map<string, T>) => {
  localStorage.setItem(key, JSON.stringify(Array.from(data.entries())));
};

// --- Mock Data Initialization ---
let users = getFromStorage<User>('mock_users');
let projects = getFromStorage<Project>('mock_projects');
let tasks = getFromStorage<Task>('mock_tasks');
let notes = getFromStorage<Note>('mock_notes');
let taskNotes = getFromStorage<TaskNote>('mock_task_notes');
let projectFiles = getFromStorage<ProjectFile>('mock_project_files');
let currentUser: User | null = JSON.parse(localStorage.getItem('mock_currentUser') || 'null');

// --- Auth Mock ---
export const signUp = async (name: string, email: string, password: string): Promise<User> => {
  await new Promise(res => setTimeout(res, 500)); // Simulate network delay
  if (Array.from(users.values()).some(u => u.email === email)) {
    throw new Error('Auth: Email already in use.');
  }
  const uid = `user_${generateId()}`;
  const newUser: User = { uid, name, email };
  users.set(uid, newUser);
  saveToStorage('mock_users', users);
  currentUser = newUser;
  localStorage.setItem('mock_currentUser', JSON.stringify(currentUser));
  notifySubscribers(currentUser);
  return newUser;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  await new Promise(res => setTimeout(res, 500));
  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user) {
    throw new Error('Auth: User not found.');
  }
  currentUser = user;
  localStorage.setItem('mock_currentUser', JSON.stringify(currentUser));
  notifySubscribers(currentUser);
  return user;
};

export const signOut = async (): Promise<void> => {
  await new Promise(res => setTimeout(res, 300));
  currentUser = null;
  localStorage.removeItem('mock_currentUser');
  notifySubscribers(null);
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

// --- Firestore Mock (Projects) ---
export const createProject = async (data: Omit<Project, 'id' | 'ownerUid'>): Promise<Project> => {
  await new Promise(res => setTimeout(res, 500));
  if (!currentUser) throw new Error('Permission denied.');
  const id = `proj_${generateId()}`;
  const newProject: Project = { ...data, id, ownerUid: currentUser.uid };
  projects.set(id, newProject);
  saveToStorage('mock_projects', projects);
  return newProject;
};

export const getProjectsForUser = async (uid: string): Promise<Project[]> => {
  await new Promise(res => setTimeout(res, 500));
  if (!currentUser || currentUser.uid !== uid) throw new Error('Permission denied.');
  return Array.from(projects.values()).filter(p => p.ownerUid === uid);
};

export const getProjectById = async (id: string): Promise<Project | null> => {
    await new Promise(res => setTimeout(res, 500));
    return projects.get(id) || null;
};

export const getProjectByShareId = async (shareId: string): Promise<Project | null> => {
    await new Promise(res => setTimeout(res, 500));
    return Array.from(projects.values()).find(p => p.shareId === shareId && p.isPublic) || null;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(id);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  const updatedProject = { ...project, ...data };
  projects.set(id, updatedProject);
  saveToStorage('mock_projects', projects);
  return updatedProject;
};

export const deleteProject = async (id: string): Promise<void> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(id);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  
  const projectTasks = Array.from(tasks.values()).filter(t => t.projectId === id);
  for (const task of projectTasks) {
    await deleteTask(task.id); // This will also delete task notes
  }

  const projectNotes = Array.from(notes.values()).filter(n => n.projectId === id);
  projectNotes.forEach(n => notes.delete(n.id));

  const files = Array.from(projectFiles.values()).filter(f => f.projectId === id);
  files.forEach(f => projectFiles.delete(f.id));

  projects.delete(id);

  saveToStorage('mock_projects', projects);
  saveToStorage('mock_tasks', tasks);
  saveToStorage('mock_notes', notes);
  saveToStorage('mock_project_files', projectFiles);
};

// --- Firestore Mock (Tasks) ---
export const createTask = async (data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(data.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  const id = `task_${generateId()}`;
  const newTask: Task = { ...data, id, createdAt: new Date().toISOString() };
  tasks.set(id, newTask);
  saveToStorage('mock_tasks', tasks);
  return newTask;
};

export const getTasksForProject = async (projectId: string): Promise<Task[]> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(projectId);
  if (!project) return [];
  if (!project.isPublic && (!currentUser || project.ownerUid !== currentUser.uid)) {}
  return Array.from(tasks.values()).filter(t => t.projectId === projectId);
};

export const updateTask = async (id: string, data: Partial<Task>): Promise<Task> => {
  await new Promise(res => setTimeout(res, 500));
  const task = tasks.get(id);
  if (!task) throw new Error('Task not found.');
  const project = projects.get(task.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  const updatedTask = { ...task, ...data };
  tasks.set(id, updatedTask);
  saveToStorage('mock_tasks', tasks);
  return updatedTask;
};

export const deleteTask = async (id: string): Promise<void> => {
  await new Promise(res => setTimeout(res, 500));
  const task = tasks.get(id);
  if (!task) throw new Error('Task not found.');
  const project = projects.get(task.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  
  const taskNotesToDelete = Array.from(taskNotes.values()).filter(tn => tn.taskId === id);
  taskNotesToDelete.forEach(tn => taskNotes.delete(tn.id));

  tasks.delete(id);
  saveToStorage('mock_tasks', tasks);
  saveToStorage('mock_task_notes', taskNotes);
};

export const generateShareLink = async (projectId: string): Promise<string> => {
    await new Promise(res => setTimeout(res, 300));
    const project = projects.get(projectId);
    if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
    
    const shareId = project.shareId || `share_${generateId()}`;
    const updatedProject = { ...project, shareId, isPublic: true };
    projects.set(projectId, updatedProject);
    saveToStorage('mock_projects', projects);

    const url = new URL(window.location.href);
    return `${url.origin}${url.pathname}#/share/${shareId}`;
};

// --- Firestore Mock (Project Notes) ---
export const createNote = async (data: Omit<Note, 'id' | 'createdAt'>): Promise<Note> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(data.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  const id = `note_${generateId()}`;
  const newNote: Note = { ...data, id, createdAt: new Date().toISOString() };
  notes.set(id, newNote);
  saveToStorage('mock_notes', notes);
  return newNote;
};

export const getNotesForProject = async (projectId: string): Promise<Note[]> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(projectId);
  if (!project) return [];
  if (!project.isPublic && (!currentUser || project.ownerUid !== currentUser.uid)) {}
  return Array.from(notes.values()).filter(n => n.projectId === projectId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const updateNote = async (id: string, data: Partial<Note>): Promise<Note> => {
  await new Promise(res => setTimeout(res, 500));
  const note = notes.get(id);
  if (!note) throw new Error('Note not found.');
  const project = projects.get(note.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  const updatedNote = { ...note, ...data };
  notes.set(id, updatedNote);
  saveToStorage('mock_notes', notes);
  return updatedNote;
};

export const deleteNote = async (id: string): Promise<void> => {
  await new Promise(res => setTimeout(res, 500));
  const note = notes.get(id);
  if (!note) throw new Error('Note not found.');
  const project = projects.get(note.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  notes.delete(id);
  saveToStorage('mock_notes', notes);
};

// --- Firestore Mock (Task Notes) ---
export const getNotesForTask = async (taskId: string): Promise<TaskNote[]> => {
  await new Promise(res => setTimeout(res, 500));
  // Basic permission check: can user see the task?
  const task = tasks.get(taskId);
  if (!task) return [];
  const project = projects.get(task.projectId);
  if(!project) return [];
  if (!project.isPublic && (!currentUser || project.ownerUid !== currentUser.uid)) {
      throw new Error('Permission denied.');
  }
  return Array.from(taskNotes.values()).filter(n => n.taskId === taskId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createTaskNote = async (data: Omit<TaskNote, 'id' | 'createdAt'>): Promise<TaskNote> => {
  await new Promise(res => setTimeout(res, 300));
  const task = tasks.get(data.taskId);
  if (!task) throw new Error('Task not found.');
  const project = projects.get(task.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  
  const id = `tnote_${generateId()}`;
  const newNote: TaskNote = { ...data, id, createdAt: new Date().toISOString() };
  taskNotes.set(id, newNote);
  saveToStorage('mock_task_notes', taskNotes);
  return newNote;
};

export const updateTaskNote = async (id: string, data: Partial<TaskNote>): Promise<TaskNote> => {
  await new Promise(res => setTimeout(res, 300));
  const note = taskNotes.get(id);
  if (!note) throw new Error('Task note not found.');
  const task = tasks.get(note.taskId);
  if(!task) throw new Error('Parent task not found.');
  const project = projects.get(task.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  
  const updatedNote = { ...note, ...data };
  taskNotes.set(id, updatedNote);
  saveToStorage('mock_task_notes', taskNotes);
  return updatedNote;
};

export const deleteTaskNote = async (id: string): Promise<void> => {
  await new Promise(res => setTimeout(res, 300));
   const note = taskNotes.get(id);
  if (!note) throw new Error('Task note not found.');
  const task = tasks.get(note.taskId);
  if(!task) throw new Error('Parent task not found.');
  const project = projects.get(task.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');

  taskNotes.delete(id);
  saveToStorage('mock_task_notes', taskNotes);
};


// --- Firestore Mock (Project Files) ---
export const getFilesForProject = async (projectId: string): Promise<ProjectFile[]> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(projectId);
  if (!project) return [];
  if (!project.isPublic && (!currentUser || project.ownerUid !== currentUser.uid)) {
    throw new Error('Permission denied.');
  }
  return Array.from(projectFiles.values()).filter(f => f.projectId === projectId).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
};

export const uploadProjectFile = async (projectId: string, file: { name: string, type: string, size: number }): Promise<ProjectFile> => {
  await new Promise(res => setTimeout(res, 500));
  const project = projects.get(projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  
  const id = `file_${generateId()}`;
  const newFile: ProjectFile = { 
    id,
    projectId,
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString()
  };
  projectFiles.set(id, newFile);
  saveToStorage('mock_project_files', projectFiles);
  return newFile;
};

export const deleteProjectFile = async (id: string): Promise<void> => {
  await new Promise(res => setTimeout(res, 300));
  const file = projectFiles.get(id);
  if (!file) throw new Error('File not found.');
  const project = projects.get(file.projectId);
  if (!project || !currentUser || project.ownerUid !== currentUser.uid) throw new Error('Permission denied.');
  
  projectFiles.delete(id);
  saveToStorage('mock_project_files', projectFiles);
};
