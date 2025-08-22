// 全局系統模板保護腳本
// 這個腳本應該在所有頁面的 <head> 中載入，確保在頁面載入時立即生效

(function() {
    'use strict';
    
    console.log('[Protection] 載入全局保護腳本...');
    
    // 等待 DOM 準備好
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProtection);
    } else {
        initProtection();
    }
    
    function initProtection() {
        try {
            console.log('[Protection] 初始化全局保護機制...');
            
            // 保存原始方法
            const originalRemoveItem = localStorage.removeItem;
            const originalClear = localStorage.clear;
            
            // 保護 removeItem
            localStorage.removeItem = function(key) {
                if (key === 'limiautopost:systemTemplates') {
                    console.warn('[Protection] 阻止清除系統模板:', key);
                    return;
                }
                return originalRemoveItem.call(localStorage, key);
            };
            
            // 保護 clear
            localStorage.clear = function() {
                console.warn('[Protection] 阻止清除所有 localStorage 數據');
                return;
            };
            
            // 設置保護狀態
            localStorage.setItem('limiautopost:protectionStatus', 'protected');
            localStorage.setItem('limiautopost:protectionLoadedAt', new Date().toISOString());
            
            // 立即檢查系統模板狀態
            checkSystemTemplates();
            
            // 每5秒檢查一次
            setInterval(checkSystemTemplates, 5000);
            
            console.log('[Protection] 全局保護機制已啟用');
        } catch (error) {
            console.error('[Protection] 啟用全局保護機制失敗:', error);
        }
    }
    
    function checkSystemTemplates() {
        try {
            const systemTemplates = localStorage.getItem('limiautopost:systemTemplates');
            
            if (!systemTemplates || systemTemplates === '{}' || systemTemplates === '[]') {
                console.warn('[Protection] 檢測到系統模板丟失，嘗試恢復...');
                
                // 嘗試從備份恢復
                const backup = localStorage.getItem('limiautopost:systemTemplates_backup');
                if (backup && backup !== '{}' && backup !== '[]') {
                    localStorage.setItem('limiautopost:systemTemplates', backup);
                    console.log('[Protection] 從備份恢復系統模板成功');
                } else {
                    console.warn('[Protection] 沒有可用的備份，標記需要重新初始化');
                    localStorage.setItem('limiautopost:needsReinit', 'true');
                }
            }
        } catch (error) {
            console.error('[Protection] 檢查系統模板狀態失敗:', error);
        }
    }
})();
