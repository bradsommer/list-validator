-- Add object_types column to account_rules
-- object_types is an array of object types (contacts, companies, deals) that the rule applies to
-- If empty or null, the rule applies to all object types

ALTER TABLE account_rules
ADD COLUMN IF NOT EXISTS object_types TEXT[] DEFAULT ARRAY['contacts', 'companies', 'deals']::TEXT[];

-- Add object_types column to import_questions
-- object_types is an array of object types that the question applies to
-- If empty or null, the question appears for all object types

ALTER TABLE import_questions
ADD COLUMN IF NOT EXISTS object_types TEXT[] DEFAULT ARRAY['contacts', 'companies', 'deals']::TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN account_rules.object_types IS 'Array of object types (contacts, companies, deals) this rule applies to. Empty means all types.';
COMMENT ON COLUMN import_questions.object_types IS 'Array of object types (contacts, companies, deals) this question applies to. Empty means all types.';
