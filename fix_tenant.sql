UPDATE tenants SET 
  plan = 'pro',
  can_broadcast = true,
  can_schedule = true,
  can_attach_images = true,
  can_export_data = true,
  can_use_api = true,
  max_accounts = 10,
  max_auto_reply_rules = 100,
  max_reply_macros = 50,
  monthly_message_limit = 50000,
  monthly_auto_reply_limit = 50000,
  cooldown_minimum_minutes = 0,
  subscription_status = 'active'
WHERE phone = '+18705212329';
