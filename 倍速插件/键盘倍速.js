// ==UserScript==
// @name         键盘倍速
// @namespace    http://tampermonkey.net/
// @version      2025-02-22
// @description  try to take over the world!
// @author       You
// @match        https://www.bilibili.com/video/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    (function() {
        'use strict';

        let isAltPressed = false;
        let currentNumber = '';
        let decimalEntered = false;

        document.addEventListener('keydown', function(e) {
            // 检测Alt键按下
            if (e.key === 'Alt' || e.keyCode === 18) {
                isAltPressed = true;
                currentNumber = '';
                decimalEntered = false;
                return;
            }

            if (!isAltPressed) return;

            // 处理数字输入
            if (e.key >= '0' && e.key <= '9') {
                currentNumber += e.key;
                e.preventDefault();
            }
            // 处理小数点
            else if (e.key === '.' && !decimalEntered) {
                currentNumber += e.key;
                decimalEntered = true;
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', function(e) {
            if (e.key === 'Alt' || e.keyCode === 18) {
                isAltPressed = false;
                if (currentNumber) {
                    const number = parseFloat(currentNumber);
                    if (!isNaN(number) && number > 0) {
                        const video = document.querySelector('video');
                        if (video) {
                            video.playbackRate = number;
                            // 显示提示（可选）
                            showSpeedTip(number);
                        }
                    }
                }
            }
        });

        // 显示速度提示的辅助函数
        function showSpeedTip(speed) {
            const tip = document.createElement('div');
            tip.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 5px;
            z-index: 9999;
            font-family: Arial;
            font-size: 24px;
        `;
            tip.textContent = `Speed: ${speed.toFixed(1)}x`;
            document.body.appendChild(tip);

            setTimeout(() => {
                document.body.removeChild(tip);
            }, 1000);
        }
    })();
    // Your code here...
})();