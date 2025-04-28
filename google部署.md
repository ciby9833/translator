环境部署
后端：
安装 psycopg2：pip install psycopg2-binary
安装必要的数据库相关依赖：

```bash
# 在你的 conda 环境中安装以下包
conda install sqlalchemy psycopg2-binary

# 或者使用 pip
pip install sqlalchemy psycopg2-binary
```

安装完这些依赖后，再次运行：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```




1. 首先，准备工作：
```bash
# 1. 安装 Google Cloud SDK
# 2. 登录 Google Cloud
gcloud auth login
# 3. 创建新项目或选择现有项目
gcloud projects create cargo-ppt-translator  # 创建新项目
gcloud config set project cargo-ppt-translator  # 设置当前项目
```

2. 后端部署 (使用 Cloud Run)：
```bash
# 1. 创建 Dockerfile
# backend/Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# 设置环境变量
ENV PORT=8080

# 启动命令
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}

# 2. 构建并推送镜像
gcloud builds submit --tag gcr.io/cargo-ppt-translator/backend

# 3. 部署到 Cloud Run
gcloud run deploy cargo-translator-backend \
  --image gcr.io/cargo-ppt-translator/backend \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated
```

3. 前端部署 (使用 Firebase Hosting)：
```bash
# 1. 安装 Firebase CLI
npm install -g firebase-tools

# 2. 登录 Firebase
firebase login

# 3. 初始化 Firebase 项目
firebase init

# 4. 修改前端配置，更新 API 地址
# frontend/src/config.ts
export const API_BASE_URL = 'https://your-cloud-run-url.run.app';

# 5. 构建前端项目
cd frontend
npm run build

# 6. 部署到 Firebase Hosting
firebase deploy
```

4. 配置文件示例：

```yaml
# firebase.json
{
  "hosting": {
    "public": "frontend/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

```yaml
# backend/.env.prod
DEEPL_API_KEY=your_deepl_api_key
GOOGLE_CLOUD_PROJECT=cargo-ppt-translator
```

5. 环境变量和密钥管理：
```bash
# 在 Cloud Run 中设置环境变量
gcloud run services update cargo-translator-backend \
  --set-env-vars "DEEPL_API_KEY=your_deepl_api_key"

# 或使用 Secret Manager
gcloud secrets create deepl-api-key --replication-policy="automatic"
echo -n "your_deepl_api_key" | gcloud secrets versions add deepl-api-key --data-file=-
```

6. 设置 CORS 和安全配置：
```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-firebase-app.web.app",
        "https://your-firebase-app.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

7. 监控和日志设置：
```python
# backend/main.py
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 使用 Cloud Logging
from google.cloud import logging as cloud_logging
client = cloud_logging.Client()
client.setup_logging()
```

8. 自动化部署（可选）：
```yaml
# .github/workflows/deploy.yml
name: Deploy to Google Cloud
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Google Cloud
        uses: google-github-actions/setup-gcloud@v0
        with:
          project_id: cargo-ppt-translator
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          
      - name: Deploy Backend
        run: |
          gcloud builds submit --tag gcr.io/cargo-ppt-translator/backend
          gcloud run deploy cargo-translator-backend \
            --image gcr.io/cargo-ppt-translator/backend \
            --platform managed \
            --region asia-east1
            
      - name: Deploy Frontend
        run: |
          npm install
          npm run build
          firebase deploy --token "${{ secrets.FIREBASE_TOKEN }}"
```

重要注意事项：
1. 确保所有敏感信息（API密钥等）都使用环境变量或 Secret Manager 管理
2. 设置适当的 CORS 策略
3. 配置合适的日志级别和监控
4. 考虑使用 CDN 提升访问速度
5. 设置适当的扩缩容策略
6. 配置域名和 SSL 证书
7. 实施适当的安全措施（如 rate limiting）

您需要我详细解释哪个部分吗？或者需要具体的配置示例？
