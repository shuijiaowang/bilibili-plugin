

export function setupCsdnMessageListener() {
    console.log("CSDN请求中转后台脚本已激活");


// 监听来自Content Script的消息（改为同步监听器，内部处理异步逻辑）
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // 只处理CSDN链接检查的消息
        if (message.type !== "CHECK_CSDN_VIP") {
            sendResponse({isVIP: false, error: "非目标消息类型"});
            return true; // 保留通道（虽然这里是同步返回，习惯上也返回true）
        }

        const {csdnUrl} = message;
        if (!csdnUrl) {
            sendResponse({isVIP: false, error: "缺少CSDN文章链接"});
            return true;
        }

        // 内部异步处理（fetch），避免阻塞监听器
        const handleCSDNCheck = async () => {
            try {
                const response = await fetch(csdnUrl, {
                    cache: "no-cache",
                    signal: AbortSignal.timeout(5000),
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                });

                if (!response.ok) {
                    sendResponse({isVIP: false, error: `请求失败，状态码：${response.status}`});
                    return;
                }

                const htmlContent = await response.text();
                const isVIP = htmlContent.includes("解锁文章");

                sendResponse({isVIP, error: null});
            } catch (error) {
                console.error("后台请求CSDN失败：", error);
                sendResponse({isVIP: false, error: "请求超时或网络异常"});
            }
        };

        // 执行异步处理函数
        handleCSDNCheck();

        // 核心：同步返回 true，告知浏览器保留消息通道，等待异步 sendResponse
        return true;
    });
}
// 可选：如果需要默认导出，也可以添加（方便导入时灵活选择）
export default setupCsdnMessageListener;