import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// process.env est fourni par Node au moment de la compilation ; on le déclare pour TypeScript.
declare const process: { env: Record<string, string | undefined> }

// Sur GitHub Pages, l'app vit dans un sous-dossier (…github.io/NOM-DU-REPO/). Le workflow fournit ce nom via BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
