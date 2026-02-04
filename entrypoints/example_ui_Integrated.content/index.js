import './style.css';
export default defineContentScript({
    matches: ['*://*.example.com/*'],
    runAt: "document_end",//这里改为已加载就执行，然后内部进行延迟处理 //
    allFrames: false,
    cssInjectionMode: 'ui',


    async main(ctx) {
        console.log("测试")
        const ui = await createShadowRootUi(ctx, {
            name: 'example-shadow-ui', // 唯一标识（用于 Shadow Root 命名）
            position: 'inline',
            anchor: 'body',
            isolateEvents: false, // 可选：是否隔离事件（默认 false，不隔离）
            onMount: (container) => {
                // 定义 UI 内容
                const app = document.createElement('h1');
                app.textContent = '这是 Shadow Root UI（样式隔离）';
                container.append(app);
            },
        });

        // 步骤 4：挂载 UI
        ui.mount();

    }
});