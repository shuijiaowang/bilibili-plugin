// 导入md5依赖（如果使用npm/ESModule，确保已安装：npm install md5）
// 如果是浏览器原生环境，需先引入md5的CDN：<script src="https://cdn.bootcdn.net/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js"></script>
import md5 from 'md5';

/**
 * B站WBI签名工具类
 * 用于生成B站WBI接口所需的合法签名参数，解决403权限问题
 */
export const Bilibili_WbiSignUtil = {
    // WBI签名混淆密钥表（B站固定值）
    mixinKeyEncTab: [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ],

    /**
     * 对imgKey和subKey进行字符顺序打乱编码
     * @param {string} orig 原始密钥字符串
     * @returns {string} 混淆后的密钥
     */
    getMixinKey(orig) {
        if (!orig || typeof orig !== 'string') {
            throw new Error('原始密钥不能为空且必须为字符串');
        }
        return this.mixinKeyEncTab.map(n => orig[n] || '').join('').slice(0, 32);
    },

    /**
     * 获取B站最新的WBI签名密钥（img_key + sub_key）
     * @param {Object} [options] 请求配置项
     * @param {Object} [options.headers] 自定义请求头（Content Script环境可省略）
     * @returns {Promise<{img_key: string, sub_key: string}>} WBI密钥对
     */
    async getWbiKeys(options = {}) {
        try {
            const defaultHeaders = {
                'User-Agent': navigator?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.bilibili.com/',
                ...options.headers
            };

            // 发起请求（Content Script环境下自动携带Cookie，无需手动传SESSDATA）
            const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
                method: 'GET',
                credentials: 'include', // 关键：携带Cookie鉴权
                headers: defaultHeaders
            });

            if (!res.ok) {
                throw new Error(`获取WBI密钥失败，HTTP状态码：${res.status}`);
            }

            const data = await res.json();
            if (data.code !== 0 || !data.data?.wbi_img) {
                throw new Error(`WBI密钥接口返回异常：${data.message || '未知错误'}`);
            }

            const { img_url, sub_url } = data.data.wbi_img;
            // 提取密钥（从URL中截取文件名，去掉后缀）
            const extractKey = (url) => {
                if (!url) return '';
                const lastSlashIndex = url.lastIndexOf('/');
                const lastDotIndex = url.lastIndexOf('.');
                return url.slice(lastSlashIndex + 1, lastDotIndex);
            };

            return {
                img_key: extractKey(img_url),
                sub_key: extractKey(sub_url)
            };
        } catch (error) {
            console.error('[Bilibili_WbiSignUtil] 获取WBI密钥失败：', error);
            throw error; // 向上抛出，让调用方处理
        }
    },

    /**
     * 为请求参数生成WBI签名，返回拼接好的查询字符串（含wts和w_rid）
     * @param {Object} params 原始请求参数（不含wts/w_rid）
     * @param {string} img_key getWbiKeys返回的img_key
     * @param {string} sub_key getWbiKeys返回的sub_key
     * @returns {string} 带签名的查询字符串（如：foo=114&bar=514&wts=1769443117&w_rid=xxx）
     */
    encWbi(params, img_key, sub_key) {
        if (!params || typeof params !== 'object') {
            throw new Error('请求参数必须为非空对象');
        }
        if (!img_key || !sub_key) {
            throw new Error('img_key和sub_key不能为空');
        }

        // 1. 生成混淆密钥
        const mixin_key = this.getMixinKey(img_key + sub_key);
        // 2. 添加时间戳（wts）字段
        const curr_time = Math.round(Date.now() / 1000);
        const paramsWithWts = { ...params, wts: curr_time };

        // 3. 过滤特殊字符的工具函数
        const chr_filter = /[!'()*]/g;
        const filterValue = (value) => {
            return value.toString().replace(chr_filter, '');
        };

        // 4. 按key字典序排序，拼接参数
        const sortedKeys = Object.keys(paramsWithWts).sort();
        const queryParts = sortedKeys.map(key => {
            const keyEnc = encodeURIComponent(key);
            const valueEnc = encodeURIComponent(filterValue(paramsWithWts[key]));
            return `${keyEnc}=${valueEnc}`;
        });
        const query = queryParts.join('&');

        // 5. 计算w_rid签名
        const wbi_sign = md5(query + mixin_key);

        // 6. 返回最终的查询字符串
        return `${query}&w_rid=${wbi_sign}`;
    },

    /**
     * 快捷方法：直接生成带签名的完整URL
     * @param {string} baseUrl 接口基础URL（如：https://api.bilibili.com/x/space/wbi/arc/search）
     * @param {Object} params 原始请求参数
     * @returns {Promise<string>} 带签名的完整URL
     */
    async getSignedUrl(baseUrl, params) {
        try {
            const { img_key, sub_key } = await this.getWbiKeys();
            const signedQuery = this.encWbi(params, img_key, sub_key);
            return `${baseUrl}?${signedQuery}`;
        } catch (error) {
            console.error('[Bilibili_WbiSignUtil] 生成签名URL失败：', error);
            throw error;
        }
    }
};