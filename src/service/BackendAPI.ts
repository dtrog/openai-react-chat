// Backend API configuration and utilities
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3331/api';

export class BackendAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'BackendAPIError';
  }
}

export class BackendAPI {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BackendAPIError(
          errorData.error || `Request failed with status ${response.status}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BackendAPIError) {
        throw error;
      }
      throw new BackendAPIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Health check utility
export async function checkBackendHealth(): Promise<boolean> {
  try {
    await BackendAPI.get('/health');
    return true;
  } catch {
    return false;
  }
}