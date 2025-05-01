// frontend/src/services/user.ts
import { message } from 'antd';
import { API_BASE_URL } from '../config/env';

// 复用 api.ts 中的 URL 创建方法
const createApiUrl = (path: string) => {
  return import.meta.env.PROD ? path : `${API_BASE_URL}${path}`;
};

export const userApi = {
    getUsers: async (params: { page: number; pageSize: number }) => {
      try {
        const response = await fetch(
          createApiUrl(`/api/auth/users?page=${params.page}&page_size=${params.pageSize}`),
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail?.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          items: data.items || [],
          total: data.total || 0,
          page: data.page || 1,
          pageSize: data.page_size || 10
        };
      } catch (error) {
        console.error('Failed to fetch users:', error);
        message.error('获取用户列表失败');
        return { items: [], total: 0, page: 1, pageSize: 10 };
      }
    },
    
    searchUsers: async (query: string) => {
      try {
        const response = await fetch(
          createApiUrl(`/api/auth/users/search?q=${encodeURIComponent(query)}`),
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail?.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          items: data.items || [],
          total: data.total || 0
        };
      } catch (error) {
        console.error('Failed to search users:', error);
        message.error('搜索用户失败');
        return { items: [], total: 0 };
      }
    }
  };