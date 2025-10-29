// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  // ⬅️ ให้ ignore แบบ "global" ครอบทุกไฟล์/ทุก config
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },

  // ลินต์ JS ตามค่าแนะนำ (จะไม่โดน dist/** เพราะ ignore ไว้แล้ว)
  js.configs.recommended,

  // ลินต์ TS แบบเร็ว (ไม่ type-check)
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      // ให้รู้จักตัวแปรสภาพแวดล้อมของ Node เช่น console, process
      globals: {
        ...globals.node,
      },
    },
  },
];
