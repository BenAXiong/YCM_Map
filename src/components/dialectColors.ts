export function getDialectColor(dialect: string) {
    const colors = [
        '#3b82f6',
        '#ef4444',
        '#10b981',
        '#f59e0b',
        '#8b5cf6',
        '#ec4899',
        '#06b6d4',
        '#84cc16',
        '#f97316',
        '#6366f1',
    ];

    let hash = 0;
    for (let i = 0; i < dialect.length; i++) {
        hash = dialect.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}