import { defineMiddleware } from 'astro:middleware';
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "astro:env/client";
import type { Database } from "../db/database.types.ts";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = createClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
  return next();
});
