// src/components/GlossaryManager/GlossaryEntries.tsx   前端术语表条目组件
import React, { useEffect, useState } from 'react';
import { Table, message, Descriptions, Space, Alert } from 'antd';
import type { GlossaryEntry } from './types';
import { useTranslation } from 'react-i18next';
import { glossaryApi } from '../../services/api';

interface GlossaryEntriesProps {
  glossaryId: string;
}

interface GlossaryDetails {
  glossary_info: {
    name: string;
    creation_time: string;
    dictionaries: Array<{
      source_lang: string;
      target_lang: string;
      entry_count: number;
    }>;
  };
  entries: GlossaryEntry[];
  total_entries: number;
  entries_available: boolean;
  pagination: {
    current_page: number;
    page_size: number;
    total_pages: number;
  };
}

const GlossaryEntries: React.FC<GlossaryEntriesProps> = ({ glossaryId }) => {
  const { t } = useTranslation();
  const [details, setDetails] = useState<GlossaryDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchGlossaryDetails = async (page: number, size: number) => {
    try {
      setLoading(true);
      const response = await glossaryApi.getGlossaryDetails(glossaryId, page, size);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.message || 'Failed to fetch glossary details');
      }

      const data = await response.json();
      setDetails(data);
    } catch (error) {
      message.error(t('glossary.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (glossaryId) {
      fetchGlossaryDetails(currentPage, pageSize);
    }
  }, [glossaryId, currentPage, pageSize]);

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    console.log('pagination changed:', pagination);
    if (pagination.current !== currentPage) {
      setCurrentPage(pagination.current);
    }
    if (pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize);
      setCurrentPage(1);
    }
  };

  if (!details) {
    return null;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Descriptions title={t('glossary.information')} bordered>
        <Descriptions.Item label={t('glossary.name')}>{details.glossary_info.name}</Descriptions.Item>
        <Descriptions.Item label={t('glossary.createdAt')}>
          {new Date(details.glossary_info.creation_time).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label={t('glossary.totalEntries')}>
          {details.total_entries}
        </Descriptions.Item>
        {details.glossary_info.dictionaries.map((dict, index) => (
          <Descriptions.Item key={index} label={`Dictionary ${index + 1}`}>
            {dict.source_lang} → {dict.target_lang} ({dict.entry_count} entries)
          </Descriptions.Item>
        ))}
      </Descriptions>

      {!details.entries_available && (
        <Alert
          type="warning"
          message={t('glossary.entriesNotAvailable')}
          description={t('glossary.entriesNotAvailableDesc')}
          showIcon
        />
      )}

      {details.entries_available && (
        <Table
          loading={loading}
          dataSource={details.entries}
          columns={[
            {
              title: t('glossary.sourceTerm'),
              dataIndex: 'source',
              key: 'source',
            },
            {
              title: t('glossary.targetTerm'),
              dataIndex: 'target',
              key: 'target',
            },
            {
              title: t('glossary.languages'),
              key: 'languages',
              render: (_, record) => `${record.source_lang} → ${record.target_lang}`
            }
          ]}
          rowKey={record => `${record.source}-${record.target}-${record.source_lang}-${record.target_lang}`}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: details.total_entries,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => t('glossary.showTotal', { total }),
            locale: {
              items_per_page: t('glossary.itemsPerPage'),
              jump_to: t('glossary.jumpTo'),
              jump_to_confirm: t('glossary.jumpToConfirm'),
              page: t('glossary.page')
            }
          }}
          onChange={handleTableChange}
          scroll={{ y: 400 }}
        />
      )}
    </Space>
  );
};

export default GlossaryEntries;