import { useEffect, useState, useCallback } from 'react';

export function useBlockRules() {
    const [rules, setRules] = useState<BlockRule[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const data = await window.electron.getBlockRules();
            setRules(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const addRule = useCallback(async (rule: Omit<BlockRule, 'id' | 'createdAt'>) => {
        const newRule = await window.electron.addBlockRule(rule);
        setRules((prev) => [newRule, ...prev]);
        return newRule;
    }, []);

    const removeRule = useCallback(async (id: string) => {
        await window.electron.removeBlockRule(id);
        setRules((prev) => prev.filter((r) => r.id !== id));
    }, []);

    const updateRule = useCallback(async (rule: BlockRule) => {
        const updated = await window.electron.updateBlockRule(rule);
        setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
        return updated;
    }, []);

    return { rules, loading, addRule, removeRule, updateRule, refresh: fetchRules };
}
