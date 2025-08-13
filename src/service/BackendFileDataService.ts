import { FileData } from '../models/FileData';
import { BackendAPI } from './BackendAPI';

export class BackendFileDataService {
  
  static async getFileData(id: number): Promise<FileData | undefined> {
    try {
      return await BackendAPI.get<FileData>(`/file-data/${id}`);
    } catch (error: any) {
      if (error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  static async addFileData(fileData: FileData): Promise<number> {
    const response = await BackendAPI.post<{ id: number }>('/file-data', fileData);
    return response.id;
  }

  static async updateFileData(id: number, changes: Partial<FileData>): Promise<number> {
    await BackendAPI.patch(`/file-data/${id}`, changes);
    // Return 1 to indicate successful update (mimics original interface)
    return 1;
  }

  static async deleteFileData(id: number): Promise<void> {
    await BackendAPI.delete(`/file-data/${id}`);
  }

  static async deleteAllFileData(): Promise<void> {
    await BackendAPI.delete('/file-data');
  }

  static async getFileDataStats(): Promise<{
    total_files: number;
    total_size: number;
    avg_size: number;
    oldest_file: string;
    newest_file: string;
  }> {
    return await BackendAPI.get('/file-data/stats/summary');
  }
}

export default BackendFileDataService;