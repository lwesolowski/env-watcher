import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "astro:env/client";

import type { Database } from "../db/database.types.ts";

export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
