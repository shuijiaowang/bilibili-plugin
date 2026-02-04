import './style.css';
export default defineContentScript({
    matches: ['*://*.example.com/*'],
    runAt: "document_end",//这里改为已加载就执行，然后内部进行延迟处理 //
    allFrames: false,


    async main(ctx) {
        console.log("测试")
        // 1. 创建 Integrated UI
        const ui = createIntegratedUi(ctx, {
            position: 'inline', // UI 插入位置（inline：内联插入锚点元素）
            anchor: 'body', // 挂载的锚点元素（可传入选择器或 DOM 元素）
            onMount: (container) => {
                // 2. 定义 UI 内容（container 是 WXT 自动创建的容器元素）
                const app = document.createElement('h1');
                app.textContent = '这是 Integrated UI（无隔离）';
                app.style.padding = '8px';
                container.append(app);
            },
        });

        // 3. 挂载 UI 到网页 DOM 中
        ui.mount();

    }
});