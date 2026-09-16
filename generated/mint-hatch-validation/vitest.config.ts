import {defineConfig} from 'vitest/config'
import vue from '@vitejs/plugin-vue'
export default defineConfig({plugins:[vue()],resolve:{alias:{'@':'/Users/mac/workspace/wristo/wristo-studio/src'}},test:{environment:'node',include:['generated/mint-hatch-validation/package.test.ts'],threads:false,server:{deps:{external:['opentype.js']}}}})
