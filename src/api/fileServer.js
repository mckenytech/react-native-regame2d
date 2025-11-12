const API_URL = 'http://localhost:3000';

export const FileServer = {
  /**
   * Check if the file server is running
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_URL}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('File server is not running. Please start the server first.');
    }
  },

  /**
   * Create a new directory
   */
  async createDirectory(path) {
    const response = await fetch(`${API_URL}/create-directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create directory');
    }
    
    return await response.json();
  },

  /**
   * Create a new project from the starter template
   */
  async createProject(projectPath, projectName) {
    const response = await fetch(`${API_URL}/create-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, projectName }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }
    
    return await response.json();
  },

  /**
   * Check if a path exists
   */
  async checkPath(path) {
    const response = await fetch(`${API_URL}/check-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check path');
    }
    
    return await response.json();
  },

  /**
   * List contents of a directory
   */
  async listDirectory(path) {
    const response = await fetch(`${API_URL}/list-directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list directory');
    }
    
    return await response.json();
  },
};

