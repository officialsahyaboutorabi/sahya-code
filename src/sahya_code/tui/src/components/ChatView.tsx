/**
 * Chat View - Displays the conversation history
 */

import React, { useEffect, useRef } from 'react';
import { Box, Text, useStdout } from 'ink';
import { Message } from '../backend/client.js';
import { MessageItem } from './MessageItem.js';
import { Spinner } from './Spinner.js';

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  sessionTitle?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, isLoading, sessionTitle }) => {
  const { stdout } = useStdout();
  const scrollRef = useRef<number>(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current = messages.length;
  }, [messages.length]);

  return (
    <Box 
      flexDirection="column" 
      flexGrow={1}
      padding={1}
      borderStyle="single"
      borderColor="gray"
    >
      {/* Header */}
      {sessionTitle && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            📁 {sessionTitle}
          </Text>
        </Box>
      )}

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {messages.length === 0 ? (
          <Box flexGrow={1} alignItems="center" justifyContent="center">
            <Text color="gray">
              No messages yet. Start a conversation!
            </Text>
          </Box>
        ) : (
          messages.map((message, index) => (
            <MessageItem
              key={message.id || index}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <Box marginTop={1}>
            <Spinner />
            <Text color="yellow" marginLeft={1}>
              AI is thinking...
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
