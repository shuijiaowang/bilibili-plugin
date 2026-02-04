// src/content-scripts/baidu-csdn-blocker.js
const watchPattern = new MatchPattern('*://*.baidu.com/s*');
export default defineContentScript({
    matches: ["https://www.baidu.com/s*", "https://www.baidu.com/"],
    runAt: "document_end",//这里改为已加载就执行，然后内部进行延迟处理 //
    allFrames: false,


    async main(ctx) {
        // 辅助函数：带延迟执行核心逻辑（统一延迟配置，避免重复写setTimeout）
        const delayedHandleCSDN = async (delay = 2000) => {
            await new Promise(resolve => setTimeout(resolve, delay));
            await handleCSDNVIPArticles();
        };
        //很奇怪，有时候触发，有时候不触发，
        console.log("百度搜索 CSDN VIP 屏蔽脚本已激活");
        // 核心处理函数（提取CSDN链接 + 调用后台检查VIP + 隐藏元素）
        const handleCSDNVIPArticles = async () => {
            console.log("执行：handleCSDNVIPArticles")
            const searchResults = document.querySelectorAll(
                '.result.c-container.xpath-log.new-pmd'
            );

            for (const result of searchResults) {
                if (result.dataset.csdnChecked === "true") continue;

                const csdnUrl = result.getAttribute("mu");
                if (!csdnUrl || !csdnUrl.startsWith("https://blog.csdn.net/")) {
                    result.dataset.csdnChecked = "true";
                    continue;
                }

                try {
                    // 发送消息给后台
                    const response = await browser.runtime.sendMessage({
                        type: "CHECK_CSDN_VIP",
                        csdnUrl: csdnUrl
                    });
                    console.log("[Content] 收到后台响应：", response); // 此时应该能看到正常响应
                    // ######### 关键修改：先判空，再访问 response.error #########
                    if (!response) {
                        console.warn(`处理CSDN链接警告：${csdnUrl}，未获取到后台响应`);
                        result.dataset.csdnChecked = "true";
                        continue;
                    }

                    // 再处理后台返回的错误
                    if (response.error) {
                        console.warn(`处理CSDN链接警告：${csdnUrl}，${response.error}`);
                        result.dataset.csdnChecked = "true";
                        continue;
                    }

                    // 如果是VIP文章，删除元素
                    if (response.isVIP) {
                        result.remove();
                        console.log(`已隐藏CSDN VIP文章：${csdnUrl}`);
                    }

                    result.dataset.csdnChecked = "true";
                } catch (error) {
                    console.error(`处理CSDN链接出错：${csdnUrl}，错误信息：`, error);
                    result.dataset.csdnChecked = "true";
                }
            }
            console.log("执行结束")
        };

        // 3. 初始加载时，若已在 watch 页面，执行核心逻辑
        if (watchPattern.includes(window.location.href)) {
            await delayedHandleCSDN()
        }

        // 4. 监听 SPA 路由变化（wxt:locationchange 事件）
        ctx.addEventListener(window, 'wxt:locationchange', async ({newUrl}) => {
            console.log('SPA 路由变化，新 URL：', newUrl);
            // 5. 新 URL 匹配目标规则时，执行核心逻辑
            if (watchPattern.includes(newUrl)) {
                await delayedHandleCSDN()
            }
        });

    }
});