// API client for communicating with the local development server

const SERVER_URL = 'http://localhost:3001';

export interface CreateProjectRequest {
  projectName: string;
  projectPath: string;
}

export interface CreateProjectResponse {
  success: boolean;
  path?: string;
  message?: string;
  error?: string;
}

export async function createProject(request: CreateProjectRequest): Promise<CreateProjectResponse> {
  try {
    const response = await fetch(`${SERVER_URL}/api/create-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to server'
    };
  }
}

export async function installDependencies(
  projectPath: string,
  onProgress: (message: string, type: 'output' | 'error' | 'complete') => void
): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/install-dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error('No response body');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          onProgress(data.message || '', data.type);
          
          if (data.type === 'complete') {
            return;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}

export async function runProject(
  projectPath: string,
  platform: 'start' | 'android' | 'ios' | 'web',
  onOutput: (message: string, type: string) => void
): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/run-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, platform })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error('No response body');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          onOutput(data.message || data.command || '', data.type);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}

export async function checkServerStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/engine-files`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function saveScene(projectPath: string, sceneCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${SERVER_URL}/api/save-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, sceneCode })
    });
    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to save scene'
    };
  }
}

export interface GameProject {
  name: string;
  path: string;
  hasEngine: boolean;
  lastModified: string;
  size: string;
}

export async function scanProjects(directoryPath: string): Promise<{ success: boolean; projects?: GameProject[]; error?: string }> {
  try {
    const response = await fetch(`${SERVER_URL}/api/scan-projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directoryPath })
    });
    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to scan projects'
    };
  }
}

