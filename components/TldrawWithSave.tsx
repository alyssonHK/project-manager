import React, { useState, useEffect, useCallback } from 'react';
import { Tldraw, TLEditorSnapshot, getSnapshot, loadSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { saveDrawing, updateDrawing, getDrawingsForUser, Drawing, deleteDrawing } from '../services/firebaseDrawings';

interface TldrawWithSaveProps {
  userId: string;
  theme: 'dark' | 'light';
}

// Componente wrapper para controlar o ciclo de vida do Tldraw
const TldrawWrapper: React.FC<{
  key: number;
  onMount: (editor: any) => void;
  initialSnapshot?: any;
}> = ({ key, onMount, initialSnapshot }) => {
  const [editor, setEditor] = useState<any>(null);

  const handleMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);
    onMount(editorInstance);
  }, [onMount]);

  // Carrega o snapshot inicial se fornecido
  useEffect(() => {
    if (editor && initialSnapshot) {
      setTimeout(() => {
        try {
          console.log('Carregando snapshot inicial:', initialSnapshot);
          loadSnapshot(editor.store, initialSnapshot);
          console.log('Snapshot inicial carregado com sucesso!');
        } catch (error) {
          console.error('Erro ao carregar snapshot inicial:', error);
        }
      }, 100);
    }
  }, [editor, initialSnapshot]);

  return (
    <Tldraw 
      key={key}
      autoFocus 
      onMount={handleMount}
    />
  );
};

const TldrawWithSave: React.FC<TldrawWithSaveProps> = ({ userId, theme }) => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);
  const [drawingName, setDrawingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [key, setKey] = useState(0);
  const [initialSnapshot, setInitialSnapshot] = useState<any>(null);

  // Carregar desenhos existentes
  useEffect(() => {
    const loadDrawings = async () => {
      try {
        const userDrawings = await getDrawingsForUser(userId);
        setDrawings(userDrawings.filter(d => !d.deleted));
      } catch (error) {
        console.error('Erro ao carregar desenhos:', error);
      }
    };
    loadDrawings();
  }, [userId]);

  // Função para salvar o desenho atual
  const saveCurrentDrawing = useCallback(async (name?: string) => {
    if (!editor || !isEditorReady) {
      console.warn('Editor não está pronto ainda');
      return;
    }

    setIsSaving(true);
    try {
      const snapshot = getSnapshot(editor.store);
      console.log('Salvando snapshot:', snapshot);
      
      if (currentDrawingId) {
        // Atualizar desenho existente
        await updateDrawing(currentDrawingId, snapshot);
      } else {
        // Criar novo desenho
        const newDrawing = await saveDrawing(userId, name || `Desenho ${Date.now()}`, snapshot);
        setCurrentDrawingId(newDrawing.id);
        setDrawings(prev => [...prev, newDrawing]);
      }
    } catch (error) {
      console.error('Erro ao salvar desenho:', error);
    } finally {
      setIsSaving(false);
      setShowSaveDialog(false);
    }
  }, [editor, isEditorReady, currentDrawingId, userId]);

  // Função para excluir o desenho atual
  const deleteCurrentDrawing = useCallback(async () => {
    if (!currentDrawingId) {
      console.warn('Nenhum desenho selecionado para excluir');
      return;
    }

    try {
      // Exclui o desenho do Firebase
      await deleteDrawing(currentDrawingId);
      
      // Remove da lista local
      setDrawings(prev => prev.filter(d => d.id !== currentDrawingId));
      
      // Limpa o estado atual
      setCurrentDrawingId(null);
      setDrawingName('');
      setInitialSnapshot(null);
      
      // Força re-render para limpar o canvas
      setKey(prev => prev + 1);
      
      console.log('Desenho excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir desenho:', error);
      alert('Erro ao excluir o desenho. Tente novamente.');
    } finally {
      setShowDeleteDialog(false);
    }
  }, [currentDrawingId]);

  // Função para limpar o canvas e começar um novo desenho
  const startNewDrawing = useCallback(() => {
    setKey(prev => prev + 1);
    setCurrentDrawingId(null);
    setDrawingName('');
    setInitialSnapshot(null);
    setIsEditorReady(false);
    setEditor(null);
    console.log('Novo desenho iniciado');
  }, []);

  // Função para carregar um desenho
  const loadDrawing = useCallback(async (drawingId: string) => {
    const drawing = drawings.find(d => d.id === drawingId);
    if (drawing) {
      console.log('Preparando para carregar desenho:', drawing.name);
      console.log('Dados do desenho:', drawing.records);
      
      // Prepara o snapshot para carregar
      let snapshotToLoad = drawing.records;
      
      // Se não tem schemaVersion, tenta extrair apenas o store
      if (!snapshotToLoad.schemaVersion) {
        console.log('Snapshot não tem schemaVersion, tentando extrair store...');
        if (snapshotToLoad.store) {
          snapshotToLoad = snapshotToLoad.store;
        } else if (Array.isArray(snapshotToLoad)) {
          // Se é um array, converte para objeto
          const storeObject: any = {};
          snapshotToLoad.forEach((record: any) => {
            if (record && record.id) {
              storeObject[record.id] = record;
            }
          });
          snapshotToLoad = storeObject;
        }
      }
      
      console.log('Snapshot final para carregar:', snapshotToLoad);
      
      // Define o snapshot inicial e força re-render
      setInitialSnapshot(snapshotToLoad);
      setCurrentDrawingId(drawing.id);
      setDrawingName(drawing.name);
      setKey(prev => prev + 1);
      setShowLoadDialog(false);
    }
  }, [drawings]);

  // Função para lidar com o mount do editor
  const handleEditorMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);
    
    // Aguarda um pouco para garantir que o editor está completamente inicializado
    setTimeout(() => {
      setIsEditorReady(true);
      console.log('Editor pronto para uso');
    }, 1000);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Barra de ferramentas customizada */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-gray-600">
        <div className="flex items-center space-x-4">
          <button
            onClick={startNewDrawing}
            disabled={!isEditorReady}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Novo Desenho
          </button>
          
          <button
            onClick={() => setShowLoadDialog(true)}
            disabled={!isEditorReady || drawings.length === 0}
            className="px-4 py-2 bg-secondary text-text-primary rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Abrir Desenho ({drawings.length})
          </button>
          
          <span className="text-text-secondary">
            {currentDrawingId ? `Editando: ${drawingName}` : 'Novo desenho'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {currentDrawingId && (
            <>
              <button
                onClick={() => saveCurrentDrawing()}
                disabled={isSaving || !isEditorReady}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
              
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={!isEditorReady}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Excluir
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!isEditorReady}
            className="px-4 py-2 bg-accent text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar Como
          </button>
        </div>
      </div>

      {/* Área do Tldraw */}
      <div className="flex-1">
        <TldrawWrapper 
          key={key}
          onMount={handleEditorMount}
          initialSnapshot={initialSnapshot}
        />
      </div>

      {/* Modal de salvar como */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-bold mb-4">Salvar Desenho</h3>
            <input
              type="text"
              value={drawingName}
              onChange={(e) => setDrawingName(e.target.value)}
              placeholder="Nome do desenho"
              className="w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md mb-4 text-text-primary"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-secondary text-text-primary rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (drawingName.trim()) {
                    saveCurrentDrawing(drawingName);
                  }
                }}
                disabled={!drawingName.trim() || isSaving || !isEditorReady}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de carregar desenho */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-96 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Abrir Desenho</h3>
            {drawings.length === 0 ? (
              <p className="text-text-secondary mb-4">Nenhum desenho salvo encontrado.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {drawings.map(drawing => (
                  <div
                    key={drawing.id}
                    onClick={() => loadDrawing(drawing.id)}
                    className="p-3 bg-secondary rounded-md cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-medium text-text-primary">{drawing.name}</div>
                    <div className="text-sm text-text-secondary">
                      Criado em: {new Date(drawing.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-sm text-text-secondary">
                      Atualizado em: {new Date(drawing.updatedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="px-4 py-2 bg-secondary text-text-primary rounded-md hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de excluir desenho */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-bold mb-4">Excluir Desenho</h3>
            <p className="text-text-secondary mb-6">
              Tem certeza que deseja excluir o desenho "{drawingName}"? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 bg-secondary text-text-primary rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={deleteCurrentDrawing}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TldrawWithSave; 
