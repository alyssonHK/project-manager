
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getProjectByShareId, getTasksForProject, getNotesForProject, getFilesForProject } from '../services/firebaseMock';
import type { Project, Task, Note, ProjectFile } from '../types';
import { TaskStatus } from '../types';
import { TASK_STATUSES } from '../constants';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  [TaskStatus.ToDo]: '#f97316',
  [TaskStatus.InProgress]: '#3b82f6',
  [TaskStatus.Done]: '#22c55e',
};

const PublicStatCard: React.FC<{ title: string; value: number | string; }> = ({ title, value }) => (
    <div className="bg-secondary p-4 rounded-lg">
        <p className="text-sm text-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
);

const PublicProjectPage: React.FC = () => {
    const { shareId } = useParams<{ shareId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'files'>('tasks');

    const fetchPublicProjectData = useCallback(async () => {
        if (!shareId) return;
        try {
            setLoading(true);
            const proj = await getProjectByShareId(shareId);
            if (proj) {
                setProject(proj);
                const [projTasks, projNotes, projFiles] = await Promise.all([
                    getTasksForProject(proj.id),
                    getNotesForProject(proj.id),
                    getFilesForProject(proj.id)
                ]);
                setTasks(projTasks);
                setNotes(projNotes);
                setFiles(projFiles);
            } else {
                setError('Link de compartilhamento inválido ou o projeto não é mais público.');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar projeto.');
        } finally {
            setLoading(false);
        }
    }, [shareId]);

    useEffect(() => {
        fetchPublicProjectData();
    }, [fetchPublicProjectData]);

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

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    if (loading) return <div className="text-center p-10">Carregando visualização pública...</div>;
    if (error) return <div className="text-center p-10 text-red-400">{error}</div>;
    if (!project) return null;

    return (
        <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-accent">{project.name} (Visualização Pública)</h1>
                <p className="text-text-secondary mt-2">{project.description}</p>
                 <div className="text-sm text-gray-400 mt-2">
                    <span>Início: {new Date(project.startDate).toLocaleDateString()}</span>
                    <span className="mx-2">|</span>
                    <span>Término: {new Date(project.endDate).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="border-b border-gray-700">
                <nav className="flex space-x-4">
                    <button onClick={() => setActiveTab('tasks')} className={`px-3 py-2 font-medium text-sm rounded-t-md ${activeTab === 'tasks' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary hover:text-text-primary'}`}>Tarefas</button>
                    <button onClick={() => setActiveTab('notes')} className={`px-3 py-2 font-medium text-sm rounded-t-md ${activeTab === 'notes' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary hover:text-text-primary'}`}>Notas</button>
                    <button onClick={() => setActiveTab('files')} className={`px-3 py-2 font-medium text-sm rounded-t-md ${activeTab === 'files' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary hover:text-text-primary'}`}>Arquivos</button>
                </nav>
            </div>

            {activeTab === 'tasks' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="md:col-span-2 lg:col-span-1 bg-card p-4 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold mb-4 text-center">Status das Tarefas</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={taskStats.distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                        {taskStats.distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as TaskStatus]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <PublicStatCard title="Total de Tarefas" value={taskStats.total} />
                            <PublicStatCard title="Tarefas Pendentes" value={taskStats.pending} />
                            <PublicStatCard title="Tarefas Concluídas" value={taskStats.done} />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-4">Tarefas do Projeto</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {TASK_STATUSES.map(status => (
                                <div key={status} className="bg-card p-4 rounded-lg">
                                    <h3 className="font-bold text-lg mb-4" style={{ color: COLORS[status] }}>{status}</h3>
                                    <div className="space-y-3">
                                        {tasks.filter(t => t.status === status).map(task => (
                                            <div key={task.id} className="bg-secondary p-3 rounded-md">
                                                <h4 className="font-bold">{task.title}</h4>
                                                <p className="text-sm text-text-secondary mt-1">{task.description}</p>
                                            </div>
                                        ))}
                                        {tasks.filter(t => t.status === status).length === 0 && <p className="text-sm text-gray-500">Nenhuma tarefa aqui.</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'notes' && (
                 <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Notas do Projeto</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notes.map(note => (
                            <div key={note.id} className="bg-card p-4 rounded-lg">
                                <p className="text-text-secondary whitespace-pre-wrap">{note.content}</p>
                                <div className="text-xs text-gray-500 mt-3">
                                    Criado em: {new Date(note.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))}
                        {notes.length === 0 && (
                            <div className="md:col-span-3 text-center py-16 bg-card rounded-lg">
                                <h3 className="text-xl font-medium text-text-primary">Nenhuma nota para este projeto.</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'files' && (
                 <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Arquivos do Projeto</h2>
                     <div className="bg-card p-4 rounded-lg">
                        <ul className="space-y-3">
                            {files.map(file => (
                                <li key={file.id} className="flex items-center space-x-4 p-3 bg-secondary rounded-md">
                                    <span>📄</span> {/* Generic file icon */}
                                    <div>
                                        <p className="font-medium text-text-primary">{file.name}</p>
                                        <p className="text-sm text-text-secondary">{formatFileSize(file.size)} - {new Date(file.uploadedAt).toLocaleDateString()}</p>
                                    </div>
                                </li>
                            ))}
                             {files.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum arquivo anexado.</p>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicProjectPage;
