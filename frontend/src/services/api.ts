export interface TranslationResponse {
  success: boolean;
  error?: string;
}

export const translateDocument = async (
  file: File,
  targetLang: string
): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_lang', targetLang);

  const response = await fetch('/api/translate', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Translation failed');
  }

  return response.blob();
};
