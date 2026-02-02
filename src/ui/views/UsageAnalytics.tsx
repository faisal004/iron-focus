import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/card";
import { Button } from "../components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "../components/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, LayoutGrid, Calendar } from 'lucide-react';

export function UsageAnalytics() {
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
    const [stats, setStats] = useState<UsageStats[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async (silent: boolean = false) => {
        if (!silent) setLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();

            if (timeRange === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else if (timeRange === 'month') {
                startDate.setMonth(now.getMonth() - 1);
            }

            // Mock data for now if backend returns empty or fails (to ensure UI works)
            // But we should try to fetch real data
            const data = await window.electron.getUsageStats(startDate.getTime(), now.getTime());
            setStats(data || []);
        } catch (error) {
            console.error("Failed to load usage stats:", error);
            if (!silent) setStats([]); // clear stats on error only if generic load
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Poll for updates every 5 seconds
        const interval = setInterval(() => {
            loadData(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [timeRange]);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const topApps = useMemo(() => {
        return [...stats]
            .sort((a, b) => b.totalDuration - a.totalDuration)
            .slice(0, 5);
    }, [stats]);

    const totalTime = useMemo(() => {
        return stats.reduce((acc, curr) => acc + curr.totalDuration, 0);
    }, [stats]);

    const timeRangeLabel = {
        'today': 'Today',
        'week': 'Last 7 Days',
        'month': 'Last 30 Days'
    };

    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
                    <p className="text-muted-foreground">Track your digital habits and focus.</p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[180px] justify-between">
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {timeRangeLabel[timeRange]}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTimeRange('today')}>Today</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTimeRange('week')}>Last 7 Days</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTimeRange('month')}>Last 30 Days</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Screen Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loading ? "..." : formatDuration(totalTime)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {timeRange === 'today' ? "Today" : "In selected period"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Context Switches</CardTitle>
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">Detailed timeline coming soon</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7 h-[400px]">
                <Card className="col-span-4 h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Top Applications</CardTitle>
                        <CardDescription>Most used apps in this period</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                        ) : topApps.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topApps} layout="vertical" margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="appName"
                                        type="category"
                                        width={120}
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        tickFormatter={(val) => val.length > 15 ? val.substring(0, 12) + '...' : val}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-background border rounded-lg p-2 shadow-sm text-sm">
                                                        <p className="font-bold">{data.appName}</p>
                                                        <p>{formatDuration(data.totalDuration)}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="totalDuration" radius={[0, 4, 4, 0]}>
                                        {topApps.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill="hsl(var(--primary))" fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3 h-full overflow-hidden flex flex-col">
                    <CardHeader>
                        <CardTitle>Usage Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        <div className="space-y-4 pr-4">
                            {topApps.map((app) => (
                                <div key={app.appName} className="flex items-center">
                                    <div className="w-full space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium leading-none">{app.appName}</span>
                                            <span className="text-sm text-muted-foreground">{formatDuration(app.totalDuration)}</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${(app.totalDuration / totalTime) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!loading && topApps.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">No usage data recorded yet.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
