import setupCsdnMessageListener from "../entrypoints/Baidu_search_better.content/background.js";

export async function AutoOpenBackgroundDevtools() {
    console.log("打开service work devtool");

    // 1. 获取所有可用的调试目标
    const targets = await new Promise((resolve) => {
        chrome.debugger.getTargets((result) => {
            resolve(result);
        });
    });

    console.log("所有调试目标：", targets[0]);
    const extensionId = chrome.runtime.id;
    console.log("extensionId:", extensionId);

    // 2. 正确筛选目标
    const serviceWorkerTarget = targets.find((target) => {
        return (
            target.url.includes(extensionId) &&
            ['worker', 'service_worker'].includes(target.type)
        );
    });

    if (!serviceWorkerTarget) {
        console.log("未找到可用的Service Worker调试目标（可能已附加或不存在）");
        return;
    }

    console.log("筛选到的合法Service Worker目标：", serviceWorkerTarget);

    // 3. 构造合法的 Debuggee 参数
    const validDebuggee = {
        targetId: serviceWorkerTarget.id
    };

    try {
        // 4. 附加调试器
        await new Promise((resolve, reject) => {
            chrome.debugger.attach(validDebuggee, "1.3", () => {
                if (chrome.runtime.lastError) {
                    if (chrome.runtime.lastError.message.includes("Already attached")) {
                        console.log("DevTools 已打开，无需重复附加调试器");
                        resolve(null);
                    } else {
                        reject(new Error(`附加调试器失败：${chrome.runtime.lastError.message}`));
                    }
                } else {
                    console.log("调试器已成功附加到 Service Worker");
                    resolve(null);
                }
            });
        });

        // 5. 启用 Runtime 功能
        await new Promise((resolve, reject) => {
            chrome.debugger.sendCommand(
                validDebuggee,
                "Runtime.enable",
                {},
                (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`启用 Runtime 失败：${chrome.runtime.lastError.message}`));
                    } else {
                        console.log("Runtime 功能已启用");
                        resolve(result);
                    }
                }
            );
        });

        // 6. 显式创建 DevTools 窗口（核心新增步骤） //这是弹出来了一个新的标签页，但是啥也没东西啊
        await new Promise((resolve, reject) => {
            chrome.debugger.sendCommand(
                validDebuggee,
                "Target.createTarget",
                {
                    url: serviceWorkerTarget.url
                },
                (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`创建 DevTools 窗口失败：${chrome.runtime.lastError.message}`));
                    } else {
                        console.log("DevTools 窗口已显式创建并弹出");
                        resolve(result);
                    }
                }
            );
        });

    } catch (error) {
        console.error("自动打开 DevTools 过程中出现异常：", error);
    }
}
export default AutoOpenBackgroundDevtools;