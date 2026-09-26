import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
const root = process.cwd();
export default defineConfig({ root: path.join(root, 'e2e/home-preview'), plugins:[react()],
  resolve:{ alias:[
    { find: /.*contexts\/DataContext$/, replacement: path.join(root,'e2e/home-preview/data.jsx') },
    { find: /.*contexts\/AuthContext$/, replacement: path.join(root,'e2e/home-preview/auth.js') },
    { find: /.*services\/firebase$/, replacement: path.join(root,'e2e/home-preview/firebase.js') },
  ]},
  css:{ postcss:{plugins:[tailwind({config:path.join(root,'tailwind.config.js')}),autoprefixer()]} },
  server:{host:'0.0.0.0',port:4173,fs:{allow:[root]}}
});
