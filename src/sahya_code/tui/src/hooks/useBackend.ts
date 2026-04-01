/**
 * useBackend Hook - Provides convenient methods for backend communication
 */

import { useCallback } from 'react';
import { BackendClient } from '../backend/client.js';

export const useBackend = (backend: BackendClient) => {
  const sendPrompt = useCallback((sessionId: string, prompt: string) => {
    backend.sendPrompt(sessionId, prompt);
  }, [backend]);

  const approveAction = useCallback((approvalId: string, approved: boolean) => {
    backend.sendApproval(approvalId, approved);
  }, [backend]);

  const interruptSession = useCallback((sessionId: string) => {
    backend.interruptSession(sessionId);
  }, [backend]);

  const createSession = useCallback(async (workDir: string) => {
    return backend.createSession(workDir);
  }, [backend]);

  const listSessions = useCallback(async () => {
    return backend.listSessions();
  }, [backend]);

  return {
    sendPrompt,
    approveAction,
    interruptSession,
    createSession,
    listSessions,
  };
};
