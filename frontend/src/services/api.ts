import { API_BASE_URL } from '../config/env';

export interface TranslationResponse {
  success: boolean;
  error?: string;
}

// 文档翻译相关
export const translateDocument = async (file: File, sourceLang: string, targetLang: string, useGlossary: boolean) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_lang', sourceLang);
  formData.append('target_lang', targetLang);
  formData.append('use_glossary', useGlossary.toString());

  const response = await fetch(`${API_BASE_URL}/api/translate`, {
    method: 'POST',
    body: formData,
  });
  return response;
};

// 文本翻译相关
export const translateText = async (text: string, targetLang: string) => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('target_lang', targetLang);

  const response = await fetch(`${API_BASE_URL}/api/translate/text`, {
    method: 'POST',
    body: formData,
  });
  return response;
};

// 术语表相关
interface GlossarySearchResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  entries: Array<{
    id: number;
    glossary_id: number;
    glossary_name: string;
    source_lang: string;
    target_lang: string;
    source_term: string;
    target_term: string;
    created_at: string;
    glossary_created_at: string;
    glossary_updated_at: string | null;
  }>;
}

export const glossaryApi = {
  // 获取术语表列表
  getGlossaries: () => 
    fetch(`${API_BASE_URL}/api/glossaries`),

  // 创建术语表
  createGlossary: (data: any) => 
    fetch(`${API_BASE_URL}/api/glossaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // 删除术语表
  deleteGlossary: (glossaryId: string) => 
    fetch(`${API_BASE_URL}/api/glossaries/${glossaryId}`, {
      method: 'DELETE',
    }),

  // 获取术语表详情
  getGlossaryDetails: (glossaryId: string, page: number, pageSize: number) => 
    fetch(`${API_BASE_URL}/api/glossaries/${glossaryId}/details?page=${page}&page_size=${pageSize}`),

  // 搜索术语表和词条查询本地数据库
  searchGlossaries: async (params: SearchGlossariesParams): Promise<GlossarySearchResponse> => {
    const queryParams = new URLSearchParams();
    
    // 确保始终发送分页参数
    queryParams.append('page', params.page?.toString() || '1');
    queryParams.append('page_size', params.pageSize?.toString() || '10');
    
    // 添加其他可选查询参数
    if (params.name) queryParams.append('name', params.name);
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.sourceLang) queryParams.append('source_lang', params.sourceLang);
    if (params.targetLang) queryParams.append('target_lang', params.targetLang);

    const response = await fetch(`${API_BASE_URL}/api/glossaries-search?${queryParams}`);
    if (!response.ok) {
      throw new Error('Search failed');
    }
    return response.json();
  },

  // 更新术语表条目本地数据库
  updateGlossaryEntry: async (entryId: number, targetTerm: string) => {
    const response = await fetch(`${API_BASE_URL}/api/glossary-entries/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_term: targetTerm }),
    });
    if (!response.ok) {
      throw new Error('Update failed');
    }
    return response.json();
  },

  // 删除术语表条目
  deleteGlossaryEntry: async (entryId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/glossary-entries/${entryId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Delete failed');
    }
    return response.json();
  },
};
