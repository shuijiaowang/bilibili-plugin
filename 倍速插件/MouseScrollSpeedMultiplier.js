(function() {
    'use strict';

    let isHovering = false; // 标记鼠标是否悬停在播放速率控制元素上,鼠标在特定位置才执行该功能
    const STEP = 0.1; // 每次滚动的倍率变化量
    const MIN_RATE = 0.25; // 最小播放速率
    const MAX_RATE = 16.0; // 最大播放速率
    let targetElement = null; // 播放速率控制元素
    let videoElement = null; // 视频元素

    // 鼠标进入目标元素时的处理函数
    function handleMouseEnter() {
        isHovering = true;
    }

    // 鼠标离开目标元素时的处理函数
    function handleMouseLeave() {
        isHovering = false;
        if (videoElement) {
            // 离开时保留当前速率，并四舍五入到两位小数
            videoElement.playbackRate = Number(videoElement.playbackRate.toFixed(2));
        }
    }

    // 滚轮事件处理函数
    function handleWheel(event) {
        if (!isHovering) return; // 只在悬停时处理滚轮事件
        event.preventDefault(); // 阻止默认滚轮行为

        // 计算滚动方向（向上滚动加速，向下滚动减速）
        const direction = event.deltaY > 0 ? -1 : 1;

        // 计算新倍率并限制范围
        let newRate = videoElement.playbackRate + (STEP * direction);
        newRate = Math.min(Math.max(newRate, MIN_RATE), MAX_RATE);

        // 应用新倍率
        videoElement.playbackRate = newRate;
    }

    // 初始化函数
    function init() {
        // 移除旧的元素监听器
        if (targetElement) {
            targetElement.removeEventListener('mouseenter', handleMouseEnter);
            targetElement.removeEventListener('mouseleave', handleMouseLeave);
            targetElement.removeEventListener('wheel', handleWheel);
        }

        // 查询最新元素
        targetElement = document.querySelector('.bpx-player-ctrl-playbackrate');
        videoElement = document.querySelector('video');

        if (!targetElement || !videoElement) {
            // 如果元素不存在，延迟重试
            setTimeout(init, 1000);
            return;
        }

        // 添加新的事件监听
        targetElement.addEventListener('mouseenter', handleMouseEnter);
        targetElement.addEventListener('mouseleave', handleMouseLeave);
        targetElement.addEventListener('wheel', handleWheel);
    }

    // 初始化并监听DOM变化
    init();
    new MutationObserver(init).observe(document.body, {
        childList: true,
        subtree: true
    });
})();