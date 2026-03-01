export type Language = 'zh' | 'en';

export const uiTranslations = {
    zh: {
        // Header & Global
        title: '臺灣族語分佈地圖',
        subtitle: '臺灣原住民族語分佈',
        resetZoom: '重設縮放',
        exportImage: '匯出圖片',
        share: '分享',
        installApp: '安裝 App',
        loadingData: '正在載入地理數據...',
        searching: '搜尋中...',
        noResults: '無相關搜尋結果',
        legend: '圖例',
        exportSuccess: '地圖已匯出',
        exportFailed: '匯出失敗，請重試',
        shareText: '快來看看臺灣原住民語的分佈地圖！',
        urlCopied: '網址已複製到剪貼簿！',

        // Settings Menu
        settings: '地圖設定',
        mapLayers: '地圖分層',
        countyBorders: '縣市邊界',
        townshipContours: '鄉鎮外廓',
        villageBorders: '村里邊界 (需放大)',
        areaNames: '顯示地名',
        level1Names: '縣市名稱',
        level2Names: '鄉鎮名稱',
        level3Names: '村里名稱 (需放大)',
        boundaryDisplay: '邊界與著色',
        villageColors: '村里細節著色 (Mode B)',
        sharedDialects: '多重族語著色 (分色)',
        showFixedInfo: '固定側邊欄 (PC)',
        languageSelect: '語言 / Language',

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
        villageColors: 'Enble per-village colors',
        sharedDialects: 'Show overlaps',
        showFixedInfo: 'Pinned Sidebar',
        languageSelect: 'Language / 語言',

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
