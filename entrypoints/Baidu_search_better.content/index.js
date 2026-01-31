// src/content-scripts/baidu-csdn-blocker.js
//现在发现一个问题就是，如果是先打开https://www.baidu.com，然后再搜索，此时脚本不注入好像，就必须得刷新一下。
export default defineContentScript({
    matches: ["https://www.baidu.com/s*","https://www.baidu.com/"],
    runAt: "document_end",//这里改为已加载就执行，然后内部进行延迟处理 //
    allFrames: false,

    async main() {

        //很奇怪，有时候触发，有时候不触发，
        console.log("百度搜索 CSDN VIP 屏蔽脚本已激活");
        // 新增：记录上一次的 URL，用于对比路由是否变化
        let lastPageUrl = window.location.href;
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

        // 辅助函数：带延迟执行核心逻辑（统一延迟配置，避免重复写setTimeout）
        const delayedHandleCSDN = async (delay = 2000) => {
            await new Promise(resolve => setTimeout(resolve, delay));
            await handleCSDNVIPArticles();
        };
        // 1. 初始加载执行（延迟优化：3000ms偏长，改为500ms足够，百度渲染速度很快）
        console.log("初始加载：开始执行CSDN VIP检查");
        await delayedHandleCSDN(2500);
        // 2. 监听路由变化
        const initNavigationListener = () => {
            console.log("监听路由")
            //每秒轮询，发生变化了则触发
            setInterval(async () => {
                const currentPageUrl = window.location.href;
                // 对比当前URL和上一次URL，若不同则说明路由变化
                if (currentPageUrl !== lastPageUrl) {
                    console.log("检测到路由变化，重新执行CSDN VIP检查");
                    // 更新上一次URL，避免重复触发
                    lastPageUrl = currentPageUrl;
                    // 延迟执行核心逻辑（等待百度动态加载完搜索结果）
                    await delayedHandleCSDN(500);
                }
            }, 1000); // 1秒轮询一次，兼顾性能和实时性
        };

        // 启动原生路由监听
        initNavigationListener();

    }
});

//下面这三个算是路由发送变化吗
//我需要监听这个发送变化然后触发事件
//https://www.baidu.com/s?wd=panic22&pn=10&oq=panic22&ie=utf-8&usm=1&fenlei=256&rsv_idx=1&rsv_pq=c13a3a35002e906a&rsv_t=49d4v3eUj%2BBUOllkozkAQm65jw6Amc%2F9vqTVsrkdEiuo9X%2F7bIxSqxpB094
//https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&rsv_idx=1&tn=baidu&wd=panic22&fenlei=256&oq=panic22&rsv_pq=c65cc02000182d54&rsv_t=32c9qjjCz3HcW9GCKbK7vaxmJxCfbAuhSlu0B7CQTcIkynzpxZV5ZuHuG0w&rqlang=cn&rsv_dl=tb&rsv_enter=1&rsv_sug3=1&rsv_btype=t&rsv_sug4=1241&rsv_sug=1
//https://www.baidu.com/s?wd=panic22&pn=20&oq=panic22&ie=utf-8&usm=1&fenlei=256&rsv_idx=1&rsv_pq=dc7b0e83002b9339&rsv_t=b5fafKqWZrsK6kFMaPGqJ5OyF0QiqQbg0pct6J51zCcpxNbT5cwMexZaeQk