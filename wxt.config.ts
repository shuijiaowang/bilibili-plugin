import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        //https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=zh-cn //包括哪些权限
        permissions: ['storage','webRequest',"debugger","commands"],
        // web_accessible_resources: [
        //     {
        //         resources: ["main-world-doubao.js"],
        //         matches: ["*://*/*"],
        //     },
        // ],
        // 关键：声明允许访问CSDN域名的主机权限，解决跨域核心前提
        host_permissions: [
            "https://blog.csdn.net/*", // 匹配所有CSDN博客文章链接
            "https://www.baidu.com/*"  // 匹配百度搜索页（可选，确保脚本正常运行）
        ]
    },
});