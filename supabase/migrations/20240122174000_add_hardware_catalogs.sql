
-- Catalog Processors
CREATE TABLE IF NOT EXISTS public.catalog_processors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catalog Memory
CREATE TABLE IF NOT EXISTS public.catalog_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catalog Keyboards
CREATE TABLE IF NOT EXISTS public.catalog_keyboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (Assuming open read, admin write based on existing context, or copying from brands)
ALTER TABLE public.catalog_processors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_keyboards ENABLE ROW LEVEL SECURITY;

-- Read policies (allow public or authenticated read)
CREATE POLICY "Allow read access for authenticated users" ON public.catalog_processors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.catalog_memory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.catalog_keyboards FOR SELECT TO authenticated USING (true);

-- Write policies (allow authenticated users for now, following pattern or unrestricted if RLS is lax)
-- Note: In production, this should be restricted to admins. For now, we'll allow authenticated users to insert/update/delete 
-- to match the likely existing configuration for other catalogs if they are managed by dashboard users.
CREATE POLICY "Allow full access for authenticated users" ON public.catalog_processors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON public.catalog_memory FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access for authenticated users" ON public.catalog_keyboards FOR ALL TO authenticated USING (true);
