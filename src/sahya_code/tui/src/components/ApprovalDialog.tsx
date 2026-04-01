/**
 * Approval Dialog - Shows tool execution approval requests
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';

interface ApprovalDialogProps {
  tool: string;
  args: unknown;
  onApprove: () => void;
  onReject: () => void;
}

export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  tool,
  args,
  onApprove,
  onReject,
}) => {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onApprove();
    } else if (input === 'n' || input === 'N' || key.escape) {
      onReject();
    }
  });

  const argsString = JSON.stringify(args, null, 2);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={2}
      margin={2}
      position="absolute"
      backgroundColor="black"
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ⚠️  Approval Required
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          Tool: <Text bold color="cyan">{tool}</Text>
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text dimColor>Arguments:</Text>
        <Text color="gray">{argsString}</Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          Approve? <Text bold color="green">[Y]</Text>es / <Text bold color="red">[N]</Text>o
        </Text>
      </Box>
    </Box>
  );
};
