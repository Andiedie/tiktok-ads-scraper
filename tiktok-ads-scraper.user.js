// ==UserScript==
// @name         TikTok Ads Scraper
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Scrape ads data from TikTok Creative Center
// @match        https://ads.tiktok.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let collectedData = [];
    let isCollecting = false;
    let floatingUI;

    // Create floating UI
    function createFloatingUI() {
        floatingUI = document.createElement('div');
        floatingUI.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 9999;
            background-color: white;
            border: 1px solid black;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-family: Arial, sans-serif;
        `;

        const startButton = document.createElement('button');
        startButton.textContent = '开始';
        startButton.onclick = toggleCollection;

        const countDisplay = document.createElement('div');
        countDisplay.id = 'data-count';
        countDisplay.textContent = '已收集: 0';

        const exportButton = document.createElement('button');
        exportButton.textContent = '导出';
        exportButton.onclick = exportData;

        const instructionsButton = document.createElement('button');
        instructionsButton.textContent = '使用说明';
        instructionsButton.onclick = showInstructions;

        floatingUI.appendChild(startButton);
        floatingUI.appendChild(countDisplay);
        floatingUI.appendChild(exportButton);
        floatingUI.appendChild(instructionsButton);

        document.body.appendChild(floatingUI);
    }

    // Toggle data collection
    function toggleCollection() {
        isCollecting = !isCollecting;
        const button = floatingUI.querySelector('button');
        button.textContent = isCollecting ? '停止' : '开始';

        if (isCollecting) {
            scrollNearBottom();
        }

        updateDataCount();
    }

    // Update the displayed data count
    function updateDataCount() {
        const countDisplay = document.getElementById('data-count');
        countDisplay.textContent = `已收集: ${collectedData.length}`;
    }

    // Scroll near to the bottom of the page
    function scrollNearBottom() {
        const scrollHeight = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        const nearBottom = scrollHeight - window.innerHeight - 200; // 200px from bottom
        window.scrollTo(0, nearBottom);
        setTimeout(() => {
            if (isCollecting) {
                scrollNearBottom();
            }
        }, 2000);
    }

    // Export collected data as JSON
    function exportData() {
        const jsonString = JSON.stringify(collectedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const urlParams = new URLSearchParams(window.location.search);
        const period = urlParams.get('period') || 'unknown';
        const region = urlParams.get('region') || 'unknown';
        const fileName = `tiktok_ads_data_period_${period}_region_${region.toLowerCase()}.json`;

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(url);
    }

    // Show instructions
    function showInstructions() {
        alert(`使用说明：
1. 点击"开始"按钮开始收集数据。
2. 脚本会自动滚动页面并收集广告数据。
3. 你可以随时点击"停止"按钮暂停收集。
4. 收集过程中或结束后，可以点击"导出"按钮下载已收集的数据。
5. 导出的文件名会包含当前页面的时间段和地区信息。
6. 收集数据时，请保持网页打开状态。`);
    }

    // Intercept XMLHttpRequests
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
            if (this.responseURL.includes('https://ads.tiktok.com/creative_radar_api/v1/top_ads/v2/list')) {
                try {
                    const response = JSON.parse(this.responseText);
                    if (response.code !== 0) {
                        alert(response.msg);
                        isCollecting = false;
                        floatingUI.querySelector('button').textContent = '开始';
                        return;
                    }

                    // Clear the array if it's the first page
                    if (response.data.pagination.page === 1) {
                        collectedData = [];
                    }

                    const newMaterials = response.data.materials;
                    for (const material of newMaterials) {
                        if (!collectedData.some(item => item.id === material.id)) {
                            collectedData.push(material);
                        }
                    }

                    updateDataCount();

                    if (isCollecting && response.data.pagination.has_more) {
                        scrollNearBottom();
                    }
                } catch (error) {
                    console.error('Error processing response:', error);
                }
            }
        });
        originalOpen.apply(this, arguments);
    };

    // Initialize
    createFloatingUI();
})();
