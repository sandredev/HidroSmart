import { createChatHandler } from '../../server/hidroai.js'

export default {
  fetch: createChatHandler({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL }),
}
