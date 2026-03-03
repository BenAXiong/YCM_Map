export type Language = 'zh' | 'en';

export const uiTranslations = {
    zh: {
        // Header & Global
        title: 'work in progress', // 臺灣族語分佈地圖
        subtitle: '以~', // 臺灣原住民族語分佈
        resetZoom: '重設縮放',
        exportImage: '匯出圖片',
        share: '分享網站',
        installApp: '安裝 App',
        loadingData: '正在載入地理數據...',
        searching: '搜尋中...',
        noResults: '無相關搜尋結果',
        legend: '圖例',
        exportSuccess: '地圖已匯出',
        exportFailed: '匯出失敗，請重試',
        shareText: '快來看看臺灣原住民語的分佈地圖！',
        urlCopied: '網址已複製到剪貼簿！',
        exportFull: '完整',
        exportNoLegend: '僅地圖',
        shareURL: '連結',
        sharePic: '圖片',

        // Settings Menu
        settings: '地圖設定',
        mapLayers: '地圖分層',
        countyBorders: '縣市邊界',
        townshipContours: '鄉鎮外廓',
        villageBorders: '村里邊界',
        areaNames: '顯示地名',
        level1Names: '縣市名稱',
        level2Names: '鄉鎮名稱',
        level3Names: '村里名稱',
        boundaryDisplay: '邊界與著色',
        villageColors: '',
        sharedDialects: '重疊區域分色',
        dialectUsageToggle: '方言慣用稱呼',
        mapBgColor: '地圖底色',
        showFixedInfo: '固定資訊面板',
        pinsSection: '踩點記錄',
        showPins: '顯示踩點圖示',
        showPinContours: '踩點分類邊框',
        showPinGlow: '踩點區域光暈',
        languageSelect: '語言 / Language',
        uiOptions: '介面設定',

        // Filter Panel
        filterLanguages: '族語篩選',
        searchPlaceholder: '搜尋鄉鎮...',
        selectAll: '全選',
        clearAll: '清除',
        dialectCount: '個族語項目',
        population: '原住民人口',
        area: '分佈區域',

        // Tooltip / Detail
        clickToSeeDetail: '點擊查看詳細資訊',
        dialectsInArea: '此區域分布族語',
        populationStats: '原住民人口統計',
        moreInfo: '更多資訊'
    },
    en: {
        // Header & Global
        title: 'Taiwan Indigenous Languages Map',
        subtitle: 'Taiwan Indigenous Languages Distribution',
        resetZoom: 'Reset Zoom',
        exportImage: 'Export PNG',
        share: 'Share',
        installApp: 'Install App',
        loadingData: 'Loading geographic data...',
        searching: 'Searching...',
        noResults: 'No results found',
        legend: 'Legend',
        exportSuccess: 'Map exported successfully',
        exportFailed: 'Export failed, please try again',
        shareText: 'Check out the distribution map of Taiwan Indigenous Languages!',
        urlCopied: 'URL copied to clipboard!',
        exportFull: 'Full',
        exportNoLegend: 'No Legend',
        shareURL: 'URL',
        sharePic: 'Pic',

        // Settings Menu
        settings: 'Map Settings',
        mapLayers: 'Map Layers',
        countyBorders: 'Counties',
        townshipContours: 'Townships',
        villageBorders: 'Villages',
        areaNames: 'Label display',
        level1Names: 'Counties',
        level2Names: 'Townships',
        level3Names: 'Villages',
        boundaryDisplay: 'Detail mode',
        villageColors: 'Enable per-village colors',
        sharedDialects: 'Show overlaps',
        dialectUsageToggle: 'Common Dialect Names',
        mapBgColor: 'Background Color',
        showFixedInfo: 'Pinned Sidebar',
        pinsSection: 'Activity Pins (Village Mode)',
        showPins: 'Display activity pins',
        showPinContours: 'Pin-themed borders',
        showPinGlow: 'Pin area glow',
        languageSelect: 'Language / 語言',
        uiOptions: 'UI Options',

        // Filter Panel
        filterLanguages: 'Language Filter',
        searchPlaceholder: 'Search Townships...',
        selectAll: 'Select All',
        clearAll: 'Clear',
        dialectCount: 'dialects selected',
        population: 'Indigenous Population',
        area: 'Distribution Area',

        // Tooltip / Detail
        clickToSeeDetail: 'Click for details',
        dialectsInArea: 'Dialects in this area',
        populationStats: 'Population Stats',
        moreInfo: 'More Info'
    }
};
