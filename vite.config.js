import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/engine/**/*.test.js', 'src/three/**/*.test.js'],
  },
});
