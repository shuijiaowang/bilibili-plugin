import { defineContentScript } from "#imports";

// CSDN 接口固定配置（来自你的逆向资料）
const CSDN_CONFIG = {
    caKey: "203803574",
    appSecret: "9znpamsyl2c7cdrr9sas0le9vbc3r6ba",
    articleListUrl: "https://bizapi.csdn.net/blog/phoenix/console/v1/article/list",//获取
    setVisibleUrl: "https://bizapi.csdn.net/blog/phoenix/console/v2/article/set-visible-range",
    pageSize: 20
};


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

    // 2. 构建请求头（修正点5：请求头与签名原始字符串对应，无多余头）
    const headers = {
        "accept": "application/json, text/plain, */*",
        "x-ca-key": caKey,
        "x-ca-nonce": nonce,
        "x-ca-signature": signature,
        "x-ca-signature-headers": "x-ca-key,x-ca-nonce", // 与签名中的自定义头顺序一致
        "User-Agent": navigator.userAgent,
        "Referer": "https://mp.csdn.net/"
    };

    // 3. 构建请求 URL（使用排序后的参数，与签名保持一致）
    const searchParams = sortSearchParams(params);
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
    // 修正点6：POST 请求体强制格式化（无多余空格），保证签名一致性
    const postData = JSON.stringify({
        articleId,
        visible: "all"
    }, null, 0); // 第二个参数 null，第三个参数 0：去除所有多余空格

    // 1. 生成签名
    const signature = await generateCaSignature("POST", setVisibleUrl, nonce, {}, postData);

    // 2. 构建请求头（Content-Type 标准化，与签名一致）
    const headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json", // 去除多余分号，与签名原始字符串对应
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
    let totalArticleCount = 1;

    console.log("🚀 开始获取 CSDN 文章列表，筛选 VIP 文章...");

    // 第一步：分页获取所有文章，筛选 isNeedVip: "1" 的文章
    while (allVipArticles.length < totalArticleCount) {
        // 延时防止频率限制
        await sleep(1500);

        // 获取单页数据
        const pageData = await getSinglePageArticleList(currentPage);


        if (!pageData) {
            console.warn(`⚠️  第 ${currentPage} 页数据获取失败，跳过该页`);
            currentPage++;
            //如果请求失败的话，这里会一直循环请求，改用break？或是totalArticleCount--？
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
        console.log("✅ CSDN VIP 文章批量取消处理插件已激活");

        // 延迟 3 秒执行（确保页面 Cookie 已加载完成，避免鉴权失败）
        setTimeout(() => {
            processVipArticles();
        }, 5000);
    }
});

// 辅助函数：生成 x-ca-nonce 所需的 UUID（符合 CSDN 要求，标准 UUID v4，包含 0）//为了防止攻击，每次请求都要求唯一性。//但是uuid也可以随便生成啊怎么防止攻击？
// UUID v4 + 仅支持「小写 0-9、a-f」，无需引入常规 UUID 库
function createUuid() {

    // 辅助函数：从数组中随机选择一个元素
    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // 修正点1：包含 0-9 和 a-f，符合标准 UUID 字符集
    const charList = [
        ...Array.from({ length: 10 }, (_, i) => String.fromCharCode(48 + i)), // 0-9
        ...Array.from({ length: 6 }, (_, i) => String.fromCharCode(97 + i))  // a-f
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


// 辅助函数：GET 查询参数按 key 升序排序（修正点2：保证签名原始字符串一致）//签名原始字符是什么
function sortSearchParams(params) {
    const sortedKeys = Object.keys(params).sort();
    const sortedParams = {};
    sortedKeys.forEach(key => {
        sortedParams[key] = params[key];
    });
    return new URLSearchParams(sortedParams);
}

// 辅助函数：生成 x-ca-signature 签名（HMAC-SHA256 + Base64 编码） //这个啥用？密钥和请求混合编码，用于请求校验？
async function generateCaSignature(method, url, nonce, params = {}, postData = null) {
    const { caKey, appSecret } = CSDN_CONFIG;
    const urlObj = new URL(url);

    // 1. 拼接请求路径和查询参数（GET 需带排序后的参数，POST 路径不带参数）
    let pathAndQuery = urlObj.pathname;
    if (method === "GET" && Object.keys(params).length > 0) {
        const searchParams = sortSearchParams(params); // 显式排序
        pathAndQuery += `?${searchParams.toString()}`;
    }

    // 2. 构建签名原始字符串（严格遵循 CSDN 签名规则，修正点3：格式标准化）
    const accept = "application/json, text/plain, */*"; //accept
    // 修正点4：Content-Type 去除多余分号，GET 留空，POST 标准化
    const contentType = postData ? "application/json" : ""; //这样不行: application/json;charset=utf-8
    const signRaw = [
        method.toUpperCase(), // 请求方法（大写，无多余空格）
        accept, // Accept 头
        "", // content-md5（留空，无多余字符）
        contentType, // Content-Type 标准化
        "", // date（留空，无多余字符）
        `x-ca-key:${caKey}`, // 自定义头：x-ca-key
        `x-ca-nonce:${nonce}`, // 自定义头：x-ca-nonce
        pathAndQuery // 路径+排序后的查询参数
    ].join("\n"); // 严格使用 \n 分隔，无多余换行

    // 3. HMAC-SHA256 加密并 Base64 编码
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(appSecret);
    const dataBuffer = encoder.encode(signRaw); // 编码签名原始字符串（无编码丢失）

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    return arrayBufferToBase64(signatureBuffer); // 安全的 Base64 编码

    // 辅助函数：标准 Base64 编码（将二进制数据转换成可打印的 ASCII 字符）（明文转换、完全可逆），签名需要
    function arrayBufferToBase64(buffer) {
        const uint8Arr = new Uint8Array(buffer);
        let binaryStr = "";
        for (let i = 0; i < uint8Arr.length; i++) {
            binaryStr += String.fromCharCode(uint8Arr[i]);
        }
        return btoa(binaryStr);
    }
}

// 辅助函数：延时函数（防止接口频率限制）
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
