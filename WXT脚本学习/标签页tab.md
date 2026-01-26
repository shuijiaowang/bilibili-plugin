tab属性
```标识符
id,唯一标识符
windowId，窗口id，默认为当前窗口，可多个窗口
openerTabId，父标签id，从哪个标签页跳转来的
```
```状态
active，激活标签页
status，标签页状态，可选值：loading加载中,complete加载完成,error加载失败
selected，选中标签页，兼容属性于active一致
audible，标签页是否正在播放声音
mutedInfo，静音状态{muted:true|false,reason:mutedByCapture|userMuted}，是否静音和静音原因

```

```内容
url,标签页地址
title,标签页标题
favIconUrl,标签页图标
incognito，是否隐私模式
pinned，固定标签页？什么意思
```
```窗口布局
index，标签页索引顺序（0-？），可更改标签页位置
width/height,仅在active为true时生效，
groupId，标签分组id，默认为-1
splitViewId，分屏id，默认为-1？
```
```性能回收
discarded,是否被内存回收
autoDiscardable,是否自动回收，可设置不被自动回收，browser.tabs.update(tab.id, { autoDiscardable: false })
frozen,是否被冻结,停止运行而不是被回收，更轻量可快速启动
lastAccessed，最后访问时间戳
```

incognito？