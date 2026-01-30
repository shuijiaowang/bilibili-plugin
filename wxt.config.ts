import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        //https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=zh-cn //包括哪些权限
        permissions: ['storage'],
        // web_accessible_resources: [
        //     {
        //         resources: ["main-world-doubao.js"],
        //         matches: ["*://*/*"],
        //     },
        // ],
    },
});