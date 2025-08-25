
export enum TaskStatus {
  ToDo = 'A Fazer',
  InProgress = 'Em Andamento',
  Done = 'Concluído',
}

export interface User {
  uid: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name:string;
  description: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  ownerUid: string;
  shareId?: string;
  isPublic?: boolean;
  imageUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  createdAt: string; // ISO string
}

export interface Note {
  id: string;
  projectId: string;
  content: string;
  createdAt: string; // ISO string
}

// New type for notes inside a task
export interface TaskNote {
    id: string;
    taskId: string;
    content: string;
    createdAt: string; // ISO string
}

// New type for project file attachments
export interface ProjectFile {
    id: string;
    projectId: string;
    name: string;
    type: string;
    size: number; // in bytes
    uploadedAt: string; // ISO string
}
