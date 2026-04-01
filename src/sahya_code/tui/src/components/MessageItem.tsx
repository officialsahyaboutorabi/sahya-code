/**
 * Message Item - Displays a single message
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../backend/client.js';

interface MessageItemProps {
  message: Message;
  isLast?: boolean;
}

const getRoleColor = (role: string): string => {
  switch (role) {
    case 'user': return 'green';
    case 'assistant': return 'blue';
    case 'system': return 'yellow';
    case 'tool': return 'magenta';
    default: return 'white';
  }
};

const getRoleIcon = (role: string): string => {
  switch (role) {
    case 'user': return '👤';
    case 'assistant': return '🤖';
    case 'system': return '⚙️';
    case 'tool': return '🔧';
    default: return '💬';
  }
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, isLast }) => {
  const color = getRoleColor(message.role);
  const icon = getRoleIcon(message.role);

  return (
    <Box 
      flexDirection="column" 
      marginBottom={1}
      borderStyle={isLast ? 'single' : undefined}
      borderColor={isLast ? color : undefined}
      padding={isLast ? 1 : 0}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={color}>
          {icon} {message.role.toUpperCase()}
        </Text>
        {message.timestamp && (
          <Text color="gray" dimColor>
            {' '}{new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </Box>

      {/* Content */}
      <Box flexDirection="column">
        {message.content.split('\n').map((line, index) => (
          <Text key={index} color={color}>
            {line || ' '}
          </Text>
        ))}
      </Box>

      {/* Metadata */}
      {message.metadata && (
        <Box marginTop={1}>
          <Text dimColor color="gray">
            {JSON.stringify(message.metadata)}
          </Text>
        </Box>
      )}
    </Box>
  );
};
