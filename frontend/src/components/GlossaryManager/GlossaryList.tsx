// src/components/GlossaryManager/GlossaryList.tsx  前端术语表列表组件
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, message } from 'antd';
import type { Glossary, Dictionary } from './types';
import GlossaryEntries from './GlossaryEntries';
import { useTranslation } from 'react-i18next';
import { glossaryApi } from '../../services/api';

const GlossaryList: React.FC = () => {
  const { t } = useTranslation();
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGlossaryId, setSelectedGlossaryId] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchGlossaries = async () => {
    try {
      setLoading(true);
      const response = await glossaryApi.getGlossaries();
      const data = await response.json();
      setGlossaries(data.glossaries);
    } catch (error) {
      message.error(t('glossary.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const deleteGlossary = async (glossaryId: string) => {
    try {
      await glossaryApi.deleteGlossary(glossaryId);
      message.success(t('glossary.deleteSuccess'));
      fetchGlossaries();
    } catch (error) {
      message.error(t('glossary.deleteError'));
    }
  };

  const viewEntries = (glossaryId: string) => {
    setSelectedGlossaryId(glossaryId);
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: t('glossary.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('glossary.createdAt'),
      dataIndex: 'creation_time',
      key: 'creation_time',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: t('glossary.dictionaries'),
      dataIndex: 'dictionaries',
      key: 'dictionaries',
      render: (dictionaries: Dictionary[]) => (
        <ul>
          {dictionaries.map((dict, index) => (
            <li key={index}>
              {dict.source_lang} → {dict.target_lang} ({dict.entry_count} {t('glossary.entries')})
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: t('glossary.actions'),
      key: 'actions',
      render: (_: any, record: Glossary) => (
        <Space>
          <Button onClick={() => viewEntries(record.glossary_id)}>{t('glossary.viewEntries')}</Button>
          {/* <Button danger onClick={() => deleteGlossary(record.glossary_id)}>{t('glossary.delete')}</Button> */}
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchGlossaries();
  }, []);

  return (
    <>
      <Table
        loading={loading}
        dataSource={glossaries}
        columns={columns}
        rowKey="glossary_id"
      />
      <Modal
        title="Glossary Entries"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        footer={null}
      >
        {selectedGlossaryId && <GlossaryEntries glossaryId={selectedGlossaryId} />}
      </Modal>
    </>
  );
};

export default GlossaryList;
