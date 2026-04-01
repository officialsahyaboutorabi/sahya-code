/**
 * Session List - Shows available sessions
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { BackendClient, Session } from '../backend/client.js';
import { Spinner } from './Spinner.js';

interface SessionListProps {
  backend: BackendClient;
  onSelect: (session: Session) => void;
  onCreate: (workDir: string) => void;
  currentSessionId?: string;
}

export const SessionList: React.FC<SessionListProps> = ({
  backend,
  onSelect,
  onCreate,
  currentSessionId,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const list = await backend.listSessions();
      setSessions(list);
      
      // Pre-select current session
      const currentIndex = list.findIndex(s => s.sessionId === currentSessionId);
      if (currentIndex >= 0) {
        setSelectedIndex(currentIndex);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1));
    } else if (key.return) {
      const session = sessions[selectedIndex];
      if (session) {
        onSelect(session);
      }
    } else if (input === 'n') {
      // Create new session
      onCreate(process.cwd());
    } else if (input === 'd') {
      // Delete session
      const session = sessions[selectedIndex];
      if (session) {
        backend.deleteSession(session.sessionId).then(() => {
          loadSessions();
        });
      }
    } else if (input === 'r') {
      // Refresh
      loadSessions();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Spinner />
        <Text>Loading sessions...</Text>
      </Box>
    );
  }

  return (
    <Box 
      flexDirection="column" 
      width={40}
      borderStyle="single"
      borderColor="cyan"
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          📁 Sessions
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {sessions.length === 0 ? (
          <Text color="gray">No sessions found</Text>
        ) : (
          sessions.map((session, index) => (
            <Box
              key={session.sessionId}
              backgroundColor={index === selectedIndex ? 'cyan' : undefined}
              paddingLeft={1}
              paddingRight={1}
            >
              <Text
                color={session.sessionId === currentSessionId ? 'green' : 'white'}
                bold={index === selectedIndex}
              >
                {session.sessionId === currentSessionId ? '▸ ' : '  '}
                {session.title || 'Untitled'}
              </Text>
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor color="gray">
          ↑↓ Navigate | Enter Select
        </Text>
        <Text dimColor color="gray">
          n New | d Delete | r Refresh
        </Text>
        <Text dimColor color="gray">
          ESC Back
        </Text>
      </Box>
    </Box>
  );
};
