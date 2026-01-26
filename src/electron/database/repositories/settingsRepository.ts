import type Database from "better-sqlite3";

const DEFAULT_SETTINGS: UserSettings = {
    defaultDurationMinutes: 25,
    gracePeriodSeconds: 10,
    notificationsEnabled: true,
    soundEnabled: true,
    theme: 'github-dark',
    hasCompletedOnboarding: false,
};

type SettingRow = {
    key: string;
    value: string;
};

export function createSettingsRepository(db: Database.Database) {
    const upsertSetting = db.prepare(`
    INSERT INTO user_settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `);

    const findAllStmt = db.prepare(`SELECT * FROM user_settings`);

    return {
        get(): UserSettings {
            const rows = findAllStmt.all() as SettingRow[];
            const settings = { ...DEFAULT_SETTINGS };

            for (const row of rows) {
                const key = row.key as keyof UserSettings;
                const value = row.value;

                if (key === "defaultDurationMinutes" || key === "gracePeriodSeconds") {
                    settings[key] = parseInt(value, 10);
                } else if (key === "notificationsEnabled" || key === "soundEnabled" || key === "hasCompletedOnboarding") {
                    settings[key] = value === "true";
                } else if (key === "theme") {
                    settings[key] = value as UserSettings['theme'];
                }
            }

            return settings;
        },

        update(updates: Partial<UserSettings>): UserSettings {
            const transaction = db.transaction(() => {
                for (const [key, value] of Object.entries(updates)) {
                    if (value !== undefined) {
                        upsertSetting.run({ key, value: String(value) });
                    }
                }
            });

            transaction();
            return this.get();
        },

        reset(): UserSettings {
            return this.update(DEFAULT_SETTINGS);
        },
    };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
