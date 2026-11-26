import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import roomsPlugin from "./rooms.mjs";
export default defineConfig({ plugins: [react(), roomsPlugin()] });
