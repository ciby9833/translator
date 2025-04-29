CargoPPT/
frontend/           # React 前端
├── src/
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   ├── LanguageSelect.tsx
│   │   └── TranslationStatus.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── style.css
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
├── backend/           # FastAPI 后端
│   ├── main.py
│   ├── requirements.txt
│   └── .env
└── README.md

系统中所有的 Conda 环境：
conda env list

环境切换命令：
conda activate conda

后端包管理安装
# 在 backend 目录下运行
pip install -r requirements.txt
⸻

✅ 常用 Conda 命令清单

操作	命令
查看所有环境	conda env list 或 conda info --envs
创建新环境	conda create -n myenv python=3.10
激活环境	conda activate myenv
退出当前环境	conda deactivate
删除环境	conda remove -n myenv --all
查看环境包	conda list 或 conda list -n myenv
导出环境配置	conda env export > environment.yml
从配置创建环境	conda env create -f environment.yml



⸻



后端运行：uvicorn main:app --reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
前端运行：npm run dev



这些文件的主要作用：

**组件文件 (`/components/`):**
1. `TextTranslate.tsx` & `TextTranslate.css`
   - 文本翻译组件，包含源文本和目标文本的输入框
   - 支持语言选择、文本交换、复制等功能
   - 对应的样式文件处理布局和交互效果

2. `FileUpload.tsx`
   - 文件上传组件
   - 处理文档拖放和选择功能
   - 支持 PDF、DOCX、PPTX 格式

3. `LanguageSelect.tsx`
   - 语言选择组件
   - 用于选择目标翻译语言

4. `LanguageSwitch.tsx`
   - 界面语言切换组件
   - 用于切换应用界面的显示语言（中文/英文/印尼文）

5. `TranslatorSelect.tsx`
   - 翻译服务选择组件
   - 用于选择翻译服务提供商（DeepL/Google）

6. `TranslationStatus.tsx`
   - 翻译状态显示组件
   - 显示当前翻译进度和状态信息

7. `TranslationModeSwitch.tsx` & `TranslationModeSwitch.css`
   - 翻译模式切换组件
   - 用于切换文本翻译和文档翻译模式
   - 对应的样式文件

**主要应用文件:**

1. `App.tsx`
   - 应用的主要组件
   - 整合所有子组件
   - 管理全局状态（翻译模式、状态、文件选择等）
   - 处理文档翻译的主要逻辑流程：
     - 文件上传
     - 状态检查
     - 结果下载

2. `style.css`
   - 全局样式文件
   - 定义全局变量（颜色主题）
   - 设置基础布局样式
   - 处理响应式设计
   - 定义动画效果

3. `index.html`
   - 应用的入口 HTML 文件
   - 引入 Material Icons 字体
   - 设置基本的 meta 信息
   - 定义根 DOM 节点
   - 引入主应用脚本

**整体架构:**
- 采用组件化设计，每个组件负责特定功能
- 使用 React + TypeScript 开发
- 支持国际化（i18n）
- 包含文本和文档两种翻译模式
- 使用 Material Icons 作为图标系统
- 响应式设计适配不同屏幕尺寸

## Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual configuration values:
   - Get your DeepL API key from [DeepL API Dashboard](https://www.deepl.com/pro-account/plan)
   - Set DEEPL_API_TYPE according to your subscription (free/pro)
   - Configure other settings as needed

3. Never commit the `.env` file to version control



如果您想要自动化这个过程，可以创建一个部署脚本：

```bash
#!/bin/bash
# deploy-backend.sh

# 配置变量
SERVER="root@8.215.32.251"
SERVER_PATH="/var/www/CargoTranslator"
SSH_KEY="~/.ssh/cargoppt/cargoppt_server.pem"

# 创建 rsync 排除文件
cat > rsync-exclude.txt << EOF
__pycache__/
*.pyc
.env
*.log
cache/
venv/
.git/
.gitignore
EOF

# 使用 rsync 同步代码
echo "同步代码到服务器..."
rsync -avz --exclude-from=rsync-exclude.txt \
    -e "ssh -i $SSH_KEY" \
    ./backend/ $SERVER:$SERVER_PATH/backend/

# 在服务器上执行部署命令
echo "在服务器上执行部署命令..."
ssh -i $SSH_KEY $SERVER << 'ENDSSH'
cd /var/www/CargoTranslator/backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart cargoppt
echo "检查服务状态..."
sudo systemctl status cargoppt
ENDSSH

# 清理本地文件
rm rsync-exclude.txt

echo "部署完成！"
```

使用这个脚本：
```bash
# 添加执行权限
chmod +x deploy-backend.sh

# 执行部署
./deploy-backend.sh
```




