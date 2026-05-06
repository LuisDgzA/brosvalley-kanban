import {
  dataProvider as refineSupabaseDataProvider,
  liveProvider as refineSupabaseLiveProvider,
} from "@refinedev/supabase";

import { supabaseClient } from "../supabase";

export const dataProvider = refineSupabaseDataProvider(supabaseClient);
export const liveProvider = refineSupabaseLiveProvider(supabaseClient);
