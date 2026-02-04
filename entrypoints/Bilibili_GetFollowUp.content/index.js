
import {defineContentScript,storage} from "#imports";
// 定义内容脚本：仅注入到B站个人关注列表
export default defineContentScript({
    //只有进入个人主页才会触发请求//请求完之后把数据存到store中即可。
    matches: ['https://space.bilibili.com/*/relation/follow*'],
    // 关键配置1：允许脚本在 SPA 路由跳转后仍保持激活
    persistAcrossSessions: true,
    // 关键配置2：监听路由变化（WXT 封装的 SPA 路由监听）
    runAt: 'document_idle',
    allFrames: false,

    // 脚本注入后执行的核心逻辑
    async main() {
        console.log("开始获取关注的up主信息")
        try {
            // 🔹 从 Cookie 动态获取当前登录用户的 ID（替代硬编码的 456524807）
            const getCurrentUserId = () => {
                const match = document.cookie.match(/DedeUserID=(\d+)/);
                return match ? match[1] : null;
            };
            const vmid = getCurrentUserId();
            if (!vmid) {
                console.error('未获取到当前用户ID，请确保已登录B站');
                return;
            }

            // "data": [
            //     {
            //         "tagid": -10,
            //         "name": "特别关注",
            //         "count": 2,
            //         "tip": "第一时间收到该分组下用户更新稿件的通知"
            //     },
            //     {
            //         "tagid": 357832912,
            //         "name": "首页推荐",
            //         "count": 1,
            //         "tip": ""
            //     }
            // ]
            //获取所有关注分组，获取首页推荐的tagid
            const tagUrl="https://api.bilibili.com/x/relation/tags?only_master=false&web_location=333.1387"

            const tagResponse = await fetch(tagUrl, {
                method: 'GET',
                credentials: 'include', // 确保携带 Cookie（Content Script 中默认已包含，显式声明更保险）
                headers: {
                    'Referer': `https://space.bilibili.com/${vmid}/relation/follow?tagid=-1`, // 模拟原请求的 Referer，避免被 B站 拦截
                    'User-Agent': navigator.userAgent // 复用当前页面的 UA
                }
            });

            if (!tagResponse.ok) throw new Error(`请求失败：${tagResponse.status}`);
            // 🔹 解析响应数据
            const tagData = await tagResponse.json();
            // 初始化首页推荐的tagid（默认值可根据需要调整）
            let homeRecommendTagId = null;
            if (tagData.code === 0) {
                // 核心修正：接口返回的data本身就是分组数组，不是 data.list
                const tagList = tagData.data;
                console.log('✅ 所有关注分组列表：', tagList);



                // 遍历分组列表，找到“首页推荐”并提取tagid
                tagList.forEach(tag => {
                    console.log(`分组名称：${tag.name} | tagid：${tag.tagid} | 分组内UP主数量：${tag.count}`);

                    // 精准匹配“首页推荐”分组
                    if (tag.name === '首页推荐') {
                        homeRecommendTagId = tag.tagid;
                        console.log(`✅ 找到「首页推荐」分组，tagid：${homeRecommendTagId}`);
                    }
                });

                // 处理未找到的情况
                if (homeRecommendTagId === null) {
                    console.warn('⚠️ 未找到「首页推荐」分组，请检查分组名称是否正确');
                    return
                }
            } else {
                console.error('❌ 接口返回错误：', data.message);
                return
            }


            //根据tagid获取分组中的ups
            const upsUrl=`https://api.bilibili.com/x/relation/tag?tagid=${homeRecommendTagId}&pn=1&ps=24&mid=${vmid}&web_location=333.1387`


            // 🔹 发起 GET 请求（自动携带 Cookie）
            const upResponse = await fetch(upsUrl, {
                method: 'GET',
                credentials: 'include', // 确保携带 Cookie（Content Script 中默认已包含，显式声明更保险）
                headers: {
                    'Referer': `https://space.bilibili.com/${vmid}/relation/follow?tagid=-1`, // 模拟原请求的 Referer，避免被 B站 拦截
                    'User-Agent': navigator.userAgent // 复用当前页面的 UA
                }
            });

            if (!upResponse.ok) throw new Error(`请求失败：${upResponse.status}`);

            // 🔹 解析响应数据
            const data = await upResponse.json();
            if (data.code === 0) {
                const followings = data.data;
                console.log('✅ 关注的UP主列表：', followings);

                const followUpList=[]
                // 🔹 （可选）打印每个UP主的关键信息
                followings.forEach(up => {
                    const item={
                        uname:up.uname,
                        mid:up.mid,
                        face:up.face,
                        sign:up.sign
                    }
                    followUpList.push(item)
                    console.log(`UP主：${up.uname} | mid：${up.mid} | 签名：${up.sign}`);
                });

                //现在需要把followUpList存起来，持久化
                // ========== 新增：使用 WXT useStorage 持久化存储 ==========
                const storageKey = `local:bilibili_follow_up_list`;
                // 存储数据（异步操作，需 await）
                await storage.setItem(storageKey, {
                    list: followUpList,
                    updateTime: new Date().getTime(), // 记录更新时间，方便后续判断是否过期
                    tagid: homeRecommendTagId
                });
                console.log(`✅ 已将 ${followUpList.length} 个UP主数据持久化存储，key：${storageKey}`);

                // ========== 可选：读取存储的数据（示例） ==========
                const savedData = await storage.getItem(storageKey);
                console.log('✅ 读取存储的UP主数据：', savedData);
            } else {
                console.error('❌ 接口返回错误：', data.message);
            }
        } catch (error) {
            console.error('❌ 请求出错：', error);
        }

    },
});
