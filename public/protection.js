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
            const originalSetItem = localStorage.setItem;
            
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
            
            // 保護 setItem，防止被設置為空值
            localStorage.setItem = function(key, value) {
                if (key === 'limiautopost:systemTemplates' && (!value || value === '{}' || value === '[]')) {
                    console.warn('[Protection] 阻止將系統模板設置為空值');
                    return;
                }
                return originalSetItem.call(localStorage, key, value);
            };
            
            // 設置保護狀態
            localStorage.setItem('limiautopost:protectionStatus', 'protected');
            localStorage.setItem('limiautopost:protectionLoadedAt', new Date().toISOString());
            
            // 立即檢查系統模板狀態
            checkSystemTemplates();
            
            // 每2秒檢查一次
            setInterval(checkSystemTemplates, 2000);
            
            // 監聽 storage 事件
            window.addEventListener('storage', (event) => {
                if (event.key === 'limiautopost:systemTemplates') {
                    console.warn('[Protection] 檢測到其他來源修改系統模板:', event.newValue);
                    if (!event.newValue || event.newValue === '{}' || event.newValue === '[]') {
                        console.warn('[Protection] 檢測到系統模板被清空，立即恢復...');
                        setTimeout(checkSystemTemplates, 100);
                    }
                }
            });
            
            // 監聽頁面可見性變化
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    console.log('[Protection] 頁面重新可見，檢查系統模板狀態');
                    checkSystemTemplates();
                }
            });
            
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
