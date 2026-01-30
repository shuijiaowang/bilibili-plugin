import { defineBackground, storage } from "#imports";
import setupCsdnMessageListener from "./Baidu_search_better.content/background.js";

const counter = storage.defineItem('local:counter', {
    fallback: 0,
});

export default defineBackground(async () => {
    const currentValue = await counter.getValue();
    // 修复：使用 counter 自带的 setValue 方法，避免手动操作 storage 产生冲突
    await counter.setValue(currentValue + 1);
    console.log('Background script started, counter incremented.');

// 调用导入的函数，注册 CSDN 消息监听器（核心：执行函数完成初始化）
    setupCsdnMessageListener();
});