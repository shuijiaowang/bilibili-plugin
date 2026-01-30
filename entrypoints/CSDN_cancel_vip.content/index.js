import { defineContentScript } from "#imports";

// CSDN 接口固定配置（来自你的逆向资料）
const CSDN_CONFIG = {
    caKey: "203803574",
    appSecret: "9znpamsyl2c7cdrr9sas0le9vbc3r6ba",
    articleListUrl: "https://bizapi.csdn.net/blog/phoenix/console/v1/article/list",
    setVisibleUrl: "https://bizapi.csdn.net/blog/phoenix/console/v2/article/set-visible-range",
    pageSize: 20
};

// 辅助函数：生成 x-ca-nonce 所需的 UUID（符合 CSDN 要求）
function createUuid() {
    const charList = [
        ...Array.from({ length: 6 }, (_, i) => String.fromCharCode(97 + i)), // a-f
        ...Array.from({ length: 9 }, (_, i) => String.fromCharCode(49 + i))  // 1-9
    ];
    let uuid = "";
    const uuidTemplate = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

    for (const char of uuidTemplate) {
        if (char === "4") {
            uuid += "4";
        } else if (char === "-") {
            uuid += "-";
        } else if (char === "y") {
            // y 段固定为 8/9/a/b 中的一个（符合 UUID 规范）
            uuid += randomChoice(["8", "9", "a", "b"]);
        } else {
            uuid += randomChoice(charList);
        }
    }
    return uuid;
}

// 辅助函数：从数组中随机选择一个元素
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 辅助函数：生成 x-ca-signature 签名（HMAC-SHA256 + Base64 编码）
async function generateCaSignature(method, url, nonce, params = {}, postData = null) {
    const { caKey, appSecret } = CSDN_CONFIG;
    const urlObj = new URL(url);

    // 1. 拼接请求路径和查询参数（GET 需带参数，POST 路径不带参数）
    let pathAndQuery = urlObj.pathname;
    if (method === "GET" && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        pathAndQuery += `?${searchParams.toString()}`;
    }

    // 2. 构建签名原始字符串（严格遵循 CSDN 签名规则）
    const accept = "application/json, text/plain, */*";
    const contentType = postData ? "application/json;" : "";
    const signRaw = [
        method.toUpperCase(),
        accept,
        "", // content-md5（留空）
        contentType,
        "", // date（留空）
        `x-ca-key:${caKey}`,
        `x-ca-nonce:${nonce}`,
        pathAndQuery
    ].join("\n");

    // 3. HMAC-SHA256 加密并 Base64 编码
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(appSecret);
    const dataBuffer = encoder.encode(signRaw);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

// 辅助函数：延时函数（防止接口频率限制）
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 封装函数：获取单页文章列表
async function getSinglePageArticleList(page) {
    const { articleListUrl, pageSize, caKey } = CSDN_CONFIG;
    const nonce = createUuid();
    const params = {
        page,
        status: "all_v3",
        pageSize
    };

    // 1. 生成签名
    const signature = await generateCaSignature("GET", articleListUrl, nonce, params);

    // 2. 构建请求头
    const headers = {
        "accept": "application/json, text/plain, */*",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "x-ca-key": caKey,
        "x-ca-nonce": nonce,
        "x-ca-signature": signature,
        "x-ca-signature-headers": "x-ca-key,x-ca-nonce",
        "User-Agent": navigator.userAgent,
        "Referer": "https://mp.csdn.net/"
    };

    // 3. 构建请求 URL
    const searchParams = new URLSearchParams(params);
    const requestUrl = `${articleListUrl}?${searchParams.toString()}`;

    // 4. 发送请求
    try {
        const response = await fetch(requestUrl, {
            method: "GET",
            credentials: "include", // 携带 Cookie 完成鉴权
            headers
        });

        if (!response.ok) {
            throw new Error(`文章列表请求失败：${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        if (result.code !== 200) {
            throw new Error(`CSDN 接口返回错误：${result.message}`);
        }

        return result.data;
    } catch (error) {
        console.error(`❌ 获取第 ${page} 页文章列表失败：`, error);
        return null;
    }
}

// 封装函数：设置文章可见范围为全部可见
async function setArticleVisible(articleId) {
    const { setVisibleUrl, caKey } = CSDN_CONFIG;
    const nonce = createUuid();
    const postData = JSON.stringify({
        articleId,
        visible: "all"
    });

    // 1. 生成签名
    const signature = await generateCaSignature("POST", setVisibleUrl, nonce, {}, postData);

    // 2. 构建请求头
    const headers = {
        "accept": "application/json, text/plain, */*",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "content-type": "application/json;",
        "x-ca-key": caKey,
        "x-ca-nonce": nonce,
        "x-ca-signature": signature,
        "x-ca-signature-headers": "x-ca-key,x-ca-nonce",
        "User-Agent": navigator.userAgent,
        "Referer": "https://mp.csdn.net/"
    };

    // 3. 发送请求
    try {
        const response = await fetch(setVisibleUrl, {
            method: "POST",
            credentials: "include", // 携带 Cookie 完成鉴权
            headers,
            body: postData
        });

        if (!response.ok) {
            throw new Error(`修改文章可见范围失败：${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        if (result.code !== 200) {
            throw new Error(`CSDN 接口返回错误：${result.message}`);
        }

        console.log(`✅ 文章 ${articleId} 已成功设置为全部可见`);
        return true;
    } catch (error) {
        console.error(`❌ 处理文章 ${articleId} 失败：`, error);
        return false;
    }
}

// 核心函数：获取所有 VIP 文章并批量修改可见范围
async function processVipArticles() {
    let currentPage = 1;
    let allVipArticles = []; // 存储所有 VIP 文章的 articleId
    let totalArticleCount = Infinity;

    console.log("🚀 开始获取 CSDN 文章列表，筛选 VIP 文章...");

    // 第一步：分页获取所有文章，筛选 isNeedVip: "1" 的文章
    while (allVipArticles.length < totalArticleCount) {
        // 延时防止频率限制
        await sleep(500);

        // 获取单页数据
        const pageData = await getSinglePageArticleList(currentPage);
        if (!pageData) {
            console.warn(`⚠️  第 ${currentPage} 页数据获取失败，跳过该页`);
            currentPage++;
            continue;
        }

        // 更新总文章数（仅第一次获取）
        if (currentPage === 1) {
            totalArticleCount = pageData.count.all || 0;
            console.log(`📊 检测到账号总文章数：${totalArticleCount}`);
        }

        // 筛选 VIP 文章（isNeedVip: "1"）
        const pageVipArticles = pageData.list
            .filter(article => article.isNeedVip === "1")
            .map(article => ({
                articleId: article.articleId,
                title: article.title
            }));

        // 合并到总 VIP 文章列表
        if (pageVipArticles.length > 0) {
            allVipArticles = [...allVipArticles, ...pageVipArticles];
            console.log(`📄 第 ${currentPage} 页筛选出 ${pageVipArticles.length} 篇 VIP 文章，累计 ${allVipArticles.length} 篇`);
        }

        // 终止条件：当前页无数据，或已获取所有分页
        if (pageData.list.length < CSDN_CONFIG.pageSize) {
            break;
        }

        currentPage++;
    }

    // 边界处理：无 VIP 文章直接终止
    if (allVipArticles.length === 0) {
        console.log("✅ 账号下无 VIP 文章，无需处理");
        return;
    }

    console.log(`\n🚀 开始批量修改 ${allVipArticles.length} 篇 VIP 文章为全部可见...`);

    // 第二步：批量修改 VIP 文章可见范围
    let successCount = 0;
    for (const article of allVipArticles) {
        // 延时防止频率限制（每篇间隔 1 秒，避免被封禁）
        await sleep(1000);

        const result = await setArticleVisible(article.articleId);
        if (result) {
            successCount++;
        }
    }

    // 输出最终结果
    console.log(`\n🎉 批量处理完成：成功 ${successCount} 篇，失败 ${allVipArticles.length - successCount} 篇`);
    alert(`批量处理完成：\n成功 ${successCount} 篇，失败 ${allVipArticles.length - successCount} 篇\n详情请查看浏览器控制台`);
}

// 定义 CSDN 创作中心内容脚本
export default defineContentScript({
    // 匹配 CSDN 创作中心地址（仅在该页面执行）
    matches: ["https://mp.csdn.net/*"],
    persistAcrossSessions: true, // SPA 路由跳转后保持激活
    runAt: "document_idle", // 文档加载完成后执行
    allFrames: false,

    // 脚本注入后执行的核心逻辑
    async main() {
        console.log("✅ CSDN VIP 文章批量处理插件已激活" );

        // 延迟 3 秒执行（确保页面 Cookie 已加载完成，避免鉴权失败）
        setTimeout(() => {
            processVipArticles();
        }, 3000);
    }
});