// frontend/src/pages/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import { Table, Input, Space, Card, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { userApi } from '../services/user';
import type { TablePaginationConfig } from 'antd/lib/table';
import dayjs from 'dayjs';

const { Search } = Input;

interface UserData {
  id: string;
  name: string;
  email: string;
  en_name: string;
  avatar_url: string;
  last_login: string;
  status: string;
  login_count: number;
  created_at: string;
  tenant_key: string;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => t('user.total', { total })
  });

  const columns = [
    {
      title: t('user.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: UserData) => (
        <Space>
          {record.avatar_url && (
            <img 
              src={record.avatar_url} 
              alt="avatar" 
              style={{ width: 24, height: 24, borderRadius: '50%' }} 
            />
          )}
          {text}
        </Space>
      )
    },
    {
      title: t('user.enName'),
      dataIndex: 'en_name',
      key: 'en_name',
    },
    {
      title: t('user.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('user.lastLogin'),
      dataIndex: 'last_login',
      key: 'last_login',
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: t('user.loginCount'),
      dataIndex: 'login_count',
      key: 'login_count',
      sorter: (a: UserData, b: UserData) => a.login_count - b.login_count
    },
    {
      title: t('user.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={`status-tag ${status}`}>
          {t(`user.status.${status}`)}
        </span>
      )
    },
    {
      title: t('user.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  const fetchUsers = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const data = await userApi.getUsers({ page, pageSize });
      setUsers(data.items);
      setPagination({
        ...pagination,
        current: data.page,
        pageSize: data.pageSize,
        total: data.total
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string) => {
    try {
      setLoading(true);
      const data = await userApi.searchUsers(value);
      setUsers(data.items);
      setPagination({
        ...pagination,
        total: data.total
      });
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchUsers(newPagination.current, newPagination.pageSize);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <Card 
      title={t('user.management')} 
      className="user-management-card"
      extra={
        <Search
          placeholder={t('user.searchPlaceholder')}
          onSearch={handleSearch}
          style={{ width: 300 }}
          allowClear
        />
      }
    >
      <Table
        columns={columns}
        dataSource={users}
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        rowKey="id"
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};

export default UserManagement;