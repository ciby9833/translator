前端项目是使用 Vite + React + TypeScript 构建的

1. **环境配置文件**
- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置

配置：

Read file: /Users/ellisfrancis/Documents/CargoPPT/frontend/.env.production
2. **部署步骤**

前端部署流程：

```bash
# 1. 安装依赖
npm install

# 2. 构建生产环境代码
npm run build

# 3. 构建完成后，dist 目录就是要部署的文件
```

3. **部署配置**

 `vite.config.ts` 已经配置了基本的构建设置，包括：
- 代理配置
- 路径别名
- CSS 预处理器配置

4. **服务器部署方案**

建议以下部署方案：

A. **使用 Nginx 部署（推荐）**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # HTTPS 配置（推荐）
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 网站根目录指向构建后的 dist 目录
    root /path/to/your/frontend/dist;
    index index.html;

    # 处理单页应用路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理配置
    location /api {
        proxy_pass http://your-backend-server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存配置
    location /assets {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

5. **自动化部署脚本**

创建一个部署脚本 `deploy.sh`：

```bash
#!/bin/bash

# 安装依赖
npm install

# 构建项目
npm run build

# 将构建后的文件复制到服务器
rsync -avz --delete dist/ user@your-server:/path/to/nginx/html/

# 清理本地构建文件（可选）
rm -rf dist/
```

6. **注意事项和建议**

1. **环境变量配置**:
   - 确保 `.env.production` 中的 `VITE_API_BASE_URL` 设置为正确的生产环境 API 地址
   - 不要将敏感信息放在前端环境变量中

2. **性能优化**:
   - 确保启用了 gzip 压缩
   ```nginx
   # 在 Nginx 配置中添加
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   ```
   - 配置适当的缓存策略

3. **安全配置**:
   - 启用 HTTPS
   - 设置适当的 CSP (Content Security Policy) 头
   - 配置 CORS 策略

4. **监控和日志**:
   - 配置错误日志
   - 设置访问日志
   ```nginx
   # 在 Nginx 配置中添加
   access_log /var/log/nginx/your-app.access.log;
   error_log /var/log/nginx/your-app.error.log;
   ```

7. **CI/CD 集成建议**

如果需要设置 CI/CD，可以使用 GitHub Actions：

```yaml
name: Deploy Frontend

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "dist/*"
          target: "/path/to/nginx/html/"
```

需要我详细解释任何部分吗？或者您有其他具体的部署需求需要讨论？



我来帮您分析前后端的部署要求和服务器配置需求：

1. **服务器基础配置要求**：

基于项目的规模和技术栈，建议最低配置：
```
CPU: 2核心及以上
内存: 4GB及以上
硬盘: 50GB及以上（SSD优先）
带宽: 5Mbps及以上
```

2. **操作系统要求**：

支持以下操作系统：
```
- Ubuntu 20.04/22.04 LTS（推荐）
- CentOS 7/8
- Debian 10/11
```

3. **软件环境要求**：

前端依赖：
```
- Node.js >= 18.x
- npm >= 9.x 或 yarn >= 1.22.x
```

后端依赖：
```
- Python >= 3.9
- pip >= 21.x
- uvicorn >= 0.24.0
- nginx >= 1.18
```

4. **数据库要求**：

从 `database.py` 和 `.env.example` 可以看出：
```
数据库类型: PostgreSQL
版本要求: >= 12.x
配置要求:
- 最小连接池: 5
- 最大溢出连接: 10
- 连接超时: 30秒
- 连接回收时间: 1800秒
```

5. **端口要求**：

需要开放的端口：
```
80: HTTP（Nginx）
443: HTTPS（Nginx，推荐）
8000: 后端API服务（uvicorn）
5432: PostgreSQL（建议只允许内部访问）
```

6. **存储要求**：

文件系统权限：
```
/var/www/html/：前端静态文件
/var/log/：日志文件
/etc/nginx/：Nginx配置
/etc/systemd/system/：系统服务配置
```

7. **环境变量配置**：

后端环境变量（`.env`）：
```ini
# DeepL Configuration
DEEPL_API_KEY=your-deepl-api-key
DEEPL_API_TYPE=pro  # Options: free, pro

# Google Configuration
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_TRANSLATE_API_KEY=your-api-key

# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=translation

# Database Pool Configuration
POSTGRES_POOL_SIZE=5
POSTGRES_MAX_OVERFLOW=10
POSTGRES_POOL_TIMEOUT=30
POSTGRES_POOL_RECYCLE=1800
```

前端环境变量：
```ini
# .env.production
VITE_API_BASE_URL=https://your-api-domain.com

# .env.development
VITE_API_BASE_URL=http://localhost:8000
```

8. **部署步骤**：

A. **数据库部署**：
```bash
# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE translation;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE translation TO your_user;
```

B. **后端部署**：
```bash
# 创建 Python 虚拟环境
python -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 创建系统服务
sudo nano /etc/systemd/system/cargoppt.service

[Unit]
Description=CargoPPT Translation Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target

# 启动服务
sudo systemctl enable cargoppt
sudo systemctl start cargoppt
```

C. **前端部署**：
```bash
# 安装依赖
npm install

# 构建生产环境代码
npm run build

# 配置 Nginx
sudo nano /etc/nginx/sites-available/cargoppt

server {
    listen 80;
    server_name your-domain.com;

    # SSL 配置（推荐）
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 前端静态文件
    location / {
        root /var/www/html/cargoppt;
        try_files $uri $uri/ /index.html;
        
        # 缓存配置
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 启用 gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}

# 创建软链接并重启 Nginx
sudo ln -s /etc/nginx/sites-available/cargoppt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

9. **监控和维护建议**：

```bash
# 日志监控
- /var/log/nginx/access.log
- /var/log/nginx/error.log
- /path/to/backend/debug.log

# 数据库备份
pg_dump translation > backup.sql

# 系统监控
htop
nginx -V
systemctl status cargoppt
```

10. **安全建议**：

```
- 启用 HTTPS
- 配置防火墙（UFW）
- 设置 rate limiting
- 定期更新系统和依赖包
- 使用强密码和密钥
- 配置数据库访问限制
```

需要我详细解释任何部分吗？或者您有其他具体的部署需求需要讨论？
