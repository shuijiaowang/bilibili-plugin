import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        //https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=zh-cn //包括哪些权限
        permissions: ['storage','webRequest',"debugger","commands"],
        web_accessible_resources: [
            {
                // 允许访问该 HTML 的目标网页（与内容脚本 matches 一致）
                matches: ['https://www.example.com/*'],
                // 声明 IFrame HTML 页面（根路径访问）
                // resources: ['/example_ui_IFrame.content/iframe.html'],entrypoints/example_ui_IFrame.content/iframe.html //这个就不行
                resources: ['/example-iframe.html'],//为什么这个可以，entrypoints/index.html，必须放在根目录吗
            },
        ],
        // 关键：声明允许访问CSDN域名的主机权限，解决跨域核心前提
        host_permissions: [
            "https://blog.csdn.net/*", // 匹配所有CSDN博客文章链接
            "https://www.baidu.com/*"  // 匹配百度搜索页（可选，确保脚本正常运行）
        ]
    },
});