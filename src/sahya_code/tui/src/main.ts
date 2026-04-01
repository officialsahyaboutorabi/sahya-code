#!/usr/bin/env node
/**
 * Sahya Code TUI - Terminal User Interface
 * 
 * Inspired by opencode's TUI design, this provides a modern terminal interface
 * for sahya-code's Python backend.
 */

import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { App } from './components/App.js';
import { BackendClient } from './backend/client.js';
import { TUIErrorBoundary } from './components/ErrorBoundary.js';

const LOGO = `
╔═══════════════════════════════════════════╗
║                                           ║
║   ███████  █████  ██   ██ ██████   █████  ║
║   ██      ██   ██ ██   ██ ██   ██ ██   ██ ║
║   ███████ ███████ ███████ ██████  ███████ ║
║        ██ ██   ██ ██   ██ ██   ██ ██   ██ ║
║   ███████ ██   ██ ██   ██ ██   ██ ██   ██ ║
║                                           ║
║         Code smarter, ship faster         ║
║                                           ║
╚═══════════════════════════════════════════╝
`;

interface CLIOptions {
  session?: string;
  workDir?: string;
  prompt?: string;
  model?: string;
  yolo?: boolean;
  debug?: boolean;
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('sahya-code')
    .usage(LOGO + '\nUsage: $0 [options]')
    .option('session', {
      alias: 's',
      type: 'string',
      description: 'Session ID to resume',
    })
    .option('work-dir', {
      alias: 'd',
      type: 'string',
      description: 'Working directory',
      default: process.cwd(),
    })
    .option('prompt', {
      alias: 'p',
      type: 'string',
      description: 'Initial prompt to send',
    })
    .option('model', {
      alias: 'm',
      type: 'string',
      description: 'Model to use',
    })
    .option('yolo', {
      alias: 'y',
      type: 'boolean',
      description: 'Auto-approve all actions',
      default: false,
    })
    .option('debug', {
      type: 'boolean',
      description: 'Enable debug logging',
      default: false,
    })
    .option('web', {
      alias: 'w',
      type: 'boolean',
      description: 'Launch web UI instead of TUI',
      default: false,
    })
    .help('help', 'Show help')
    .alias('help', 'h')
    .version('version', 'Show version', '1.0.0')
    .alias('version', 'v')
    .example('$0', 'Start interactive TUI')
    .example('$0 -p "Explain this code"', 'Send initial prompt')
    .example('$0 -s <session-id>', 'Resume existing session')
    .example('$0 --web', 'Launch web UI')
    .strict()
    .parseAsync();

  // Handle web mode - delegate to Python web server
  if (argv.web) {
    const { spawn } = await import('child_process');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    spawn(pythonCmd, ['-m', 'sahya_code', 'web'], {
      stdio: 'inherit',
      cwd: argv.workDir,
    });
    return;
  }

  // Start TUI mode
  const options: CLIOptions = {
    session: argv.session,
    workDir: argv.workDir,
    prompt: argv.prompt,
    model: argv.model,
    yolo: argv.yolo,
    debug: argv.debug,
  };

  // Create backend client
  const backend = new BackendClient({
    debug: options.debug,
  });

  try {
    // Connect to sahya-code Python backend
    await backend.connect();

    // Render the TUI
    const { waitUntilExit } = render(
      React.createElement(TUIErrorBoundary, {},
        React.createElement(App, {
          backend,
          options,
        })
      ),
      {
        exitOnCtrlC: false,
      }
    );

    // Handle exit
    await waitUntilExit();
  } catch (error) {
    console.error('Failed to start TUI:', error);
    process.exit(1);
  } finally {
    await backend.disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
