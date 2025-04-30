// frontend/src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // 检查URL中是否有错误参数
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      
      if (error) {
        console.error('Auth error:', error);
        // 显示适当的错误消息
        // 可以使用antd的message组件
        message.error(getErrorMessage(error));
        window.location.href = '/login';
        return;
      }

      const encodedData = urlParams.get('data');
      
      console.log('Received encoded data:', encodedData);

      if (!encodedData) {
        throw new Error('No auth data received');
      }

      // 解码并解析认证数据
      const decodedData = decodeURIComponent(encodedData);
      console.log('Decoded data:', decodedData);
      
      const data = JSON.parse(decodedData);
      console.log('Parsed data:', data);
      
      if (data.status === 'success' && data.user_info && data.access_token) {
        // 保存完整的用户信息
        localStorage.setItem('user_info', JSON.stringify({
          id: data.user_info.id,
          name: data.user_info.name,
          en_name: data.user_info.en_name,
          email: data.user_info.email,
          avatar_url: data.user_info.avatar_url,
          tenant_key: data.user_info.tenant_key,
          feishu_user_id: data.user_info.feishu_user_id
        }));
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('expires_at', data.expires_at.toString());
        
        console.log('Auth data saved, redirecting to home');
        
        // 使用 window.location.href 进行强制跳转
        window.location.href = '/';
      } else {
        throw new Error('Invalid auth data');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      // 添加更多错误信息
      if (error instanceof SyntaxError) {
        console.error('JSON parsing error:', error.message);
      }
      window.location.href = '/login';
    }
  }, [navigate]);

  // 错误消息映射
  const getErrorMessage = (error: string) => {
    const errorMessages: Record<string, string> = {
      'token_failed': '获取访问令牌失败',
      'user_info_failed': '获取用户信息失败',
      'no_tenant_key': '未找到组织信息',
      'unauthorized_org': '未授权的组织访问',
      'auth_failed': '认证失败',
      'invalid_state': '无效的状态参数'
    };
    return errorMessages[error] || '登录过程中发生错误';
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ fontSize: '20px' }}>登录验证中...</div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        请稍候，正在处理您的登录请求
      </div>
    </div>
  );
};