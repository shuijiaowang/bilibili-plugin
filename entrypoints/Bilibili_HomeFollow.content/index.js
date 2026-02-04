import { defineContentScript, storage } from "#imports";
import {Bilibili_WbiSignUtil} from "../../utils/Bilibili_WbiSignUtil.js";

// 定义内容脚本：修改主页推荐为订阅模式
export default defineContentScript({
    matches: ['https://www.bilibili.com/*'],
    persistAcrossSessions: true, // SPA 路由跳转后保持激活
    runAt: 'document_idle',      // 文档加载完成后执行
    allFrames: false,

    // 脚本注入后执行的核心逻辑
    async main() {
        // 1. 定义存储未点赞视频的数组（核心：收集目标视频）
        const unlikedVideos= [];
        // 目标视频数量：收集3个后停止循环
        const targetVideoCount = 3;
        const apiParams = {
            order: 'pubdate', // 按发布时间排序
            ps: 25, // 每页25条（最大页数限制）
            pn: 1, // 第一页
            index: 1,
            order_avoided: true,
            platform: 'web',
            web_location: '333.1387',
            dm_img_list: '[]', // 简化无用参数
            dm_img_str: 'V2ViR0wgMS4wIChPcGVuR0wgRVMgMi4wIENocm9taXVtKQ',
            dm_cover_img_str: 'QU5HTEUgKEdvb2dsZSwgVnVsa2FuIDEuMy4wIChTd2lmdFNoYWRlciBEZXZpY2UgKFN1Ynplcm8pICgweDAwMDBDMERFKSksIFN3aWZ0U2hhZGVyIGRyaXZlcilHb29nbGUgSW5jLiAoR29vZ2xlKQ',
            dm_img_inter: '{"ds":[],"wh":[3639,3278,81],"of":[481,962,481]}'
        };

        try {
            // 2. 读取存储的UP主列表，增加空值判断
            const storageKey = `local:bilibili_follow_up_list`;
            const ups = await storage.getItem(storageKey);

            // 边界处理：如果无存储数据，直接终止
            if (!ups || !ups.list || ups.list.length === 0) {
                console.log('⚠️ 未读取到存储的UP主列表');
                return;
            }
            console.log('✅ 读取存储的UP主数据：', ups);

            // 3. 遍历UP主列表，收集未点赞视频（达到3个则停止）
            for (const item of ups.list) {
                // 终止条件：已收集够3个视频，停止循环
                if (unlikedVideos.length >= targetVideoCount) break;

                try {
                    apiParams.mid=item.mid
                    //这里请求错误，不是获取该up的点赞列表，而是获取该up的视频列表
                    //https://api.bilibili.com/x/space/wbi/arc/search?mid=3461571588131521&order=pubdate&ps=25&pn=1&index=1&order_avoided=true&platform=web&web_location=333.1387&dm_img_list=[]&dm_img_str=V2ViR0wgMS4wIChPcGVuR0wgRVMgMi4wIENocm9taXVtKQ&dm_cover_img_str=QU5HTEUgKEdvb2dsZSwgVnVsa2FuIDEuMy4wIChTd2lmdFNoYWRlciBEZXZpY2UgKFN1Ynplcm8pICgweDAwMDBDMERFKSksIFN3aWZ0U2hhZGVyIGRyaXZlcilHb29nbGUgSW5jLiAoR29vZ2xlKQ&dm_img_inter=%7B%22ds%22:[],%22wh%22:[3639,3278,81],%22of%22:[481,962,481]%7D&w_rid=b54009aa5efe25b554bcb8ce96041aac&wts=1769441601
                    // 3.1 请求该UP主点赞的第一个视频信息
                    //https://api.bilibili.com/x/space/wbi/acc/relation?mid=3461571588131521&web_location=333.1387&w_rid=ab7ec3086fe8e2ea959670b5cf0726a3&wts=1769443782
                    // 2. 生成带签名的URL
                    const signedUrl = await Bilibili_WbiSignUtil.getSignedUrl(
                        'https://api.bilibili.com/x/space/wbi/arc/search',
                        apiParams
                    );
                    // const params={
                    //     mid:3461571588131521,
                    //     web_location:333.1387
                    // }
                    // const signedUrl = await Bilibili_WbiSignUtil.getSignedUrl(
                    //     'https://api.bilibili.com/x/space/wbi/acc/relation',params
                    // );
                    console.log('生成的带签名URL：', signedUrl);
                    // 2. 请求UP主视频列表
                    const videoListResponse = await fetch(signedUrl, {
                        method: 'GET',
                        credentials: 'include', // 携带Cookie鉴权
                        headers: {
                            'Referer': `https://space.bilibili.com/${item.mid}?`,
                            'User-Agent': navigator.userAgent
                        }
                    });

                    if (!videoListResponse.ok) throw new Error(`视频列表请求失败：${videoListResponse.status}`);
                    const videoListData = await videoListResponse.json();

                    console.log("打印结果",videoListData)


                    // 3.2 解析视频信息（API返回正常才处理）
                    if (videoListData.code === 0 && videoListData.data?.list?.vlist?.length > 0) {
                        const firstVideo = videoListData.data.list.vlist[0];
                        console.log(`✅ 获取UP主【${item.name || item.mid}】点赞的首个视频：`, firstVideo);

                        // 3.3 请求视频点赞状态（核心：判断是否未点赞）
                        const relationUrl = `https://api.bilibili.com/x/web-interface/archive/relation?aid=${firstVideo.aid}&bvid=${firstVideo.bvid}`;
                        const relationResponse = await fetch(relationUrl, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Referer': `https://www.bilibili.com/video/${firstVideo.bvid}/?`,
                                'User-Agent': navigator.userAgent
                            }
                        });

                        if (!relationResponse.ok) throw new Error(`请求视频点赞状态失败：${relationResponse.status}`);
                        const relationData = await relationResponse.json();

                        // 3.4 判断是否未点赞，未点赞则存入数组
                        if (relationData.code === 0 && !relationData.data.like) {
                            // 整理需要的视频信息（简化存储）
                            const videoInfo = {
                                bvid: firstVideo.bvid,
                                aid: firstVideo.aid,
                                pic: firstVideo.pic,
                                title: firstVideo.title,
                                play: formatViewCount(firstVideo.play), // 格式化播放量（如23.3万）
                                video_review: firstVideo.video_review, // 修正：弹幕
                                created: firstVideo.created, // 创建时间//格式化日期
                                length: firstVideo.length, // 时长（如10:10）,无需格式化
                                author:firstVideo.author,
                                mid:firstVideo.mid,
                            };
                            unlikedVideos.push(videoInfo);
                            console.log(`✅ 新增未点赞视频：`, videoInfo.title);
                        } else {
                            console.log(`ℹ️ 视频【${firstVideo.title}】已点赞，跳过`);
                        }
                    } else {
                        console.log(`ℹ️ UP主【${item.name || item.mid}】暂无点赞视频`);
                    }
                } catch (error) {
                    console.error(`❌ 处理UP主【${item.mid}】时出错：`, error);
                    // 单个UP主处理失败，继续遍历下一个
                    continue;
                }
            }

            // 4. 遍历完成后，输出最终收集的未点赞视频（后续可用于替换主页推荐）
            console.log('✅ 最终收集的未点赞视频列表：', unlikedVideos);
            // 此处可添加「替换主页推荐内容」的逻辑
            // 4. 核心：替换首页的feed-card内容
            // console.log('✅ 最终收集的未点赞视频列表：', unlikedVideos);
            replaceFeedCards(unlikedVideos);

        } catch (globalError) {
            console.error('❌ 脚本核心逻辑执行失败：', globalError);
        }
    }
});

// 核心函数：替换首页的feed-card内容（修复图片替换逻辑）
function replaceFeedCards(videoList) {
    // 获取页面上所有的feed-card元素
    const feedCards = document.querySelectorAll('.feed-card');
    if (feedCards.length === 0) {
        console.log('⚠️ 未找到可替换的视频卡片');
        return;
    }

    // 遍历视频列表，替换对应的卡片（只替换前N个，N=videoList.length）
    videoList.forEach((video, index) => {
        // 如果卡片数量不足，停止替换
        if (index >= feedCards.length) return;

        const card = feedCards[index];
        try {
            // 1. 替换视频链接（封面链接 + 标题链接）
            const coverLink = card.querySelector('.bili-video-card__image--link');
            const titleLink = card.querySelector('.bili-video-card__info--tit a');
            const videoUrl = `https://www.bilibili.com/video/${video.bvid}`;
            if (coverLink) coverLink.href = videoUrl;
            if (titleLink) {
                titleLink.href = videoUrl;
                titleLink.textContent = video.title; // 替换标题
                titleLink.title = video.title; // 替换title属性（hover提示）
            }

            // 2. 修复图片替换逻辑（核心）
            const coverPicture = card.querySelector('.bili-video-card__cover');
            if (coverPicture) {
                // 2.1 替换所有source标签的srcset（avif/webp）
                const sourceElements = coverPicture.querySelectorAll('source');
                sourceElements.forEach(source => {
                    if (source.srcset) {
                        // 保留B站的裁剪参数，只替换图片主地址
                        const cropParams = source.srcset.split('@')[1] || '';
                        // 对source标签也做HTTP转HTTPS处理
                        const securePicUrl = video.pic.replace('http://', 'https://');
                        source.srcset = cropParams ? `${securePicUrl}@${cropParams}` : securePicUrl;
                    }
                });

                // 2.2 替换img标签的src（兜底）
                const coverImg = coverPicture.querySelector('img');
                if (coverImg) {
                    // 保留裁剪参数，保证图片尺寸和原卡片一致
                    const cropParams = coverImg.src.split('@')[1] || '';
                    // 关键修改：先将video.pic的HTTP转为HTTPS，再拼接裁剪参数
                    const securePicUrl = video.pic.replace('http://', 'https://');
                    coverImg.src = cropParams ? `${securePicUrl}@${cropParams}` : securePicUrl;
                    coverImg.alt = video.title; // 替换alt属性
                    // 强制重新加载图片（避免缓存）
                    coverImg.loading = 'eager';
                    coverImg.src = coverImg.src;
                }
            }

            // 3. 替换视频时长
            const duration = card.querySelector('.bili-video-card__stats__duration');
            if (duration) duration.textContent = video.length;

            // 4. 替换播放量（第一个stats-item）
            const playCountItem = card.querySelectorAll('.bili-video-card__stats--item')[0];
            if (playCountItem) {
                const playText = playCountItem.querySelector('.bili-video-card__stats--text');
                if (playText) playText.textContent = video.play;
            }

            // 5. 替换弹幕数（第二个stats-item）
            const dmCountItem = card.querySelectorAll('.bili-video-card__stats--item')[1];
            if (dmCountItem) {
                const dmText = dmCountItem.querySelector('.bili-video-card__stats--text');
                if (dmText) dmText.textContent = video.video_review;
            }
            // ========== 新增：替换UP主信息 ==========
            const upOwnerLink = card.querySelector('.bili-video-card__info--owner');
            if (upOwnerLink) {
                // 6.1 替换UP主空间链接（强制HTTPS，拼接mid）
                const upSpaceUrl = `https://space.bilibili.com/${video.mid}`;
                upOwnerLink.href = upSpaceUrl;
                upOwnerLink.target = '_blank'; // 保留新窗口打开

                // 6.2 替换UP主用户名（文本 + title属性）
                const upAuthor = upOwnerLink.querySelector('.bili-video-card__info--author');
                if (upAuthor) {
                    upAuthor.textContent = video.author;
                    upAuthor.title = video.author; // hover提示显示UP主名
                }
            }
            // =======================================

            // 6. 替换发布时间（将时间戳转为YYYY-MM-DD格式）
            const dateElement = card.querySelector('.bili-video-card__info--date');
            if (dateElement) {
                dateElement.textContent = `· ${formatTimestamp(video.created)}`;
            }

            console.log(`✅ 已替换第${index+1}个卡片：${video.title}`);
        } catch (error) {
            console.error(`❌ 替换第${index+1}个卡片失败：`, error);
        }
    });
}
// 辅助函数：格式化播放量（如71371 → 7.1万，100000 → 10万）
function formatViewCount(count) {
    // 兼容字符串/数字类型的count
    const num = Number(count);
    if (isNaN(num)) return count;

    if (num >= 10000) {
        return (num / 10000).toFixed(1).replace('.0', '') + '万';
    }
    return num.toString();
}

// 辅助函数：时间戳转YYYY-MM-DD格式
function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000); // B站时间戳是秒级，需转毫秒
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 辅助函数：格式化视频时长（备用：如果API返回的是秒数时使用）
function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}