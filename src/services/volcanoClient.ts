import OpenAI from 'openai';
import dotenv from 'dotenv';

// 加载 .env 文件中的环境变量
dotenv.config();

const apiKey = process.env.ARK_API_KEY;
const modelId = process.env.ARK_MODEL_ID;

// 初始化OpenAI客户端，配置为指向火山引擎的方舟API
export const volcanoClient = apiKey ? new OpenAI({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: apiKey,
}) : null;

// 从环境变量获取推理接入点ID
export const VOLCANO_CHAT_MODEL_ID = modelId || 'your-model-id-here';