import { createChatHandler } from '../../server/hidroai.js'
import { createSupabaseClient } from '../../server/supabase.js'

const call = createSupabaseClient(process.env)

export default {
  fetch: createChatHandler({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL, getContext: signal => call('obtener-contexto-hidroai', { signal }) }),
}
