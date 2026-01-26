import { defineStore } from 'pinia';
import {ref, computed, watch, onMounted} from 'vue';
import {browser} from "wxt/browser";
import {storage} from "#imports";

export const useLinkStore = defineStore('link', () => {
    // 状态 - 相当于选项式API中的state
    // const links = ref([
    //     { id: 1, text: '项目仓库', url: 'https://github.com/shuijiaowang/AIPromptTool.git' },
    //     { id: 2, text: '文档仓库', url: 'https://github.com/shuijiaowang/shuijiaowangGoService.git' },
    //     { id: 3, text: 'API仓库', url: 'https://github.com/example/api' }
    // ]);
    const links=ref([])
    const showPopup = ref(false);

    // 计算属性 - 相当于选项式API中的getters
    const linkCount = computed(() => links.value.length);
    const hasLinks = computed(() => linkCount.value > 0);

    // 方法 - 相当于选项式API中的actions
    const togglePopup = () => {
        showPopup.value = !showPopup.value;
    };

    const closePopup = () => {
        showPopup.value = false;
    };

    // 添加链接
    const addLink = (text, url) => {
        links.value.push({
            id: Date.now(), // 使用时间戳作为唯一ID
            text,
            url,
            isDefault: false // 新增字段
        });
    };

    // 更新name或链接
    const updateLink = (id, updatedData) => {
        const index = links.value.findIndex(link => link.id === id);
        if (index !== -1) {
            links.value[index] = { ...links.value[index], ...updatedData };
        }
    };

    // 删除链接
    const deleteLink = (id) => {
        links.value = links.value.filter(link => link.id !== id);
    };
    // 在组件挂载时初始化
    onMounted(async () => {
        await init();
    });


    // 持久化相关
    const STORAGE_KEY = 'local:ai-prompt-tool-links';

    // 从 storage 加载数据
    const init = async () => {
        try {
            const raw = await storage.getItem(STORAGE_KEY);
            if (raw) {
                console.log('Loaded links from storage:', raw);
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    links.value = parsed;
                    console.log('Loaded links:', links.value);
                }
            }
        } catch (e) {
            console.error('Failed to load links from storage', e);
        }
    };

    // 保存到 storage
    const save = async () => {
        try {
            await storage.setItem(STORAGE_KEY, JSON.stringify(links.value));
        } catch (e) {
            console.error('Failed to save links to storage', e);
        }
    };

    // 监听数据变化自动保存
    watch(
        links, // 直接监听 ref
        async (newValue) => {
            await save();
        },
        { deep: true }
    );
    // 返回需要暴露的状态和方法
    return {
        links,
        showPopup,
        linkCount,
        hasLinks,
        togglePopup,
        closePopup,
        addLink,
        updateLink,
        deleteLink,
        init // 暴露初始化方法
    };
});
