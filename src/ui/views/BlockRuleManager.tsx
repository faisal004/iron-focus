import { useState } from 'react';
import { useBlockRules } from '../hooks/useBlockRules';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/card';
import { Button } from '../components/button';

export function BlockRuleManager() {
    const { rules, loading, addRule, removeRule, updateRule } = useBlockRules();
    const [isAdding, setIsAdding] = useState(false);
    const [newRuleType, setNewRuleType] = useState<BlockTargetType>('domain');
    const [newRulePattern, setNewRulePattern] = useState('');

    const handleAddRule = async () => {
        if (!newRulePattern.trim()) return;

        await addRule({
            type: newRuleType,
            pattern: newRulePattern.trim(),
            isEnabled: true,
        });

        setNewRulePattern('');
        setIsAdding(false);
    };

    const handleToggleRule = async (rule: BlockRule) => {
        await updateRule({ ...rule, isEnabled: !rule.isEnabled });
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Loading...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    🚫 Blocked Distractions
                </CardTitle>
                <CardDescription>
                    These apps and websites will be blocked during focus sessions
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add Rule Form */}
                {isAdding ? (
                    <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex gap-2">
                            <select
                                value={newRuleType}
                                onChange={(e) => setNewRuleType(e.target.value as BlockTargetType)}
                                className="px-3 py-2 border rounded-md bg-background"
                            >
                                <option value="domain">Domain</option>
                                <option value="application">Application</option>
                                <option value="url">URL</option>
                            </select>
                            <input
                                type="text"
                                value={newRulePattern}
                                onChange={(e) => setNewRulePattern(e.target.value)}
                                placeholder={
                                    newRuleType === 'domain'
                                        ? 'e.g., youtube.com'
                                        : newRuleType === 'application'
                                            ? 'e.g., chrome'
                                            : 'e.g., twitter.com/home'
                                }
                                className="flex-1 px-3 py-2 border rounded-md bg-background"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsAdding(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddRule} disabled={!newRulePattern.trim()}>
                                Add Rule
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full">
                        + Add Block Rule
                    </Button>
                )}

                {/* Rules List */}
                {rules.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                        No blocking rules yet. Add one above!
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rules.map((rule) => (
                            <div
                                key={rule.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${rule.isEnabled ? 'bg-background' : 'bg-muted/50 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                        {rule.type === 'domain' && '🌐'}
                                        {rule.type === 'application' && '📱'}
                                        {rule.type === 'url' && '🔗'}
                                    </span>
                                    <div>
                                        <div className="font-medium">{rule.pattern}</div>
                                        <div className="text-xs text-muted-foreground capitalize">
                                            {rule.type}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleRule(rule)}
                                    >
                                        {rule.isEnabled ? '✓ Enabled' : 'Disabled'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeRule(rule.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
