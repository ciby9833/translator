// frontend/src/services/distance.ts
import { message } from 'antd';
import { API_BASE_URL } from '../config/env';

// 复用 api.ts 中的 URL 创建方法
const createApiUrl = (path: string) => {
  return import.meta.env.PROD ? path : `${API_BASE_URL}${path}`;
};

export const distanceApi = {
  calculateDistance: async (file: File): Promise<Blob> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        createApiUrl('/api/calculate-distance'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || `HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to calculate distance:', error);
      message.error('距离计算失败');
      throw error;
    }
  }
};