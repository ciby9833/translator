export interface FeishuAuthResponse {
  auth_url: string;
}

export interface FeishuUserInfo {
  name: string;
  en_name: string;
  email: string;
  avatar_url: string;
  tenant_key: string;
  user_id: string;
}

export interface FeishuLoginResponse {
  status: string;
  user_info: FeishuUserInfo;
  access_token: string;
}
