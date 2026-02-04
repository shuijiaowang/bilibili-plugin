// entrypoints/example-iframe.content.ts
import { defineContentScript, createIframeUi } from '#imports';

export default defineContentScript({
    matches: ['*://*.example.com/*'],
    main(ctx) {
        // 1. 创建 IFrame UI
        const ui = createIframeUi(ctx, {
            page: '/example-iframe.html', // IFrame 加载的 HTML 页面路径
            position: 'inline',
            anchor: 'body',
            onMount: (wrapper, iframe) => {
                // 2. 配置 IFrame 样式（wrapper 是包裹 IFrame 的容器，iframe 是 IFrame 元素）
                iframe.width = '300px';
                iframe.border = '0';
                iframe.style.backgroundColor = 'white';
            },
        });

        // 3. 挂载 IFrame UI
        ui.mount();
    },
});