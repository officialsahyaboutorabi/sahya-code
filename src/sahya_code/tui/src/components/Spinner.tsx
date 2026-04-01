/**
 * Spinner - Loading animation
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ color = 'yellow' }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return <Text color={color}>{SPINNER_FRAMES[frame]}</Text>;
};
