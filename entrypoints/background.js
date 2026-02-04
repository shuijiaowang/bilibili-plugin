import { defineBackground, storage } from "#imports";
import setupCsdnMessageListener from "./Baidu_search_better.content/background.js";
import AutoOpenBackgroundDevtools from "../utils/Chrome_AutoOpenBackgroundDevtools.js";

const counter = storage.defineItem('local:counter', {
    fallback: 0,
});

export default defineBackground(async() => {
    // 立即执行异步函数，包裹所有需要await的逻辑
        const currentValue = await counter.getValue();
        await counter.setValue(currentValue + 1);
        console.log('Background script started, counter incremented.');
        console.log('🔴 扩展开始初始化111222...');
        await setBackgroundJS();
});


//统一注册
async function setBackgroundJS() {
    // 调用导入的函数，注册 CSDN 消息监听器（核心：执行函数完成初始化）
    setupCsdnMessageListener();
    // 扩展启动后，只执行一次：自动打开 Service Worker 控制台
    await AutoOpenBackgroundDevtools();
}

