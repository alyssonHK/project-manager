import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TldrawWithSave from '../components/TldrawWithSave';


// Serviços do Firebase (suposição)
import { getProjectsForUser, createProject as apiCreateProject, updateProject } from '../services/firebaseProjects';
import { uploadProjectImage } from '../services/firebaseProjectFiles';
import { getTasksForProject, updateTask as apiUpdateTask } from '../services/firebaseTasks';
import { AuthContext } from '../App';

// << 5. BOA PRÁTICA: Definindo tipos e constantes
import type { Project } from '../types';
import { TaskStatus } from '../types';
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string; // ou Date
}
const TASK_STATUS: Record<string, TaskStatus> = {
  TODO: TaskStatus.ToDo,
  IN_PROGRESS: TaskStatus.InProgress,
  DONE: TaskStatus.Done,
};

// Hook de Tema (sem alterações, já estava bom)
function useThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--bg-main', '#18181b');
      root.style.setProperty('--bg-card', '#23232b');
      root.style.setProperty('--bg-secondary', '#23232b');
      root.style.setProperty('--text-primary', '#fff');
      root.style.setProperty('--text-secondary', '#a1a1aa');
      root.style.setProperty('--accent', '#3b82f6');
      root.style.setProperty('--primary', '#2563eb');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--bg-main', '#f3f4f6');
      root.style.setProperty('--bg-card', '#fff');
      root.style.setProperty('--bg-secondary', '#f1f5f9');
      root.style.setProperty('--text-primary', '#18181b');
      root.style.setProperty('--text-secondary', '#52525b');
      root.style.setProperty('--accent', '#2563eb');
      root.style.setProperty('--primary', '#3b82f6');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggleTheme };
}

// FORMULÁRIO DE PROJETO (sem alterações)
const ProjectForm: React.FC<{ onSave: (project: Omit<Project, 'id' | 'ownerUid'> & { imageFile?: File | null }) => void; onCancel: () => void }> = ({ onSave, onCancel }) => {
    // ... (código do formulário inalterado)
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, description, startDate, endDate, imageFile });
    };
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Novo Projeto</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Campos do formulário... */}
                    <div>
                        <label htmlFor="proj-name" className="block text-sm font-medium text-text-secondary">Nome do Projeto</label>
                        <input id="proj-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                        <label htmlFor="proj-desc" className="block text-sm font-medium text-text-secondary">Descrição</label>
                        <textarea id="proj-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="proj-start" className="block text-sm font-medium text-text-secondary">Data de Início</label>
                            <input id="proj-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                        <div>
                            <label htmlFor="proj-end" className="block text-sm font-medium text-text-secondary">Data de Término</label>
                            <input id="proj-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">Imagem do Projeto</label>
                        <label className="block mt-1">
                            <span className="sr-only">Escolher imagem</span>
                            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30" />
                        </label>
                        {imageFile && <p className="text-xs text-gray-400 mt-1">Imagem selecionada: {imageFile.name}</p>}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onCancel} className="button button-secondary">Cancelar</button>
                        <button type="submit" className="button button-primary">Salvar Projeto</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// DASHBOARD PRINCIPAL
const DashboardPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { theme, toggleTheme } = useThemeToggle();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks' | 'tldraw'>('projects');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  console.log('DashboardPage renderizado, usuário:', user ? `Logado: ${user.name}` : 'Não logado');

  const COLORS: Record<TaskStatus, string> = {
    [TaskStatus.ToDo]: '#f97316',
    [TaskStatus.InProgress]: '#3b82f6',
    [TaskStatus.Done]: '#22c55e',
  };

  // << 2. PERFORMANCE: Centralizando o carregamento de dados
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const userProjects = await getProjectsForUser(user.uid);
        setProjects(userProjects);
        
        if (userProjects.length > 0) {
          const tasksPromises = userProjects.map(p => getTasksForProject(p.id));
          const tasksResults = await Promise.all(tasksPromises);
          setTasks(tasksResults.flat());
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar os dados.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [user]);

  // << 4. CORREÇÃO: Lógica de criação de projeto robusta
  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'ownerUid'> & { imageFile?: File | null }) => {
    if (!user) return;
    
    try {
      const { imageFile, ...projectDetails } = projectData;
      
      // Primeiro cria o projeto sem imagem
      const newProject = await apiCreateProject({
        ...projectDetails,
        imageUrl: ''
      }, user.uid);
      
      // Se houver imagem, faz o upload e atualiza o projeto
      if (imageFile) {
        const imageUrl = await uploadProjectImage(newProject.id, imageFile);
        await updateProject(newProject.id, { imageUrl });
        newProject.imageUrl = imageUrl;
      }
      
      setProjects(prev => [...prev, newProject]);
      setShowProjectForm(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao criar projeto.');
    }
  };

  // << 3. PERFORMANCE: Atualização otimista no Drag & Drop
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as TaskStatus;
    const originalStatus = source.droppableId as TaskStatus;

    // Atualização otimista: atualiza a UI instantaneamente
    const updatedTasks = tasks.map(task => 
        task.id === draggableId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);
    
    // Sincroniza com o backend em segundo plano
    try {
        await apiUpdateTask(draggableId, { status: newStatus });
    } catch (error) {
        console.error("Falha ao atualizar tarefa:", error);
        // Se falhar, reverte a mudança na UI e notifica o usuário
        setTasks(tasks.map(task => 
            task.id === draggableId ? { ...task, status: originalStatus } : task
        ));
        setError("Não foi possível mover a tarefa. Tente novamente.");
    }
  };

  const taskStats = React.useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === TASK_STATUS.DONE).length;
    const pending = total - done;
    const distribution = (Object.values(TASK_STATUS)).map(status => ({
      name: status,
      value: tasks.filter(t => t.status === status).length
    })).filter(item => item.value > 0);
    return { total, done, pending, distribution };
  }, [tasks]);

  const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-secondary p-4 rounded-lg flex items-center space-x-4">
      <div className="bg-gray-900/50 p-3 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navegação por abas */}
      <div className="flex justify-between items-center border-b border-gray-600">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'projects'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Seus Projetos
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Tarefas
          </button>
          <button
            onClick={() => setActiveTab('tldraw')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'tldraw'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            TL;Draw
          </button>
        </div>
        
        {/* Botão Novo Projeto - apenas na aba de projetos */}
        {activeTab === 'projects' && (
          <button 
            onClick={() => setShowProjectForm(true)} 
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Novo Projeto</span>
          </button>
        )}
      </div>

      {/* Conteúdo principal */}
      <div className="p-8" style={{ marginTop: '-15px' }}>
        {showProjectForm && <ProjectForm onSave={handleCreateProject} onCancel={() => setShowProjectForm(false)} />}
        {loading && <p>Carregando dados...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && projects.length === 0 && (
          <div className="text-center py-16 bg-card rounded-lg"><h3 className="text-xl font-medium text-text-primary">Nenhum projeto encontrado.</h3><p className="text-text-secondary mt-2">Comece criando seu primeiro projeto!</p></div>
        )}

        {/* Abas de conteúdo */}
        {activeTab === 'projects' && !loading && (
          // << 6. OTIMIZAÇÃO: Passando tarefas como prop para o componente filho
          <ProjectCardsWithMiniCharts projects={projects} tasks={tasks} />
        )}

        {activeTab === 'tldraw' && (
          <div style={{
            width: '100%', 
            height: 'calc(100vh - 200px)', 
            minHeight: 600,
            backgroundColor: theme === 'dark' ? '#18181b' : '#f3f4f6',
            borderRadius: '8px',
            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
            overflow: 'hidden'
          }}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <TldrawWithSave userId={user?.uid || ''} theme={theme} />
            </div>
          </div>
        )}

        {activeTab === 'tasks' && !loading && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Panorama Geral das Tarefas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="md:col-span-2 lg:col-span-1">
                <div className="bg-card p-4 rounded-lg shadow-lg h-full flex flex-col justify-center">
                  <h3 className="text-lg font-semibold mb-4 text-center">Status das Tarefas</h3>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={taskStats.distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label>
                          {taskStats.distribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[entry.name as TaskStatus]} />))}
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
            
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(TASK_STATUS).map(status => (
                  <Droppable droppableId={status} key={status}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="bg-card p-4 rounded-lg min-h-[300px]">
                        <h3 className={`font-bold text-lg mb-4 ${status === 'A Fazer' ? 'text-orange-500' : status === 'Em Andamento' ? 'text-blue-500' : 'text-green-500'}`}>{status}</h3>
                        {tasks.filter(t => t.status === status)
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((task, idx) => (
                            <Draggable draggableId={task.id} index={idx} key={task.id}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-4 bg-secondary p-3 rounded-md shadow">
                                  <div className="font-semibold text-text-primary">{task.title}</div>
                                  <div className="text-sm text-text-secondary">{task.description}</div>
                                  <div className="text-xs text-gray-400 mt-1">Projeto: {projects.find(p => p.id === task.projectId)?.name || 'Desconhecido'}</div>
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
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

// << 6. OTIMIZAÇÃO: Componente filho agora é "burro", apenas exibe dados recebidos via props.
interface ProjectCardsProps {
    projects: Project[];
    tasks: Task[];
}

function ProjectCardsWithMiniCharts({ projects, tasks }: ProjectCardsProps) {
  const COLORS: Record<TaskStatus, string> = {
    [TaskStatus.ToDo]: '#f97316',
    [TaskStatus.InProgress]: '#3b82f6',
    [TaskStatus.Done]: '#22c55e',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => {
        // Filtra as tarefas para este projeto específico a partir da lista geral
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const distribution = Object.values(TASK_STATUS).map(status => ({
          name: status,
          value: projectTasks.filter(t => t.status === status).length
        })).filter(item => item.value > 0);

        return (
          <Link key={project.id} to={`/project/${project.id}`} className="block bg-card p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-transform duration-300 relative">
            {project.imageUrl && (
              <div className="w-full h-32 flex items-center justify-center bg-secondary rounded-md mb-3 overflow-hidden">
                <img src={project.imageUrl} alt={project.name} className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <h3 className="text-xl font-bold text-accent">{project.name}</h3>
            <p className="text-text-secondary mt-2 h-12 overflow-hidden text-ellipsis">{project.description}</p>
            <div className="flex justify-between items-end mt-4">
              <div className="text-sm text-gray-400">
                <p>Início: {new Date(project.startDate).toLocaleDateString()}</p>
                <p>Término: {new Date(project.endDate).toLocaleDateString()}</p>
              </div>
              <div style={{ width: 60, height: 60 }} className="flex-shrink-0">
                {distribution.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%">
                        {distribution.map((entry, idx) => (
                          <Cell key={`cell-mini-${idx}`} fill={COLORS[entry.name as TaskStatus]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}