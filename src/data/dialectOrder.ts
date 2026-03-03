/**
 * Predetermined sequence for dialects within language groups.
 * Add dialects here to ensure they appear in a specific order (e.g., North to South).
 * Dialects not listed here will maintain their original order from the data source.
 * 
 * Note: These MUST match the keys in dialects.bundle.json
 */
export const DIALECT_ORDER_HINTS: Record<string, string[]> = {
    '阿美語': [
        '北部阿美語', // 南勢
        '中部阿美語', // 秀姑巒
        '海岸阿美語',
        '馬蘭阿美語',
        '恆春阿美語'
    ],
    '泰雅語': [
        '賽考利克泰雅語',
        '澤敖利泰雅語',
        '汶水泰雅語',
        '萬大泰雅語',
        '四季泰雅語',
        '宜蘭澤敖利泰雅語'
    ],
    '賽德克語': [
        '都達語',
        '德固達雅語',
        '德魯固語'
    ],
    '布農語': [
        '卓群布農語',
        '卡群布農語',
        '丹群布農語',
        '巒群布農語',
        '郡群布農語'
    ],
    '排灣語': [
        '東排灣語',
        '北排灣語',
        '中排灣語',
        '南排灣語'
    ],
    '魯凱語': [
        '東魯凱語',
        '霧臺魯凱語',
        '大武魯凱語',
        '多納魯凱語',
        '茂林魯凱語',
        '萬山魯凱語'
    ],
    '卑南語': [
        '南王卑南語',
        '知本卑南語',
        '初鹿卑南語', // 西群
        '建和卑南語'
    ]
};
