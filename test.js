import { supabase } from "./supabase.js";

const { data, error } =
await supabase
.from("projects")
.select("*");

console.log(data);
console.log(error);