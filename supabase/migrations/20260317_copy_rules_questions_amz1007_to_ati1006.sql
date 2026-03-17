-- Copy all rules and questions from AMZ#1007 (account_number=1007)
-- to ATI#1006 (account_number=1006), replacing any existing ones.

DO $$
DECLARE
  source_account_id TEXT;
  target_account_id TEXT;
BEGIN
  -- Look up account UUIDs by account_number
  SELECT id::TEXT INTO source_account_id FROM accounts WHERE account_number = 1007;
  SELECT id::TEXT INTO target_account_id FROM accounts WHERE account_number = 1006;

  IF source_account_id IS NULL THEN
    RAISE EXCEPTION 'Source account with account_number 1007 not found';
  END IF;
  IF target_account_id IS NULL THEN
    RAISE EXCEPTION 'Target account with account_number 1006 not found';
  END IF;

  -- Delete existing rules for ATI#1006
  DELETE FROM account_rules WHERE account_id = target_account_id;

  -- Copy rules from AMZ#1007 to ATI#1006
  INSERT INTO account_rules (account_id, rule_id, enabled, name, description, rule_type, target_fields, config, display_order, source_code)
  SELECT target_account_id, rule_id, enabled, name, description, rule_type, target_fields, config, display_order, source_code
  FROM account_rules
  WHERE account_id = source_account_id;

  -- Delete existing questions for ATI#1006
  DELETE FROM import_questions WHERE account_id = target_account_id;

  -- Copy questions from AMZ#1007 to ATI#1006
  INSERT INTO import_questions (account_id, question_text, column_header, question_type, options, option_values, object_types, default_value, is_required, display_order, enabled)
  SELECT target_account_id, question_text, column_header, question_type, options, option_values, object_types, default_value, is_required, display_order, enabled
  FROM import_questions
  WHERE account_id = source_account_id;

  RAISE NOTICE 'Copied rules and questions from account % (AMZ#1007) to account % (ATI#1006)', source_account_id, target_account_id;
END $$;
