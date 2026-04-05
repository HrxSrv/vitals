-- Usage tracking for per-user monthly page limits

CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  report_id UUID,
  pages INT NOT NULL,
  month TEXT NOT NULL,  -- '2026-04' format for fast lookups
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_user_month ON usage(user_id, month);

COMMENT ON TABLE usage IS 'Tracks pages processed per user per month for quota enforcement';
