/**
 * Backend Client - Connects to sahya-code's Python backend
 * 
 * This client communicates with the Python backend via:
 * 1. WebSocket for real-time message streaming
 * 2. HTTP API for session management
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { WebSocket } from 'ws';

export interface BackendConfig {
  debug?: boolean;
  pythonPath?: string;
  apiPort?: number;
}

export interface Session {
  sessionId: string;
  title: string;
  workDir: string;
  lastUpdated: string;
  isRunning: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type BackendEvent =
  | { type: 'message'; data: Message }
  | { type: 'tool_call'; data: ToolCall }
  | { type: 'tool_result'; data: { id: string; result: unknown } }
  | { type: 'status'; data: { state: string; detail?: string } }
  | { type: 'approval_request'; data: { id: string; tool: string; args: unknown } }
  | { type: 'error'; data: { message: string } };

export class BackendClient extends EventEmitter {
  private config: BackendConfig;
  private ws: WebSocket | null = null;
  private pythonProcess: ChildProcess | null = null;
  private messageQueue: string[] = [];
  private isConnected = false;

  constructor(config: BackendConfig = {}) {
    super();
    this.config = {
      debug: false,
      pythonPath: process.platform === 'win32' ? 'python' : 'python3',
      apiPort: 5494,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    // Start the Python backend process with WebSocket
    await this.startPythonBackend();

    // Connect via WebSocket
    await this.connectWebSocket();

    this.isConnected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.pythonProcess) {
      this.pythonProcess.kill('SIGTERM');
      this.pythonProcess = null;
    }

    this.emit('disconnected');
  }

  private async startPythonBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start sahya-code in server mode
      this.pythonProcess = spawn(this.config.pythonPath!, [
        '-m', 'sahya_code',
        'web',
        '--port', String(this.config.apiPort),
        '--no-browser',
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          LOG_LEVEL: this.config.debug ? 'DEBUG' : 'WARNING',
        },
      });

      let stdout = '';
      let stderr = '';

      this.pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (this.config.debug) {
          console.log('[Backend STDOUT]', data.toString().trim());
        }
      });

      this.pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (this.config.debug) {
          console.log('[Backend STDERR]', data.toString().trim());
        }
      });

      this.pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python backend: ${error.message}`));
      });

      // Wait for server to be ready
      setTimeout(() => {
        if (this.pythonProcess?.exitCode === null) {
          resolve();
        } else {
          reject(new Error(`Python backend exited with code ${this.pythonProcess?.exitCode}\n${stderr}`));
        }
      }, 2000);
    });
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:${this.config.apiPort}/api/sessions/ws`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.flushMessageQueue();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const event: BackendEvent = JSON.parse(data.toString());
          this.handleBackendEvent(event);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('close', () => {
        this.emit('disconnected');
      });
    });
  }

  private handleBackendEvent(event: BackendEvent): void {
    this.emit('event', event);
    this.emit(event.type, event.data);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  send(message: unknown): void {
    const data = JSON.stringify(message);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  // Session Management
  async createSession(workDir: string): Promise<Session> {
    const response = await fetch(`http://localhost:${this.config.apiPort}/api/sessions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_dir: workDir }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  async listSessions(): Promise<Session[]> {
    const response = await fetch(`http://localhost:${this.config.apiPort}/api/sessions/`);
    
    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.statusText}`);
    }

    return response.json();
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await fetch(`http://localhost:${this.config.apiPort}/api/sessions/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`http://localhost:${this.config.apiPort}/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  }

  // Chat
  sendPrompt(sessionId: string, prompt: string): void {
    this.send({
      type: 'prompt',
      sessionId,
      prompt,
    });
  }

  sendApproval(approvalId: string, approved: boolean): void {
    this.send({
      type: 'approval_response',
      approvalId,
      approved,
    });
  }

  interruptSession(sessionId: string): void {
    this.send({
      type: 'interrupt',
      sessionId,
    });
  }
}
