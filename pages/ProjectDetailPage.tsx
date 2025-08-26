import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateNote, deleteNote } from '../services/firebaseNotes';
import { createNote as apiCreateNote, getNotesForProject } from '../services/firebaseNotes';
import { getProjectById, updateProject } from '../services/firebaseProjects';
import { getTasksForProject, createTask as apiCreateTask, updateTask, deleteTask as apiDeleteTask } from '../services/firebaseTasks';
import { getNotesForTask, createTaskNote, updateTaskNote, deleteTaskNote } from '../services/firebaseTaskNotes';
import type { Project, Task, Note, ProjectFile, TaskNote } from '../types';
import { TaskStatus } from '../types';
import { TASK_STATUSES } from '../constants';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { deleteProject as apiDeleteProject } from '../services/firebaseProjects';
import { uploadProjectFile, getFilesForProject, uploadProjectImage } from '../services/firebaseProjectFiles';

// Hook para controlar a sidebar (deve ficar fora de qualquer componente)
function useSidebarToggle(defaultOpen = true) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = () => setOpen(o => !o);
  return { open, toggle };
}

const COLORS = {
  [TaskStatus.ToDo]: '#f97316', // orange-500
  [TaskStatus.InProgress]: '#3b82f6', // blue-500
  [TaskStatus.Done]: '#22c55e', // green-500
};

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-secondary p-4 rounded-lg flex items-center space-x-4">
        <div className="bg-gray-900/50 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </div>
);

const TaskCard: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => (
    <button onClick={onClick} className="w-full text-left bg-secondary p-4 rounded-md mb-3 hover:bg-gray-600 transition-colors duration-200 cursor-pointer">
        <h4 className="font-bold">{task.title}</h4>
        <p className="text-sm text-text-secondary my-2 line-clamp-2">{task.description}</p>
        <div className="text-xs text-gray-400 mt-2">Criado em: {new Date(task.createdAt).toLocaleDateString()}</div>
    </button>
);

const NoteCard: React.FC<{ note: Note; onUpdate: (noteId: string, content: string) => void; onDelete: (noteId: string) => void }> = ({ note, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(note.content);

    const handleUpdate = () => {
        if (content.trim()) {
            onUpdate(note.id, content);
            setIsEditing(false);
        }
    };

    return (
        <div className="bg-secondary p-4 rounded-lg">
            {isEditing ? (
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full bg-gray-900/80 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent" />
            ) : (
                <p className="text-text-secondary whitespace-pre-wrap">{note.content}</p>
            )}
            <div className="text-xs text-gray-500 mt-3">Criado em: {new Date(note.createdAt).toLocaleString()}</div>
            <div className="flex items-center justify-end space-x-2 mt-3">
                {isEditing ? (
                    <>
                        <button onClick={() => { setIsEditing(false); setContent(note.content); }} className="text-sm px-3 py-1 rounded-md bg-gray-600 hover:bg-gray-700">Cancelar</button>
                        <button onClick={handleUpdate} className="text-sm px-3 py-1 rounded-md bg-primary hover:bg-blue-700">Salvar</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-accent">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.5 3.464z" /></svg>
                        </button>
                        <button onClick={() => onDelete(note.id)} className="text-gray-400 hover:text-red-500">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const TaskDetailModal: React.FC<{
  task: Task;
  onClose: () => void;
  onUpdateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}> = ({ task, onClose, onUpdateTask, onDeleteTask }) => {
  const [status, setStatus] = useState(task.status);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description);
  }, [task]);

  useEffect(() => {
    const fetchNotes = async () => {
      setLoadingNotes(true);
      const taskNotes = await getNotesForTask(task.id);
      setNotes(taskNotes);
      setLoadingNotes(false);
    };
    fetchNotes();
  }, [task.id]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setStatus(newStatus);
    await onUpdateTask(task.id, { status: newStatus });
  };

  const handleDelete = async () => {
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
      await onDeleteTask(task.id);
      onClose();
    }
  };

  const handleEditSave = async () => {
    setSaving(true);
    await onUpdateTask(task.id, { title: editTitle, description: editDescription });
    setSaving(false);
    setEditMode(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
        if (!newNoteContent.trim()) return;
        const newNote = await createTaskNote({ taskId: task.id, content: newNoteContent });
        setNotes(prev => [newNote, ...prev]);
        setNewNoteContent('');
    };

    const handleUpdateNote = async (noteId: string, content: string) => {
        await updateTaskNote(noteId, { content });
        setNotes(notes.map(n => n.id === noteId ? { ...n, content } : n));
    };

    const handleDeleteNote = async (noteId: string) => {
        await deleteTaskNote(noteId);
        setNotes(notes.filter(n => n.id !== noteId));
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
                <div className="flex items-center gap-2 mb-2">
                  {editMode ? (
                    <input
                      className="text-2xl font-bold text-accent bg-secondary rounded px-2 py-1 w-full max-w-xs"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      maxLength={100}
                      autoFocus
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-accent">"{task.title}"</h2>
                  )}
                  <button onClick={() => setEditMode(e => !e)} title="Editar nome e descrição" className="ml-2 text-accent hover:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.5 3.464z" /></svg>
                  </button>
                </div>
                {editMode ? (
                  <>
                    <textarea
                      className="w-full bg-secondary border border-gray-600 rounded-md px-3 py-2 mb-2 text-text-primary"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex gap-2 mb-4">
                      <button onClick={handleEditSave} disabled={saving} className="button button-primary">Salvar</button>
                      <button onClick={() => { setEditMode(false); setEditTitle(task.title); setEditDescription(task.description); }} className="button button-secondary">Cancelar</button>
                    </div>
                  </>
                ) : (
                  <p className="text-text-secondary mb-4">{task.description}</p>
                )}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-700 pb-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Status</label>
                            <select
                              value={status}
                              onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                              className="mt-1 px-3 py-2 bg-secondary border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-w-[140px] w-full md:w-44 text-base"
                            >
                              {Object.values(TaskStatus).map(s => (
                                <option key={s} value={s}>{TASK_STATUSES[s]}</option>
                              ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Criada em</label>
                            <div className="mt-1 text-text-secondary">{new Date(task.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Anotações da Tarefa</h3>
                    <form onSubmit={handleAddNote} className="flex gap-2 mb-2">
                        <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} rows={2} placeholder="Adicionar uma anotação..." className="flex-1 bg-secondary border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent" />
                        <button type="submit" className="button button-primary">Adicionar</button>
                    </form>
                    {loadingNotes ? (
                        <p>Carregando anotações...</p>
                    ) : notes.length === 0 ? (
                        <p className="text-text-secondary text-sm">Nenhuma anotação para esta tarefa.</p>
                    ) : (
                        <div className="space-y-2">
                            {notes.map(note => (
                                <NoteCard key={note.id} note={note} onUpdate={async (id, content) => { await updateTaskNote(id, { content }); setNotes(await getNotesForTask(task.id)); }} onDelete={async (id) => { await deleteTaskNote(id); setNotes(await getNotesForTask(task.id)); }} />
                            ))}
                        </div>
                    )}
                </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <button onClick={handleDelete} className="button button-danger">Excluir Tarefa</button>
        </div>
      </div>
    </div>
  );
}

const ProjectFiles: React.FC<{ projectId: string; files: ProjectFile[]; onFileChange: () => void }> = ({ projectId, files, onFileChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadProjectFile(projectId, file);
      onFileChange();
    } catch (err) {
      alert('Erro ao enviar arquivo');
    }
  };
  // ...restante do componente ProjectFiles...
};

// Componente da barra lateral
const ProjectSidebar: React.FC<{
  notes: Note[];
  files: ProjectFile[];
  onAddNote: (content: string) => void;
  onUploadFile: (file: File) => void;
  open: boolean;
  toggle: () => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (id: string, content: string) => void;
}> = ({ notes, files, onAddNote, onUploadFile, open, toggle, onDeleteNote, onUpdateNote }) => {
  const [noteContent, setNoteContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) {
    return (
      // botão quando a sidebar está fechada — centralizado verticalmente
      <button onClick={toggle} className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-accent text-white rounded-l px-2 py-1 shadow-lg">&lt;</button>
    );
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteContent.trim()) {
      onAddNote(noteContent);
      setNoteContent('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
  <aside className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-gray-700 flex flex-col shadow-xl transition-all duration-300 z-40 pt-16">
      <button onClick={toggle} className="absolute left-0 -translate-x-full top-1/2 z-50 bg-accent text-white rounded-r px-2 py-1 shadow-lg">&gt;</button>
      <div className="flex-1 flex flex-col divide-y divide-gray-700 h-full">
        {/* Notas do Projeto */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto" style={{ maxHeight: '50%' }}>
          <h3 className="text-lg font-bold mb-2">Notas do Projeto</h3>
          <form onSubmit={handleAddNote} className="mb-3">
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={2} placeholder="Adicionar nota..." className="w-full bg-secondary p-2 rounded-md mb-2" />
            <button type="submit" className="w-full bg-primary text-white py-1 rounded-md">Adicionar</button>
          </form>
          <div className="space-y-2 overflow-y-auto">
            {notes.length === 0 && <p className="text-sm text-gray-500">Nenhuma nota.</p>}
            {notes.map(note => (
              <SidebarNoteItem key={note.id} note={note} onUpdate={onUpdateNote} onDelete={onDeleteNote} />
            ))}
          </div>
        </div>
        {/* Anexos do Projeto */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto" style={{ maxHeight: '50%' }}>
          <h3 className="text-lg font-bold mb-2">Anexos do Projeto</h3>
          <label className="block mb-2">
            <span className="sr-only">Escolher anexo</span>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30" />
          </label>
          <div className="space-y-2 overflow-y-auto">
            {files.length === 0 && <p className="text-sm text-gray-500">Nenhum anexo.</p>}
            {files.map(file => (
              <div key={file.id} className="bg-secondary p-2 rounded-md text-sm flex items-center justify-between">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer flex-1">
                  {file.name.length > 24 ? file.name.slice(0, 21) + '...' : file.name}
                </a>
                <span className="text-xs text-gray-400 ml-2">{new Date(file.uploadedAt).toLocaleDateString()}</span>
                <button onClick={async () => {
                  if(window.confirm('Tem certeza que deseja excluir este arquivo?')) {
                    try {
                      await import('../services/firebaseProjectFiles').then(mod => mod.deleteProjectFile(file.id, file.projectId, file.name));
                      // Atualize a lista de arquivos após exclusão
                      if (typeof window !== 'undefined' && window.location) window.location.reload();
                    } catch (error) {
                      alert('Falha ao excluir o arquivo.');
                    }
                  }
                }} className="ml-2 text-gray-400 hover:text-red-500" title="Excluir anexo">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

const SidebarNoteItem: React.FC<{ note: Note; onUpdate: (id: string, content: string) => void; onDelete: (id: string) => void }> = ({ note, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);

  return (
    <div className="bg-secondary p-2 rounded-md text-sm mb-2">
      {isEditing ? (
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={2} className="w-full bg-gray-900/80 p-2 rounded-md mb-2" />
      ) : (
        <div className="text-text-secondary whitespace-pre-wrap">{note.content}</div>
      )}
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleDateString()}</div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button onClick={() => { onUpdate(note.id, content); setIsEditing(false); }} className="text-xs text-primary">Salvar</button>
              <button onClick={() => { setIsEditing(false); setContent(note.content); }} className="text-xs text-gray-400">Cancelar</button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="text-xs text-accent">Editar</button>
              <button onClick={() => onDelete(note.id)} className="text-xs text-red-500">Excluir</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


const ProjectDetailPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskNotesMap, setTaskNotesMap] = useState<Record<string, TaskNote[]>>({});
    const [notes, setNotes] = useState<Note[]>([]);
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'files'>('tasks');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Task Creation State
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');

    // Note Creation State
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    // Estado para modal de edição
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', description: '', startDate: '', endDate: '', imageUrl: '' });
    const [editImageFile, setEditImageFile] = useState<File | null>(null);

    // Abrir modal de edição com dados atuais
    const openEditModal = () => {
      if (!project) return;
      setEditData({
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        imageUrl: project.imageUrl || ''
      });
      setEditImageFile(null);
      setIsEditing(true);
    };

    // Salvar edição
    const handleEditSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!project) return;
      try {
        let imageUrl = editData.imageUrl;
        if (editImageFile) {
          imageUrl = await uploadProjectImage(project.id, editImageFile);
        }
        await updateProject(project.id, { ...editData, imageUrl });
        setProject(prev => prev ? { ...prev, ...editData, imageUrl } : prev);
        setIsEditing(false);
      } catch (err) {
        alert('Erro ao atualizar projeto.');
      }
    };

    const fetchProjectData = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const [proj, projTasks, projNotes, projFiles] = await Promise.all([
                getProjectById(projectId),
                getTasksForProject(projectId),
                getNotesForProject(projectId),
                getFilesForProject(projectId),
            ]);
            if (proj) {
                setProject(proj);
                setTasks(projTasks);
                setNotes(projNotes);
                setFiles(projFiles);
                // Buscar notas de todas as tarefas
                const notesMap: Record<string, TaskNote[]> = {};
                await Promise.all(
                  projTasks.map(async (task) => {
                    try {
                      const notes = await getNotesForTask(task.id);
                      notesMap[task.id] = notes;
                    } catch {
                      notesMap[task.id] = [];
                    }
                  })
                );
                setTaskNotesMap(notesMap);
            } else {
                setError('Projeto não encontrado.');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do projeto.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
        const originalTasks = [...tasks];
        const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, ...data } : t);
        setTasks(updatedTasks);
        if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask({...selectedTask, ...data});
        }
        try {
            await updateTask(taskId, data);
        } catch (error) {
            setTasks(originalTasks);
            alert("Falha ao atualizar tarefa.");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        const originalTasks = [...tasks];
        setTasks(tasks.filter(t => t.id !== taskId));
        try {
            await apiDeleteTask(taskId);
        } catch (error) {
            setTasks(originalTasks);
            alert("Falha ao excluir tarefa.");
        }
    };
    
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !newTaskTitle) return;
        try {
            const newTask = await apiCreateTask({ title: newTaskTitle, description: newTaskDesc, projectId, status: TaskStatus.ToDo });
            setTasks(prev => [...prev, newTask]);
            setNewTaskTitle('');
            setNewTaskDesc('');
            setIsCreatingTask(false);
        } catch (error) {
            alert("Falha ao criar tarefa.");
        }
    };

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !newNoteContent.trim()) return;
        try {
            const newNote = await apiCreateNote({ content: newNoteContent, projectId });
            setNotes(prev => [newNote, ...prev]);
            setNewNoteContent('');
            setIsCreatingNote(false);
        } catch (error) {
            alert("Falha ao criar nota.");
        }
    };

    const handleUpdateNote = async (noteId: string, content: string) => {
        const originalNotes = [...notes];
        setNotes(notes.map(n => n.id === noteId ? { ...n, content } : n));
        try {
            await updateNote(noteId, { content });
        } catch (error) {
            setNotes(originalNotes);
            alert("Falha ao atualizar nota.");
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta nota?")) {
            const originalNotes = [...notes];
            setNotes(notes.filter(n => n.id !== noteId));
            try {
                await deleteNote(noteId);
            } catch (error) {
                setNotes(originalNotes);
                alert("Falha ao excluir nota.");
            }
        }
    };
    
    const handleDeleteProject = async () => {
        if (project && window.confirm(`Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) {
            try {
                await apiDeleteProject(project.id);
                navigate('/dashboard');
            } catch (error) {
                alert("Falha ao excluir o projeto.");
            }
        }
    };
    
    const handleShare = async () => {
        if (!project) return;
        try {
            const link = await generateShareLink(project.id);
            navigator.clipboard.writeText(link)
                .then(() => alert(`Link de compartilhamento copiado!\n${link}`))
                .catch(() => alert(`Aqui está seu link:\n${link}`));
             await fetchProjectData(); // Refresh to show public status
        } catch (error) {
            alert('Falha ao gerar link de compartilhamento.');
        }
    };

    const taskStats = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter(t => t.status === TaskStatus.Done).length;
        const pending = total - done;
        const distribution = TASK_STATUSES.map(status => ({
            name: status,
            value: tasks.filter(t => t.status === status).length
        })).filter(item => item.value > 0);
        return { total, done, pending, distribution };
    }, [tasks]);

    // Agrupa tarefas por status
    const tasksByStatus = TASK_STATUSES.reduce((acc, status) => {
      acc[status] = tasks.filter(t => t.status === status);
      return acc;
    }, {} as Record<string, Task[]>);

    // Handler de drag and drop
    const onDragEnd = async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination || source.droppableId === destination.droppableId) return;
      const newStatus = destination.droppableId as TaskStatus;
      await handleUpdateTask(draggableId, { status: newStatus });
    };

    const sidebar = useSidebarToggle(true); // Chame o hook logo no início do componente

    if (loading) return <div className="text-center p-10">Carregando...</div>;
    if (error) return <div className="text-center p-10 text-red-400">{error}</div>;
    if (!project) return <div className="text-center p-10">Projeto não encontrado.</div>;

    return (
        <div className="flex flex-row h-full">
            <div className={`flex-1 space-y-6 transition-all duration-300 ${sidebar.open ? 'mr-56' : ''}`}>
                {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />}
                {isEditing && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg">
                      <h2 className="text-xl font-bold mb-4">Editar Projeto</h2>
                      <form onSubmit={handleEditSave} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary">Imagem do Projeto</label>
                          <label className="block mt-1">
                            <span className="sr-only">Escolher imagem</span>
                            <input type="file" accept="image/*" onChange={e => setEditImageFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30" />
                          </label>
                          {editData.imageUrl && !editImageFile && (
                            <img src={editData.imageUrl} alt="Imagem do Projeto" className="w-full h-32 object-cover rounded-md mt-2" />
                          )}
                          {editImageFile && (
                            <p className="text-xs text-gray-400 mt-1">Nova imagem selecionada: {editImageFile.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary">Nome</label>
                          <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} required className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary">Descrição</label>
                          <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md"></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-text-secondary">Data de Início</label>
                            <input type="date" value={editData.startDate} onChange={e => setEditData({ ...editData, startDate: e.target.value })} required className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-text-secondary">Data de Término</label>
                            <input type="date" value={editData.endDate} onChange={e => setEditData({ ...editData, endDate: e.target.value })} required className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md" />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-4">
                          <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-md bg-secondary hover:bg-gray-600">Cancelar</button>
                          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-white hover:bg-blue-700">Salvar</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-accent">{project.name}</h1>
                        <p className="text-text-secondary mt-2">{project.description}</p>
                         <div className="text-sm text-gray-400 mt-2">
                            <span>Início: {new Date(project.startDate).toLocaleDateString()}</span>
                            <span className="mx-2">|</span>
                            <span>Término: {new Date(project.endDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <button onClick={openEditModal} className="bg-accent/20 text-accent px-3 py-2 rounded-md text-sm hover:bg-accent/30">Editar Projeto</button>
                        <button onClick={handleShare} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm">Compartilhar</button>
                        <button onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm">Excluir</button>
                    </div>
                </div>

                <div className="border-b border-gray-700">
                    <nav className="flex space-x-4">
                        <button onClick={() => setActiveTab('tasks')} className={`px-3 py-2 font-medium text-sm rounded-t-md ${activeTab === 'tasks' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary hover:text-text-primary'}`}>Tarefas</button>
                    </nav>
                </div>
                
                {activeTab === 'tasks' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="md:col-span-2 lg:col-span-1">
                                <div className="bg-card p-4 rounded-lg shadow-lg h-full flex flex-col justify-center">
                                    <h3 className="text-lg font-semibold mb-4 text-center">Status das Tarefas</h3>
                                    <div style={{ width: '100%', height: '220px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={taskStats.distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label>
                                                    {taskStats.distribution.map((entry: { name: TaskStatus; value: number }, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <StatCard title="Total de Tarefas" value={taskStats.total} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} />
                                <StatCard title="Tarefas Pendentes" value={taskStats.pending} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                                <StatCard title="Tarefas Concluídas" value={taskStats.done} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                            </div>
                        </div>

                        <div>
                             <div className="flex justify-between items-center mb-4">
                                 <h2 className="text-2xl font-bold">Quadro de Tarefas</h2>
                                 <button onClick={() => setIsCreatingTask(!isCreatingTask)} className="bg-accent/20 text-accent px-4 py-2 rounded-md hover:bg-accent/30 text-sm">{isCreatingTask ? 'Cancelar' : 'Nova Tarefa'}</button>
                             </div>
                             {isCreatingTask && (
                                <div className="bg-card p-4 rounded-lg mb-6">
                                    <form onSubmit={handleCreateTask} className="space-y-3">
                                       <input type="text" placeholder="Título da tarefa" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full bg-secondary p-2 rounded-md" required />
                                       <textarea placeholder="Descrição..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} className="w-full bg-secondary p-2 rounded-md" rows={2}></textarea>
                                       <div className="flex justify-end"><button type="submit" className="bg-primary text-white px-4 py-2 rounded-md">Adicionar</button></div>
                                    </form>
                                </div>
                             )}
                            <DragDropContext onDragEnd={onDragEnd}>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {TASK_STATUSES.map(status => (
                                  <Droppable droppableId={status} key={status}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`bg-card p-4 rounded-lg min-h-[300px] ${snapshot.isDraggingOver ? 'ring-2 ring-accent' : ''}`}
                                      >
                                        <h3 className="text-lg font-bold mb-4">{status === TaskStatus.ToDo ? 'A Fazer' : status === TaskStatus.InProgress ? 'Em Andamento' : 'Concluído'}</h3>
                                        {tasksByStatus[status].map((task, idx) => (
                                          <Draggable draggableId={task.id} index={idx} key={task.id}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`mb-4 bg-secondary p-3 rounded-md shadow ${snapshot.isDragging ? 'ring-2 ring-accent' : ''}`}
                                                style={{
                                                  ...provided.draggableProps.style,
                                                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                                                  position: snapshot.isDragging ? 'fixed' : undefined,
                                                  pointerEvents: snapshot.isDragging ? 'auto' : undefined,
                                                }}
                                              >
                                                <div className="flex justify-between items-center">
                                                  <div>
                                                    <div className="font-semibold text-text-primary">{task.title}</div>
                                                    <div className="text-sm text-text-secondary">{task.description}</div>
                                                    {/* Notas/Subtarefas */}
                                                    {taskNotesMap[task.id] && taskNotesMap[task.id].length > 0 && (
                                                      <div className="mt-2 text-xs text-text-secondary">
                                                        {taskNotesMap[task.id].map((note) => (
                                                          <div
                                                            key={note.id}
                                                            style={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}
                                                            className="break-words"
                                                          >
                                                            - {note.content}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                  <button onClick={() => setSelectedTask(task)} className="ml-2 text-accent hover:underline text-xs">Detalhes</button>
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {provided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                ))}
                              </div>
                            </DragDropContext>
                        </div>
                    </div>
                )}
                
                {activeTab === 'notes' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Notas do Projeto</h2>
                            <button onClick={() => setIsCreatingNote(!isCreatingNote)} className="bg-accent/20 text-accent px-4 py-2 rounded-md hover:bg-accent/30 text-sm">{isCreatingNote ? 'Cancelar' : 'Nova Nota'}</button>
                        </div>

                        {isCreatingNote && (
                            <div className="bg-card p-4 rounded-lg">
                                <form onSubmit={handleCreateNote} className="space-y-3">
                                    <textarea placeholder="Escreva sua nota aqui..." value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} className="w-full bg-secondary p-2 rounded-md" rows={4} required></textarea>
                                   <div className="flex justify-end space-x-2">
                                        <button type="button" onClick={() => setIsCreatingNote(false)} className="px-4 py-2 rounded-md bg-secondary hover:bg-gray-600">Cancelar</button>
                                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md">Salvar Nota</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {notes.map(note => (
                                <NoteCard key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                            ))}
                            {notes.length === 0 && !isCreatingNote && (
                                <div className="md:col-span-3 text-center py-16 bg-card rounded-lg">
                                    <h3 className="text-xl font-medium text-text-primary">Nenhuma nota encontrada.</h3>
                                    <p className="text-text-secondary mt-2">Crie sua primeira nota para este projeto!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'files' && projectId && (
                    <ProjectFiles projectId={projectId} files={files} onFileChange={fetchProjectData} />
                )}
            </div>
            <ProjectSidebar
                notes={notes}
                files={files}
                onAddNote={async (content) => {
                    if (!project) return;
                    const newNote = await apiCreateNote({ content, projectId: project.id });
                    setNotes(prev => [newNote, ...prev]);
                }}
                onUploadFile={async (file) => {
                    if (!project) return;
                    await uploadProjectFile(project.id, file);
                    // Atualiza lista de arquivos
                    const updatedFiles = await getFilesForProject(project.id);
                    setFiles(updatedFiles);
                }}
                open={sidebar.open}
                toggle={sidebar.toggle}
                onDeleteNote={handleDeleteNote}
                onUpdateNote={handleUpdateNote}
            />
        </div>
    );
};

export default ProjectDetailPage;
