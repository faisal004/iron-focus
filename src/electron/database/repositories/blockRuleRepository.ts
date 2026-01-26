import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

type BlockRuleRow = {
    id: string;
    type: string;
    pattern: string;
    is_enabled: number;
    created_at: number;
};

function rowToRule(row: BlockRuleRow): BlockRule {
    return {
        id: row.id,
        type: row.type as BlockTargetType,
        pattern: row.pattern,
        isEnabled: row.is_enabled === 1,
        createdAt: row.created_at,
    };
}

export function createBlockRuleRepository(db: Database.Database) {
    const insertRule = db.prepare(`
    INSERT INTO blocked_targets (id, type, pattern, is_enabled, created_at)
    VALUES (@id, @type, @pattern, @is_enabled, @created_at)
  `);

    const updateRule = db.prepare(`
    UPDATE blocked_targets 
    SET type = @type, pattern = @pattern, is_enabled = @is_enabled
    WHERE id = @id
  `);

    const deleteRule = db.prepare(`DELETE FROM blocked_targets WHERE id = ?`);
    const findAllStmt = db.prepare(`SELECT * FROM blocked_targets ORDER BY created_at DESC`);
    const findEnabledStmt = db.prepare(`SELECT * FROM blocked_targets WHERE is_enabled = 1`);
    const findByIdStmt = db.prepare(`SELECT * FROM blocked_targets WHERE id = ?`);

    return {
        create(rule: Omit<BlockRule, "id" | "createdAt">): BlockRule {
            const newRule: BlockRule = {
                id: uuidv4(),
                type: rule.type,
                pattern: rule.pattern,
                isEnabled: rule.isEnabled,
                createdAt: Date.now(),
            };

            insertRule.run({
                id: newRule.id,
                type: newRule.type,
                pattern: newRule.pattern,
                is_enabled: newRule.isEnabled ? 1 : 0,
                created_at: newRule.createdAt,
            });

            return newRule;
        },

        findAll(): BlockRule[] {
            const rows = findAllStmt.all() as BlockRuleRow[];
            return rows.map(rowToRule);
        },

        findEnabled(): BlockRule[] {
            const rows = findEnabledStmt.all() as BlockRuleRow[];
            return rows.map(rowToRule);
        },

        findById(id: string): BlockRule | null {
            const row = findByIdStmt.get(id) as BlockRuleRow | undefined;
            return row ? rowToRule(row) : null;
        },

        update(rule: BlockRule): BlockRule {
            updateRule.run({
                id: rule.id,
                type: rule.type,
                pattern: rule.pattern,
                is_enabled: rule.isEnabled ? 1 : 0,
            });
            return rule;
        },

        delete(id: string): void {
            deleteRule.run(id);
        },
    };
}

export type BlockRuleRepository = ReturnType<typeof createBlockRuleRepository>;
