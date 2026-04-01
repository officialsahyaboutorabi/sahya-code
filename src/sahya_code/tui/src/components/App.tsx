/**
 * Main App Component - Root of the TUI
 * 
 * Inspired by opencode's TUI design patterns
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, useApp, useInput } from 'ink';
import { BackendClient, Session, Message, BackendEvent } from '../backend/client.js';
import { ChatView } from './ChatView.js';
import { PromptInput } from './PromptInput.js';
import { StatusBar } from './StatusBar.js';
import { SessionList } from './SessionList.js';
import { ApprovalDialog } from './ApprovalDialog.js';
import { useBackend } from '../hooks/useBackend.js';

interface AppProps {
  backend: BackendClient;
  options: {
    session?: string;
    workDir?: string;
    prompt?: string;
    model?: string;
    yolo?: boolean;
    debug?: boolean;
  };
}

export const App: React.FC<AppProps> = ({ backend, options }) => {
  const { exit } = useApp();
  const [activeView, setActiveView] = useState<'chat' | 'sessions'>('chat');
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ state: string; detail?: string }>({ state: 'idle' });
  const [approvalRequest, setApprovalRequest] = useState<{ id: string; tool: string; args: unknown } | null>(null);
  const [inputValue, setInputValue] = useState(options.prompt || '');

  const { sendPrompt, approveAction } = useBackend(backend);

  // Initialize session
  useEffect(() => {
    const init = async () => {
      try {
        if (options.session) {
          // Resume existing session
          const existingSession = await backend.getSession(options.session);
          setSession(existingSession);
        } else {
          // Create new session
          const newSession = await backend.createSession(options.workDir || process.cwd());
          setSession(newSession);
          
          // Send initial prompt if provided
          if (options.prompt && newSession) {
            handleSendPrompt(options.prompt);
          }
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        exit();
      }
    };

    init();
  }, []);

  // Listen to backend events
  useEffect(() => {
    const handleEvent = (event: BackendEvent) => {
      switch (event.type) {
        case 'message':
          setMessages(prev => [...prev, event.data]);
          setIsLoading(event.data.role === 'user');
          break;
        case 'status':
          setStatus(event.data);
          setIsLoading(event.data.state === 'running');
          break;
        case 'approval_request':
          if (!options.yolo) {
            setApprovalRequest(event.data);
          } else {
            // Auto-approve in yolo mode
            approveAction(event.data.id, true);
          }
          break;
        case 'error':
          setStatus({ state: 'error', detail: event.data.message });
          setIsLoading(false);
          break;
      }
    };

    backend.on('event', handleEvent);
    return () => {
      backend.off('event', handleEvent);
    };
  }, [backend, options.yolo]);

  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (key.escape) {
      if (approvalRequest) {
        approveAction(approvalRequest.id, false);
        setApprovalRequest(null);
      } else if (activeView === 'sessions') {
        setActiveView('chat');
      }
    }

    if (key.ctrl && input === 'c') {
      if (session && isLoading) {
        backend.interruptSession(session.sessionId);
      } else {
        exit();
      }
    }

    if (key.ctrl && input === 's') {
      setActiveView(activeView === 'sessions' ? 'chat' : 'sessions');
    }

    if (key.ctrl && input === 'x') {
      // Toggle between agent mode and shell mode
      // This would be handled by the backend
    }
  });

  const handleSendPrompt = useCallback((prompt: string) => {
    if (!session || !prompt.trim()) return;
    
    backend.sendPrompt(session.sessionId, prompt);
    setInputValue('');
    setIsLoading(true);
  }, [session, backend]);

  const handleSelectSession = useCallback(async (selectedSession: Session) => {
    setSession(selectedSession);
    setActiveView('chat');
    setMessages([]); // Clear messages, they'll be loaded from history
  }, []);

  const handleCreateSession = useCallback(async (workDir: string) => {
    const newSession = await backend.createSession(workDir);
    setSession(newSession);
    setActiveView('chat');
    setMessages([]);
  }, [backend]);

  const handleApproval = useCallback((approved: boolean) => {
    if (approvalRequest) {
      approveAction(approvalRequest.id, approved);
      setApprovalRequest(null);
    }
  }, [approvalRequest, approveAction]);

  return (
    <Box flexDirection="column" height="100%">
      {/* Main Content Area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Session List Sidebar (hidden in chat view) */}
        {activeView === 'sessions' && (
          <SessionList
            backend={backend}
            onSelect={handleSelectSession}
            onCreate={handleCreateSession}
            currentSessionId={session?.sessionId}
          />
        )}

        {/* Chat View */}
        <Box flexGrow={1} flexDirection="column">
          <ChatView
            messages={messages}
            isLoading={isLoading}
            sessionTitle={session?.title}
          />
        </Box>
      </Box>

      {/* Approval Dialog */}
      {approvalRequest && (
        <ApprovalDialog
          tool={approvalRequest.tool}
          args={approvalRequest.args}
          onApprove={() => handleApproval(true)}
          onReject={() => handleApproval(false)}
        />
      )}

      {/* Prompt Input */}
      <PromptInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSendPrompt}
        isLoading={isLoading}
        placeholder={isLoading ? 'AI is thinking...' : 'Type your message (Ctrl+C to exit, Ctrl+S for sessions)'}
      />

      {/* Status Bar */}
      <StatusBar
        status={status}
        session={session}
        view={activeView}
      />
    </Box>
  );
};
