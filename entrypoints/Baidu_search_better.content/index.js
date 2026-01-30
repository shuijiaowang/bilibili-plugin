// src/content-scripts/baidu-csdn-blocker.js
export default defineContentScript({
    matches: ["https://www.baidu.com/s*"],
    runAt: "document_idle",
    allFrames: false,

    async main() {
        console.log("百度搜索 CSDN VIP 屏蔽脚本已激活");
        // 核心处理函数（提取CSDN链接 + 调用后台检查VIP + 隐藏元素）
        const handleCSDNVIPArticles = async () => {
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
        };

        // 初始加载执行
        setTimeout(async () => {
            console.log("啥也玩")
            await handleCSDNVIPArticles();
        }, 2000);

        // // 监听路由变化
        // window.addEventListener("popstate", async () => {
        //     setTimeout(async () => {
        //         await handleCSDNVIPArticles();
        //     }, 500);
        // });
        //
        // // 监听DOM变化
        // const observer = new MutationObserver(async (mutations) => {
        //     const hasNewResults = mutations.some((mutation) => {
        //         return Array.from(mutation.addedNodes).some((node) => {
        //             if (node instanceof HTMLElement) {
        //                 return node.classList.contains("c-container") || node.querySelector(".c-container");
        //             }
        //             return false;
        //         });
        //     });
        //
        //     if (hasNewResults) {
        //         await handleCSDNVIPArticles();
        //     }
        // });
        //
        // observer.observe(document.body, {
        //     childList: true,
        //     subtree: true,
        //     attributes: false
        // });

    }
});