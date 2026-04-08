ALTER TABLE notification_prefs
ADD COLUMN report_ready_email_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN notification_prefs.report_ready_email_enabled IS
  'Whether to send an email when a report finishes processing';
