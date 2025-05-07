import PyPDF2
from io import BytesIO

class PaperProcessor:
    async def process(self, file_content: bytes) -> str:
        try:
            # 使用 PyPDF2 读取 PDF 内容
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # 提取文本
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text
        except Exception as e:
            raise Exception(f"Paper processing error: {str(e)}")
