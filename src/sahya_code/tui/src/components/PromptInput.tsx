/**
 * Prompt Input - Text input for user messages
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdin } from 'ink';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Type your message...',
}) => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const { stdin, setRawMode } = useStdin();

  useEffect(() => {
    setRawMode(true);
    return () => {
      setRawMode(false);
    };
  }, []);

  useInput((input, key) => {
    if (isLoading) return;

    if (key.return) {
      onSubmit(value);
      onChange('');
      setCursorPosition(0);
      return;
    }

    if (key.leftArrow) {
      setCursorPosition(pos => Math.max(0, pos - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPosition(pos => Math.min(value.length, pos + 1));
      return;
    }

    if (key.home) {
      setCursorPosition(0);
      return;
    }

    if (key.end) {
      setCursorPosition(value.length);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(pos => pos - 1);
      }
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(pos => pos + input.length);
    }
  });

  // Render the input line with cursor
  const beforeCursor = value.slice(0, cursorPosition);
  const atCursor = value[cursorPosition] || ' ';
  const afterCursor = value.slice(cursorPosition + 1);

  return (
    <Box 
      flexDirection="column" 
      borderStyle="single" 
      borderColor={isLoading ? 'gray' : 'green'}
      padding={1}
    >
      {value === '' ? (
        <Text dimColor>{placeholder}</Text>
      ) : (
        <Box>
          <Text>{beforeCursor}</Text>
          <Text backgroundColor="green" color="black">
            {atCursor}
          </Text>
          <Text>{afterCursor}</Text>
        </Box>
      )}
    </Box>
  );
};
