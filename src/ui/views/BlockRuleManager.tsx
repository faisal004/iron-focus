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
        <Card className="border-2 border-primary shadow-none h-full rounded-none">
            <CardHeader className="border-b-2 border-primary pb-4 bg-muted/20">
                <CardTitle className="flex items-center gap-2 uppercase tracking-wide">
                    {">"} BLOCKED_PROTOCOLS
                </CardTitle>
                <CardDescription className="font-mono text-xs opacity-70">
                    // SYSTEM.CONFIG.DISTRACTION_BLOCKER
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {/* Quick Add Presets */}
                {!isAdding && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 border-b border-dashed border-primary/30 pb-6">
                        {[
                            { name: 'YouTube', pattern: 'youtube.com', type: 'domain' },
                            { name: 'X / Twitter', pattern: 'x.com', type: 'domain' },
                            { name: 'Instagram', pattern: 'instagram.com', type: 'domain' },
                            { name: 'Spotify', pattern: 'spotify', type: 'application' },
                        ].map((preset) => (
                            <Button
                                key={preset.name}
                                variant="outline"
                                size="sm"
                                className="text-xs border-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-none"
                                onClick={() => addRule({
                                    type: preset.type as BlockTargetType,
                                    pattern: preset.pattern,
                                    isEnabled: true,
                                })}
                            >
                                + {preset.name}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Add Rule Form */}
                {isAdding ? (
                    <div className="p-4 border-2 border-dashed border-primary space-y-3 bg-background">
                        <div className="flex gap-2">
                            <select
                                value={newRuleType}
                                onChange={(e) => setNewRuleType(e.target.value as BlockTargetType)}
                                className="px-3 py-2 border-2 border-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="domain">DOMAIN</option>
                                <option value="application">APP</option>
                                <option value="url">URL</option>
                            </select>
                            <input
                                type="text"
                                value={newRulePattern}
                                onChange={(e) => setNewRulePattern(e.target.value)}
                                placeholder="ENTER_TARGET_PATTERN..."
                                autoFocus
                                className="flex-1 px-3 py-2 border-2 border-primary bg-background font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" className="hover:bg-primary/10" onClick={() => setIsAdding(false)}>
                                [CANCEL]
                            </Button>
                            <Button className="border-2 border-primary bg-primary text-primary-foreground hover:opacity-90 font-bold" onClick={handleAddRule} disabled={!newRulePattern.trim()}>
                                [EXECUTE]
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full border-2 border-dashed border-primary hover:bg-primary/5 hover:border-solid h-12 uppercase tracking-widest rounded-none">
                        + INITIALIZE_NEW_RULE
                    </Button>
                )}

                {/* Rules List */}
                {rules.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 font-mono text-sm border-2 border-dotted border-primary/20">
                        {">"} NO_ACTIVE_RULES_FOUND
                    </div>
                ) : (
                    <div className="space-y-0 divide-y divide-primary/20 border-2 border-primary">
                        {rules.map((rule) => (
                            <div
                                key={rule.id}
                                className={`flex items-center justify-between p-3 transition-colors ${rule.isEnabled ? 'bg-background hover:bg-primary/5' : 'bg-muted/50 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${rule.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                    <div>
                                        <div className="font-bold tracking-tight">{rule.pattern.toUpperCase()}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase opacity-70">
                                            TYPE::{rule.type}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs hover:bg-primary/10"
                                        onClick={() => handleToggleRule(rule)}
                                    >
                                        [{rule.isEnabled ? 'DISABLE' : 'ENABLE'}]
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeRule(rule.id)}
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        [DEL]
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
