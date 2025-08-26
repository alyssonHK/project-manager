import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TldrawWithSave from '../components/TldrawWithSave';


// Serviços do Firebase (suposição)
import { getProjectsForUser, createProject as apiCreateProject, updateProject } from '../services/firebaseProjects';
import { uploadProjectImage } from '../services/firebaseProjectFiles';
import { getTasksForProject, updateTask as apiUpdateTask } from '../services/firebaseTasks';
import { getNotesForTask } from '../services/firebaseTaskNotes';
import { saveTasksSummary, getTasksSummary } from '../services/firebaseSummaries';
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

// Normaliza formatos diferentes de resposta de LLM para texto legível.
function extractModelText(payload: any): string {
  if (!payload && payload !== 0) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload.summary === 'string') return payload.summary;
  if (typeof payload.text === 'string') return payload.text;
  if (typeof payload.output_text === 'string') return payload.output_text;

  if (Array.isArray(payload.output)) {
    const parts: string[] = [];
    for (const o of payload.output) {
      if (typeof o === 'string') parts.push(o);
      else if (o.content && Array.isArray(o.content)) {
        for (const c of o.content) {
          if (typeof c === 'string') parts.push(c);
          else if (typeof c.text === 'string') parts.push(c.text);
          else if (typeof c.content === 'string') parts.push(c.content);
        }
      } else if (typeof o.text === 'string') parts.push(o.text);
    }
    if (parts.length) return parts.join('\n\n');
  }

  if (Array.isArray(payload.candidates) && payload.candidates.length > 0) {
    const cand = payload.candidates[0];
    if (cand.output && Array.isArray(cand.output)) {
      const parts: string[] = [];
      for (const seg of cand.output) {
        if (typeof seg === 'string') parts.push(seg);
        else if (seg.content && Array.isArray(seg.content)) {
          for (const c of seg.content) {
            if (typeof c === 'string') parts.push(c);
            else if (typeof c.text === 'string') parts.push(c.text);
            else if (c.content && typeof c.content === 'string') parts.push(c.content);
          }
        }
      }
      if (parts.length) return parts.join('\n\n');
    }
    if (typeof cand.outputText === 'string') return cand.outputText;
    if (typeof cand.content === 'string') return cand.content;
    if (cand.message && typeof cand.message === 'string') return cand.message;
  }

  if (Array.isArray(payload.choices) && payload.choices.length > 0) {
    const ch = payload.choices[0];
    if (typeof ch.text === 'string') return ch.text;
    if (ch.message) {
      if (typeof ch.message === 'string') return ch.message;
      if (typeof ch.message.content === 'string') return ch.message.content;
      if (Array.isArray(ch.message.content)) return ch.message.content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('\n');
    }
  }

  try {
    const collector: string[] = [];
    const visit = (v: any, depth = 0) => {
      if (depth > 3 || v == null) return;
      if (typeof v === 'string') { collector.push(v); return; }
      if (typeof v === 'number' || typeof v === 'boolean') { collector.push(String(v)); return; }
      if (Array.isArray(v)) { for (const e of v) visit(e, depth + 1); return; }
      if (typeof v === 'object') { for (const k of Object.keys(v)) visit(v[k], depth + 1); }
    };
    visit(payload, 0);
    if (collector.length) return collector.join('\n\n');
  } catch (e) {
    // ignore
  }

  try { return JSON.stringify(payload); } catch (e) { return String(payload); }
}

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
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [savedSummaryUpdatedAt, setSavedSummaryUpdatedAt] = useState<string | null>(null);

  console.log('DashboardPage renderizado, usuário:', user ? `Logado: ${user.name}` : 'Não logado');

  const COLORS: Record<TaskStatus, string> = {
    [TaskStatus.ToDo]: '#f97316',
    [TaskStatus.InProgress]: '#3b82f6',
    [TaskStatus.Done]: '#22c55e',
  };

  // Segurança: evita passar objetos diretamente para JSX (causa React error #31).
  const renderSafe = (v: any) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
    try {
      return JSON.stringify(v);
    } catch (e) {
      return String(v);
    }
  };

  // Normaliza formatos diferentes de resposta de LLM para texto legível.
  const extractModelText = (payload: any): string => {
    if (!payload && payload !== 0) return '';
    if (typeof payload === 'string') return payload;
    // Common quick wins
    if (typeof payload.summary === 'string') return payload.summary;
    if (typeof payload.text === 'string') return payload.text;
    if (typeof payload.output_text === 'string') return payload.output_text;

    // OpenAI Responses: payload.output -> array
    if (Array.isArray(payload.output)) {
      const parts: string[] = [];
      for (const o of payload.output) {
        if (typeof o === 'string') parts.push(o);
        else if (o.content && Array.isArray(o.content)) {
          for (const c of o.content) {
            if (typeof c === 'string') parts.push(c);
            else if (typeof c.text === 'string') parts.push(c.text);
            else if (typeof c.content === 'string') parts.push(c.content);
          }
        } else if (typeof o.text === 'string') parts.push(o.text);
      }
      if (parts.length) return parts.join('\n\n');
    }

    // Google Generative responses: candidates / candidates[0].output
    if (Array.isArray(payload.candidates) && payload.candidates.length > 0) {
      const cand = payload.candidates[0];
      if (cand.output && Array.isArray(cand.output)) {
        const parts: string[] = [];
        for (const seg of cand.output) {
          if (typeof seg === 'string') parts.push(seg);
          else if (seg.content && Array.isArray(seg.content)) {
            for (const c of seg.content) {
              if (typeof c === 'string') parts.push(c);
              else if (typeof c.text === 'string') parts.push(c.text);
              else if (c.content && typeof c.content === 'string') parts.push(c.content);
            }
          }
        }
        if (parts.length) return parts.join('\n\n');
      }
      if (typeof cand.outputText === 'string') return cand.outputText;
      if (typeof cand.content === 'string') return cand.content;
      if (cand.message && typeof cand.message === 'string') return cand.message;
    }

    // OpenAI old-style choices
    if (Array.isArray(payload.choices) && payload.choices.length > 0) {
      const ch = payload.choices[0];
      if (typeof ch.text === 'string') return ch.text;
      if (ch.message) {
        if (typeof ch.message === 'string') return ch.message;
        if (typeof ch.message.content === 'string') return ch.message.content;
        if (Array.isArray(ch.message.content)) return ch.message.content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('\n');
      }
    }

    // Fallback: procurar recursivamente por strings dentro do objeto (até profundidade baixa)
    try {
      const collector: string[] = [];
      const visit = (v: any, depth = 0) => {
        if (depth > 3 || v == null) return;
        if (typeof v === 'string') { collector.push(v); return; }
        if (typeof v === 'number' || typeof v === 'boolean') { collector.push(String(v)); return; }
        if (Array.isArray(v)) { for (const e of v) visit(e, depth + 1); return; }
        if (typeof v === 'object') { for (const k of Object.keys(v)) visit(v[k], depth + 1); }
      };
      visit(payload, 0);
      if (collector.length) return collector.join('\n\n');
    } catch (e) {
      // ignore
    }

    // Último recurso: JSON
    try { return JSON.stringify(payload); } catch (e) { return String(payload); }
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
    // Carrega o resumo salvo para o usuário (se houver)
    const loadSummary = async () => {
      if (!user) return;
      try {
        const s = await getTasksSummary(user.uid);
        if (s) {
          setSavedSummary(s.summary);
          setSavedSummaryUpdatedAt(s.updatedAt);
        }
      } catch (e) {
        console.error('Falha ao carregar resumo salvo', e);
      }
    };
    loadSummary();
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
          <div className="flex items-center space-x-3">
            <button onClick={toggleTheme} title="Alternar tema" className="bg-secondary text-text-primary px-3 py-2 rounded-md hover:opacity-90">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </button>
            <button 
              onClick={() => setShowProjectForm(true)} 
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Novo Projeto</span>
            </button>
          </div>
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
            <div className="flex items-center justify-end mb-4 space-x-3">
              <div className="text-sm text-text-secondary">Último resumo: {savedSummaryUpdatedAt ? new Date(savedSummaryUpdatedAt).toLocaleString() : 'Nenhum'}</div>
              <button
                onClick={async () => {
                  if (!user) { setError('Usuário não autenticado'); return; }
                  // Gera prompt com todas as tarefas e status
                  try {
                    setLoading(true);
                    const allTasks = tasks; // já carregadas no estado
                    const lines: string[] = [];
                    lines.push('Contexto: Você é um assistente executivo que recebe o panorama completo de tarefas do usuário. Gere um briefing de alto nível, principais achados, riscos, e 5 ideias acionáveis para avançar os projetos. Priorize recomendações práticas e rápidas.');
                    lines.push('\nResumo geral de tarefas do usuário:');
                    lines.push(`Total de tarefas: ${allTasks.length}`);
                    const byStatus = Object.values(TASK_STATUS).map(s => ({ status: s, items: allTasks.filter(t => t.status === s) }));
                    // Liste tarefas por status com contextos curtos
                    byStatus.forEach(group => {
                      lines.push(`\nStatus: ${group.status} - ${group.items.length} tarefas`);
                      group.items.forEach((t, i) => {
                        lines.push(`${i + 1}. [${t.status}] ${t.title} (Projeto: ${projects.find(p=>p.id===t.projectId)?.name || 'Desconhecido'})`);
                        if (t.description) lines.push(`   Descrição: ${t.description}`);
                      });
                    });

                    // Busca notas de forma paralela (pode gerar leituras)
                    const tasksWithNotes = await Promise.all(allTasks.map(async t => {
                      try { const notes = await getNotesForTask(t.id); return { ...t, notes }; } catch { return { ...t, notes: [] }; }
                    }));
                    lines.push('\nAnotações das tarefas:');
                    tasksWithNotes.forEach((t, idx) => {
                      if (t.notes && t.notes.length > 0) {
                        lines.push(`${idx + 1}. ${t.title}:`);
                        t.notes.forEach((n: any, _j: number) => lines.push(`   - ${n.content || n.text || JSON.stringify(n)}`));
                      }
                    });

                    // Adiciona instrução final para o modelo: produzir briefing, principais achados e 5 ideias acionáveis
                    lines.push('\nINSTRUÇÕES PARA O MODELO: Gere um briefing executivo (~5-8 linhas), destaque os 3 principais riscos/obstáculos, e proponha 5 ideias práticas para priorizar e acelerar entregas. Seja direto e use bullets.');

                    const prompt = lines.join('\n');

                    const proxyUrl = (import.meta as any).env?.VITE_SUMMARY_PROXY_URL || '/api/gemini-summary';
                    const apiUrl = (import.meta as any).env?.VITE_GEMINI_API_URL;
                    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
                    let finalSummary = '';

                    // Tenta usar o proxy (recomendado). Caso o proxy não esteja acessível, tenta chamar direto (menos seguro).
          if (proxyUrl) {
                      try {
            const res = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, provider: 'openai', model: 'gpt-5-mini' }) });
                        if (!res.ok) throw new Error(`Proxy retornou ${res.status}`);
                        const data = await res.json();
                        // data.result contém o retorno da Gemini via proxy
            const payload = data.result || data;
            finalSummary = extractModelText(payload);
                      } catch (errProxy) {
                        console.warn('Falha no proxy, tentando chamada direta...', errProxy);
                        // fallback para chamada direta se chave e endpoint estiverem configurados
                          if (apiUrl && apiKey) {
                          try {
                            const res2 = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ prompt }) });
                            if (!res2.ok) throw new Error(`API retornou ${res2.status}`);
                            const data2 = await res2.json();
                            finalSummary = extractModelText(data2);
                          } catch (errDirect) {
                            finalSummary = `Falha ao chamar API externa: ${String(errDirect)}.\n\nPrompt:\n${prompt}`;
                          }
                        } else {
                          finalSummary = `Prompt gerado:\n\n${prompt}`;
                        }
                      }
                    }

                    // Salva no Firestore para o usuário (substitui o anterior)
                    await saveTasksSummary(user.uid, finalSummary);
                    setSavedSummary(finalSummary);
                    setSavedSummaryUpdatedAt(new Date().toISOString());
                  } catch (e: any) {
                    console.error(e);
                    setError(e?.message || 'Falha ao gerar resumo');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="button button-primary"
              >Gerar Resumo (Gemini)</button>
            </div>
        {savedSummary && (
              <div className="bg-secondary p-4 rounded-md mt-4">
                <h4 className="font-semibold">Resumo salvo</h4>
          <div className="text-sm text-text-secondary whitespace-pre-wrap mt-2">{renderSafe(savedSummary)}</div>
              </div>
            )}
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
                                  <div className="text-sm text-text-secondary">{renderSafe(task.description)}</div>
                                  <div className="text-xs text-gray-400 mt-1">Projeto: {renderSafe(projects.find(p => p.id === task.projectId)?.name) || 'Desconhecido'}</div>
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

  // Estado local para o modal de resumo
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryProjectName, setSummaryProjectName] = useState('');

  // Gera o prompt e tenta chamar a API externa (quando configurada). Caso contrário, abre modal com o prompt para cópia/manual.
  const generateProjectSummary = async (project: Project) => {
    setSummaryProjectName(project.name);
    setSummaryLoading(true);
    try {
      // Inclui tarefas Concluídas, Em Andamento e Pendentes para contexto completo
      const projectTasks = tasks.filter(t => t.projectId === project.id && [TASK_STATUS.Done, TASK_STATUS.InProgress, TASK_STATUS.ToDo].includes(t.status));

      if (projectTasks.length === 0) {
        setSummaryText('Nenhuma tarefa encontrada para este projeto.');
        setSummaryModalOpen(true);
        return;
      }

      // Busca notas para cada tarefa relevante
      const tasksWithNotes = await Promise.all(projectTasks.map(async (task) => {
        try {
          const notes = await getNotesForTask(task.id);
          return { ...task, notes };
        } catch (e) {
          return { ...task, notes: [] };
        }
      }));

      // Compondo o prompt
      const promptLines: string[] = [];
      promptLines.push(`Resumo do Projeto: ${project.name}`);
      promptLines.push(`Período: ${new Date(project.startDate).toLocaleDateString()} -> ${new Date(project.endDate).toLocaleDateString()}`);

      promptLines.push('Tarefas relevantes (Concluídas / Em Andamento / Pendentes) e suas anotações:');
      tasksWithNotes.forEach((t, i) => {
        promptLines.push(`${i + 1}. [${t.status}] ${t.title}`);
        if (t.description) promptLines.push(`   Descrição: ${t.description}`);
        if (t.notes && t.notes.length > 0) {
          t.notes.forEach((n: any, j: number) => {
            promptLines.push(`   - Nota ${j + 1}: ${n.content || n.text || JSON.stringify(n)}`);
          });
        } else {
          promptLines.push('   - Sem anotações.');
        }
      });

      // Instruções finais: pedir resumo executivo, principais riscos e 5 recomendações/priorizações
      promptLines.push('\nINSTRUÇÕES: Gere um resumo executivo curto (5-8 linhas), liste 3 principais riscos/obstáculos e forneça 5 recomendações práticas e priorizadas para avançar este projeto.');

      const prompt = promptLines.join('\n');

      // Se houver um proxy configurado, use-o (recomendado) — solicita explicitamente OpenAI/GPT.
      const proxyUrl = (import.meta as any).env?.VITE_SUMMARY_PROXY_URL || '/api/gemini-summary';
      const apiUrl = (import.meta as any).env?.VITE_GEMINI_API_URL;
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

      if (proxyUrl) {
        try {
          const res = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, provider: 'openai', model: 'gpt-5-mini' }) });
          if (!res.ok) throw new Error(`Proxy retornou ${res.status}`);
          const data = await res.json();
          const payload = data.result || data;
          setSummaryText(extractModelText(payload));
          setSummaryModalOpen(true);
        } catch (err: any) {
          setSummaryText(`Falha ao chamar proxy: ${err?.message || err}.\n\nPrompt:\n\n${prompt}`);
          setSummaryModalOpen(true);
        }
        return;
      }

      if (apiUrl && apiKey) {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ prompt }),
          });
          if (!res.ok) throw new Error(`API retornou status ${res.status}`);
          const data = await res.json();
          const summary = extractModelText(data);
          setSummaryText(summary);
          setSummaryModalOpen(true);
        } catch (err: any) {
          // Se falhar, mostra o prompt para o usuário usar manualmente
      setSummaryText(`Falha ao chamar a API externa: ${err?.message || err}.\n\nPrompt gerado:\n\n${prompt}`);
          setSummaryModalOpen(true);
        }
      } else {
        // Sem configuração, apenas mostra o prompt no modal para cópia manual
        setSummaryText(prompt);
        setSummaryModalOpen(true);
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => {
        // Filtra as tarefas para este projeto específico a partir da lista geral
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const distribution = Object.values(TASK_STATUS).map(status => ({
          name: status,
          value: projectTasks.filter(t => t.status === status).length
        })).filter(item => item.value > 0);

        return (
          <div key={project.id} className="relative">
            <Link to={`/project/${project.id}`} className="block bg-card p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-transform duration-300 relative">
              {project.imageUrl && (
                <div className="w-full h-32 flex items-center justify-center logo-bg mb-3 overflow-hidden">
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

            {/* Botão de Resumo do Projeto */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); generateProjectSummary(project); }}
              className="absolute top-3 right-3 bg-primary text-white px-3 py-1 rounded-md text-sm hover:opacity-90"
            >
              Resumo do Projeto
            </button>
          </div>
        );
      })}
  </div>
  {/* Modal de Resumo (fallback / resultado) */}
  {summaryModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-card w-[90%] max-w-3xl p-6 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Resumo - {summaryProjectName}</h3>
            <div className="space-x-2">
              <button onClick={() => { navigator.clipboard?.writeText(summaryText); }} className="button button-secondary">Copiar</button>
              <button onClick={() => { setSummaryModalOpen(false); setSummaryText(''); setSummaryProjectName(''); }} className="button button-primary">Fechar</button>
            </div>
          </div>
          <div className="whitespace-pre-wrap text-sm text-text-secondary max-h-[60vh] overflow-auto">
            {summaryLoading ? <p>Gerando resumo...</p> : <pre className="whitespace-pre-wrap text-sm">{summaryText}</pre>}
          </div>
        </div>
      </div>
    )}
    </>
  );
}