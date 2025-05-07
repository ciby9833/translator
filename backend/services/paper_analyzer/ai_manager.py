import os
import google.generativeai as genai
from dotenv import load_dotenv

class AIManager:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
            
        # 配置 Gemini API
        genai.configure(api_key=self.api_key)
        
        # 使用正确的模型名称
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    async def get_response(self, question: str, context: str) -> str:
        try:
            if not context:
                return "抱歉，我无法找到相关的上下文信息来回答这个问题。"

            # 构建更专业的提示词
            prompt = f"""你是一个专业的论文分析助手。请基于以下上下文回答问题。

上下文：
{context}

问题：
{question}

要求：
1. 回答要准确、专业，直接基于上下文中的信息
2. 如果上下文中的信息不足以回答问题，请明确说明
3. 如果问题与上下文无关，请说明并建议用户提供更多相关信息
4. 回答要简洁明了，避免冗长的解释
5. 如果上下文中包含多个相关段落，请综合这些信息给出完整回答
6. 如果发现上下文中的信息有矛盾，请指出并说明

请提供你的回答："""
            
            # 使用新的 API 调用方式
            response = self.model.generate_content(prompt)
            
            # 检查响应
            if not response or not response.text:
                return "抱歉，我无法生成有效的回答。请尝试重新提问或检查文档内容。"
                
            return response.text
            
        except Exception as e:
            print(f"AI response error details: {str(e)}")  # 添加详细日志
            return f"抱歉，生成回答时出现错误：{str(e)}"
