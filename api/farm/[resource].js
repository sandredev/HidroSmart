import { createFarmHandler } from '../../server/supabase.js'

export default { fetch: createFarmHandler(process.env) }
