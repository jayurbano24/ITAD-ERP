-- Enable RLS on assets if not already enabled (idempotent usually, but good to ensure)
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create policy for Logistics and other roles to view ALL assets
-- We use a DO block to avoid error if policy already exists, or we can just DROP IF EXISTS
DROP POLICY IF EXISTS "Enable read access for internal users" ON assets;
DROP POLICY IF EXISTS "Logistics view all assets" ON assets;

CREATE POLICY "Enable read access for internal users"
ON assets
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'account_manager', 'logistics', 'tech_lead', 'sales_agent')
    )
  )
);

-- Ensure warehouses are visible too
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON warehouses;

CREATE POLICY "Enable read access for authenticated users"
ON warehouses
FOR SELECT
USING (
  auth.role() = 'authenticated'
);
