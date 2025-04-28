// src/types/glossary.d.ts  前端术语表类型定义
declare module '@/components/GlossaryManager' {
  export interface Dictionary {
    source_lang: string;
    target_lang: string;
    entry_count: number;
  }

  export interface Glossary {
    glossary_id: string;
    name: string;
    dictionaries: Dictionary[];
    creation_time: string;
  }

  export interface GlossaryEntry {
    source: string;
    target: string;
  }
}
