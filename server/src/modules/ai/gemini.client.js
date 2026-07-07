import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

const GENERATION_TIMEOUT_MS = 15000;

let client = null;

const getModel = () => {
  if (!env.geminiApiKey) {
    throw new ApiError(503, 'AI features are not configured on this server');
  }
  if (!client) client = new GoogleGenerativeAI(env.geminiApiKey);
  return client.getGenerativeModel({ model: 'gemini-3-flash-preview' });
};

export const generateText = async (prompt) => {
  const model = getModel();
  let timeoutHandle;
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new ApiError(504, 'AI feedback generation timed out — please try again')),
      GENERATION_TIMEOUT_MS
    );
  });

  try {
    const result = await Promise.race([model.generateContent(prompt), timeout]);
    return result.response.text().trim();
  } finally {
    clearTimeout(timeoutHandle);
  }
};
