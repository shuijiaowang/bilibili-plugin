import { defineWebExtConfig } from 'wxt';
import { resolve } from 'node:path';
export default defineWebExtConfig({
    startUrls: ["https://www.bilibili.com/","https://www.baidu.com/","https://www.example.com/"],
    // Windows需要使用绝对路径，resolve方法
    chromiumProfile: resolve('.wxt/chrome-data'), //.wxt/chrome-data 需要自己手动创建该文件夹
    keepProfileChanges: true,
    openConsole: true, //没测出区别，建议打开
    openDevtools: true, //没测出区别，建议打开
    chromiumArgs: [
        '--auto-open-devtools-for-tabs', // 每个标签页自动打开 DevTools控制台//好用
        // 自动打开后台页面（Service Worker）的 DevTools 弹窗
        '--auto-open-devtools-for-background-pages', //我用不了,可能旧版本支持
    ]
});
