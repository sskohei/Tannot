PRAGMA foreign_keys = ON;

-- Better Auth 1.7 scopes OAuth account identities by issuer.
ALTER TABLE account ADD COLUMN issuer TEXT;

-- Preserve any existing Google accounts if this migration is applied after
-- accounts have already been created. New accounts receive this value from
-- Better Auth directly.
UPDATE account
SET issuer = CASE
  WHEN providerId = 'google' THEN 'https://accounts.google.com'
  ELSE 'local:oauth:' || providerId
END
WHERE issuer IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS account_issuer_accountId_idx
  ON account(issuer, accountId);
