import os
from dotenv import load_dotenv

load_dotenv()

# SiliconFlow API
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY", "")
SILICONFLOW_BASE_URL = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "Qwen/Qwen3-VL-235B-A22B-Thinking")
