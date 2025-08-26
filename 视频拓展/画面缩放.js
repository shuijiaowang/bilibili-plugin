// ==UserScript==
// @name         改
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @include      http*://*bilibili.com/video/*
// @include      http*://*bilibili.com/list/*
// @include      http*://*bilibili.com/bangumi/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    //首先要等待加载
    setTimeout(() => {
        video_change_byly();
    }, 7000);

    function video_change_byly() {
        console.log("定时器延迟 2000 毫秒（即 2 秒）执行一次");
        video_change_html_byly();
        video_change_scale_byly();
    }
    function video_change_html_byly() {
        // 选择要插入到的目标 div
        const targetDiv = document.querySelector(".bpx-player-control-bottom-left");

        // 创建新的 div 元素
        const newDiv = document.createElement("div");
        newDiv.className = "video-change-div"; // 为 newDiv 添加类
        newDiv.style.padding = "1px"; // 为 newDiv 添加内边距
        newDiv.style.marginTop = "1px"; // 为 newDiv 添加上外边距
        newDiv.style.backgroundColor = "#rgba(249, 249, 249, 0.3)"; // 为 newDiv 添加背景颜色

        // 创建输入框元素
        const inputText = document.createElement("input");
        inputText.type = "text"; // 设置输入框类型为文本
        inputText.className = "video-change-input"; // 为 inputText 添加类
        inputText.style.padding = "1px"; // 为 inputText 添加内边距
        inputText.style.border = "1px solid rgba(249, 249, 249, 0.5)"; // 为 inputText 添加边框
        inputText.style.borderRadius = "1px"; // 为 inputText 添加圆角
        inputText.style.marginRight = "1px"; // 为 inputText 添加右外边距
        inputText.style.backgroundColor = "hsla(0,0%,100%,.2)"; // 为 newDiv 添加背景颜色
        inputText.style.textAlign = "center";
        inputText.style.width = "40px";
        inputText.value = "1.5";
        // 创建按钮元素
        const button = document.createElement("button");
        button.textContent = "点"; // 设置按钮的文字
        button.className = "video-change-button"; // 为 button 添加类
        button.style.padding = "1px 1px"; // 为 button 添加内边距
        button.style.border = "none"; // 去掉按钮边框
        button.style.borderRadius = "2px"; // 为 button 添加圆角
        button.style.backgroundColor = "#rgba(249, 249, 249, 0.5)"; // 设置按钮背景颜色
        button.style.color = "#rgba(249, 249, 249, 0.5)"; // 设置按钮文字颜色
        button.style.cursor = "pointer"; // 设置鼠标悬停时为手型
        button.style.fontSize = "16px"; // 设置按钮字体大小

        // 将输入框和按钮添加到新 div 中
        newDiv.appendChild(inputText);
        newDiv.appendChild(button);

        // 将新 div 插入到目标 div 的尾部
        targetDiv.appendChild(newDiv);
    }

    function video_change_scale_byly() {
        //获取位置
        let vx = 0;
        let vy = 0;
        let number1 = 1;
        let isCKeyPressed = false; // 新增标志
        let video_change = document.querySelector("video");
        //监听是否按下了c键
        document.addEventListener("keydown", (e) => {
            if (e.key === "c") {
                isCKeyPressed = true; // 设置标志为true
                //获取video元素

                //获取放大倍数
                document.querySelector(".video-change-input").value = number1;
                video_change.style.transform = `scale(${number1}) translate(${
                    vx - 640
                }px, ${vy - 358}px)`;
            }
        });

        document.addEventListener("keyup", (e) => {
            if (e.key === "c") {
                isCKeyPressed = false; // 设置标志为false
            }
        });

        const handleWheel1 = (event) => {
            if (isCKeyPressed) {
                // 只有在按下c键时才修改数字
                if (event.deltaY > 0) {
                    if(number1>0.1){number1 -= 0.1;}
                    number1-=0.1
                } else {
                    number1 += 0.1;
                }
                console.log(number1);
            }
        };

        // 添加事件监听器
        window.addEventListener("wheel", handleWheel1);

        const onMouseMove1 = (event) => {
            // 记录鼠标位置
            vx = event.clientX;
            vy = event.clientY;
            //打印鼠标位置
            //console.log(`Mouse position: (${event.clientX}, ${event.clientY})`);
        };

        // 监听鼠标移动
        document.addEventListener("mousemove", onMouseMove1);

        //点击按钮恢复原样
        document.querySelector(".video-change-button").addEventListener("click", () => {
            video_change.style.transform ="";
        });
    }
    // Your code here...
})();