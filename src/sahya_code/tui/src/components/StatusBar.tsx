/**
 * Status Bar - Shows current status and session info
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Session } from '../backend/client.js';

interface StatusBarProps {
  status: { state: string; detail?: string };
  session: Session | null;
  view: 'chat' | 'sessions';
}

const getStatusColor = (state: string): string => {
  switch (state) {
    case 'idle': return 'green';
    case 'running': return 'yellow';
    case 'error': return 'red';
    default: return 'gray';
  }
};

export const StatusBar: React.FC<StatusBarProps> = ({ status, session, view }) => {
  const statusColor = getStatusColor(status.state);

  return (
    <Box 
      height={1} 
      flexDirection="row" 
      backgroundColor="blackBright"
      paddingLeft={1}
      paddingRight={1}
    >
      {/* Left side - Status */}
      <Box flexGrow={1}>
        <Text color={statusColor}>
          ● {status.state.toUpperCase()}
        </Text>
        {status.detail && (
          <Text color="gray"> : {status.detail}</Text>
        )}
      </Box>

      {/* Center - View indicator */}
      <Box>
        <Text color="cyan">
          [{view === 'chat' ? 'CHAT' : 'SESSIONS'}]
        </Text>
      </Box>

      {/* Right side - Session info */}
      <Box flexGrow={1} justifyContent="flex-end">
        {session ? (
          <Text color="gray">
            Session: {session.sessionId.slice(0, 8)}... | {session.workDir}
          </Text>
        ) : (
          <Text color="gray">No session</Text>
        )}
      </Box>
    </Box>
  );
};
