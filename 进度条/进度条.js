// ==UserScript==
// @name         进度条3
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

    //z键绑定网页全屏
    document.addEventListener('keydown', function(event) {
        if (event.keyCode === 90) {

            document.querySelector('.bpx-player-ctrl-web').click()
        }
    });
    setTimeout(function(){
        // 创建浮悬窗元素
        let fw = document.createElement('div');
        fw.className = 'fw';

        const style = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.5);
    color: #fff;
    padding: 10px;
    border-radius: 5px;
    z-index: 9999;
`;
        fw.style.cssText = style;

        document.body.appendChild(fw);



        function parseTimeString(el) {
            let list=el.innerText.split(":")
            let hs=0;let fens=0;let miaos=0;
            if (list.length<3){
                let [fen,miao]=list;
                fens+=Number(fen);
                miaos+=Number(miao);
            }else{
                let [h,fen,miao]=list;
                hs+=Number(h);
                fens+=Number(fen);
                miaos+=Number(miao);
            }
            return hs*60*60+fens*60+miaos
        }
        //获取总时长
        let miaos=0;
        let times_el=document.querySelectorAll(".video-pod__list .video-pod__item .stats")

        times_el.forEach(function(el,i){
            let miao=parseTimeString(el);
            miaos=miao+miaos
        })


        setInterval(function() {

            // 获取已观看时长

            const children = document.querySelectorAll(".video-pod__item");
            const activeChild = document.querySelector('.video-pod__list .active');
            const times_on = Array.prototype.indexOf.call(children, activeChild);



            let miaos_have=0;

            for(let i=0;i<times_on;i++)
            {
                let miao=parseTimeString(times_el[i]);

                miaos_have+=miao
            }

            //获取当前页的时间

            let time_now=0;

            let mm=parseTimeString(document.querySelector(".bpx-player-ctrl-time-current"));

            time_now=mm;

            miaos_have+=time_now;


            let str=`<p>总时长：${miaos/60/60} </p>
             <p>已观看：${miaos_have/60/60} </p>
             <p>进度：  ${miaos_have/miaos*100}% </p>`
            fw.innerHTML =str;
            document.querySelector('.bpx-player-top-left-title').textContent='';
        }, 1000);
    },5000)
})();





























