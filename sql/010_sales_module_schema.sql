    -- =====================================================
    -- ITAD ERP Guatemala - Módulo de Ventas y Remarketing
    -- Versión: 010
    -- Fecha: 2025-12-03
    -- Descripción: Tablas para POS serializado, órdenes de venta
    --              y gestión de garantías
    -- Ejecutar en: Supabase SQL Editor
    -- =====================================================

    -- =====================================================
    -- PARTE 1: ENUM PARA ESTADOS DE VENTA
    -- =====================================================

    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_order_status') THEN
            CREATE TYPE sales_order_status AS ENUM (
                'draft',
                'confirmed', 
                'paid',
                'shipped',
                'delivered',
                'cancelled'
            );
            RAISE NOTICE 'ENUM sales_order_status creado';
        END IF;
    END$$;

    -- =====================================================
    -- PARTE 2: TABLA SALES_ORDERS (Órdenes de Venta)
    -- =====================================================

    CREATE TABLE IF NOT EXISTS sales_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Identificador legible
        order_number TEXT NOT NULL UNIQUE,
        
        -- Cliente
        customer_id UUID NOT NULL REFERENCES crm_entities(id) ON DELETE RESTRICT,
        
        -- Estado y tipo
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled')),
        order_type TEXT DEFAULT 'sale' CHECK (order_type IN ('sale', 'consignment', 'return')),
        
        -- Financiero
        subtotal NUMERIC(12,2) DEFAULT 0,
        discount_amount NUMERIC(12,2) DEFAULT 0,
        tax_amount NUMERIC(12,2) DEFAULT 0,
        total_amount NUMERIC(12,2) DEFAULT 0,
        currency TEXT DEFAULT 'GTQ',
        
        -- Pago
        payment_method TEXT,
        payment_reference TEXT,
        paid_at TIMESTAMPTZ,
        
        -- Garantía
        warranty_days INTEGER DEFAULT 30,
        warranty_terms TEXT,
        
        -- Envío
        shipping_address TEXT,
        shipping_method TEXT,
        shipping_cost NUMERIC(10,2) DEFAULT 0,
        shipped_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        tracking_number TEXT,
        
        -- Facturación
        invoice_number TEXT,
        invoice_date DATE,
        invoice_url TEXT,
        
        -- Notas
        internal_notes TEXT,
        customer_notes TEXT,
        
        -- Vendedor
        sales_rep_id UUID REFERENCES profiles(id),
        approved_by UUID REFERENCES profiles(id),
        approved_at TIMESTAMPTZ,
        
        -- Auditoría
        created_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- PARTE 3: TABLA SALES_ORDER_ITEMS (Líneas de Venta)
    -- =====================================================

    CREATE TABLE IF NOT EXISTS sales_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Relación con orden
        order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        
        -- Activo vendido (serial específico)
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
        
        -- Descripción (snapshot al momento de venta)
        product_description TEXT NOT NULL,
        serial_number TEXT,
        condition_grade TEXT,
        
        -- Precios
        list_price NUMERIC(10,2) NOT NULL,       -- Precio de lista
        unit_price NUMERIC(10,2) NOT NULL,       -- Precio final (puede tener descuento)
        discount_percent NUMERIC(5,2) DEFAULT 0,
        
        -- Garantía específica del item
        warranty_days INTEGER,
        warranty_start_date DATE,
        warranty_end_date DATE,
        warranty_certificate_url TEXT,
        
        -- Notas
        notes TEXT,
        
        -- Auditoría
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- PARTE 4: TABLA PRICE_LIST (Lista de Precios)
    -- =====================================================

    CREATE TABLE IF NOT EXISTS price_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Identificación del producto
        manufacturer TEXT NOT NULL,
        model TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        condition_grade TEXT NOT NULL CHECK (condition_grade IN ('Grade A', 'Grade B', 'Grade C', 'Scrap')),
        
        -- Precios
        cost_price NUMERIC(10,2),           -- Costo de adquisición promedio
        list_price NUMERIC(10,2) NOT NULL,  -- Precio de lista
        min_price NUMERIC(10,2),            -- Precio mínimo permitido
        
        -- Margen
        margin_percent NUMERIC(5,2),
        
        -- Vigencia
        effective_from DATE DEFAULT CURRENT_DATE,
        effective_to DATE,
        
        -- Control
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- Único por combinación
        UNIQUE(manufacturer, model, asset_type, condition_grade, effective_from)
    );

    -- =====================================================
    -- PARTE 5: COLUMNAS ADICIONALES EN ASSETS
    -- =====================================================

    -- Agregar campos de venta si no existen
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS sold_to UUID REFERENCES crm_entities(id);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS sold_by UUID REFERENCES profiles(id);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS sale_order_id UUID REFERENCES sales_orders(id);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS warranty_end_date DATE;

    -- =====================================================
    -- PARTE 6: ÍNDICES
    -- =====================================================

    -- sales_orders
    CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON sales_orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_order_number ON sales_orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_rep ON sales_orders(sales_rep_id);

    -- sales_order_items
    CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_sales_order_items_asset ON sales_order_items(asset_id);

    -- price_list
    CREATE INDEX IF NOT EXISTS idx_price_list_product ON price_list(manufacturer, model, asset_type);
    CREATE INDEX IF NOT EXISTS idx_price_list_active ON price_list(is_active) WHERE is_active = TRUE;

    -- assets (venta)
    CREATE INDEX IF NOT EXISTS idx_assets_sold_to ON assets(sold_to);
    CREATE INDEX IF NOT EXISTS idx_assets_sale_order ON assets(sale_order_id);

    -- =====================================================
    -- PARTE 7: TRIGGERS
    -- =====================================================

    -- Trigger para actualizar updated_at
    CREATE OR REPLACE FUNCTION update_sales_order_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS sales_orders_updated_at ON sales_orders;
    CREATE TRIGGER sales_orders_updated_at
        BEFORE UPDATE ON sales_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_sales_order_timestamp();

    -- Trigger para generar order_number
    CREATE OR REPLACE FUNCTION generate_order_number()
    RETURNS TRIGGER AS $$
    DECLARE
        year_prefix TEXT;
        seq_num INTEGER;
    BEGIN
        year_prefix := TO_CHAR(NOW(), 'YYYY');
        
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(order_number FROM 'SO-' || year_prefix || '-(\d+)') AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM sales_orders
        WHERE order_number LIKE 'SO-' || year_prefix || '-%';
        
        NEW.order_number := 'SO-' || year_prefix || '-' || LPAD(seq_num::TEXT, 5, '0');
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS sales_orders_generate_number ON sales_orders;
    CREATE TRIGGER sales_orders_generate_number
        BEFORE INSERT ON sales_orders
        FOR EACH ROW
        WHEN (NEW.order_number IS NULL)
        EXECUTE FUNCTION generate_order_number();

    -- =====================================================
    -- PARTE 8: RLS (Row Level Security)
    -- =====================================================

    ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;

    -- Políticas permisivas para usuarios autenticados
    DROP POLICY IF EXISTS "sales_orders_all" ON sales_orders;
    CREATE POLICY "sales_orders_all" ON sales_orders 
        FOR ALL TO authenticated 
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "sales_order_items_all" ON sales_order_items;
    CREATE POLICY "sales_order_items_all" ON sales_order_items 
        FOR ALL TO authenticated 
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "price_list_all" ON price_list;
    CREATE POLICY "price_list_all" ON price_list 
        FOR ALL TO authenticated 
        USING (true) WITH CHECK (true);

    -- =====================================================
    -- PARTE 9: FUNCIÓN RPC PARA CONFIRMAR VENTA
    -- =====================================================

    CREATE OR REPLACE FUNCTION confirm_sale(
        p_order_id UUID,
        p_confirmed_by UUID
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_order RECORD;
        v_item RECORD;
        v_warranty_end DATE;
    BEGIN
        -- Obtener orden
        SELECT * INTO v_order FROM sales_orders WHERE id = p_order_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Orden no encontrada');
        END IF;
        
        IF v_order.status != 'draft' THEN
            RETURN jsonb_build_object('success', false, 'error', 'La orden ya fue procesada');
        END IF;
        
        -- Calcular fecha fin de garantía
        v_warranty_end := CURRENT_DATE + (v_order.warranty_days || ' days')::INTERVAL;
        
        -- Actualizar cada activo vendido
        FOR v_item IN SELECT * FROM sales_order_items WHERE order_id = p_order_id
        LOOP
            -- Actualizar activo
            UPDATE assets SET
                status = 'sold',
                sold_to = v_order.customer_id,
                sold_at = NOW(),
                sold_by = p_confirmed_by,
                sale_order_id = p_order_id,
                warranty_end_date = v_warranty_end,
                updated_at = NOW()
            WHERE id = v_item.asset_id;
            
            -- Actualizar item con fechas de garantía
            UPDATE sales_order_items SET
                warranty_start_date = CURRENT_DATE,
                warranty_end_date = v_warranty_end
            WHERE id = v_item.id;
        END LOOP;
        
        -- Confirmar orden
        UPDATE sales_orders SET
            status = 'confirmed',
            approved_by = p_confirmed_by,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = p_order_id;
        
        -- Log de auditoría
        INSERT INTO audit_logs (
            table_name, record_id, action, 
            new_data, performed_by
        ) VALUES (
            'sales_orders', p_order_id, 'SALE_CONFIRMED',
            jsonb_build_object(
                'order_number', v_order.order_number,
                'customer_id', v_order.customer_id,
                'total_amount', v_order.total_amount,
                'items_count', (SELECT COUNT(*) FROM sales_order_items WHERE order_id = p_order_id)
            ),
            p_confirmed_by
        );
        
        RETURN jsonb_build_object(
            'success', true, 
            'order_number', v_order.order_number,
            'warranty_end', v_warranty_end
        );
    END;
    $$;

    -- =====================================================
    -- PARTE 10: VISTA DE STOCK DISPONIBLE PARA VENTA
    -- =====================================================

    CREATE OR REPLACE VIEW available_stock_for_sale AS
    SELECT 
        a.manufacturer,
        a.model,
        a.asset_type,
        a.condition::TEXT AS condition_grade,
        COUNT(*) AS available_count,
        ARRAY_AGG(a.id ORDER BY a.created_at) AS asset_ids,
        ARRAY_AGG(a.serial_number ORDER BY a.created_at) AS serials,
        AVG(a.cost_amount)::NUMERIC(10,2) AS avg_cost,
        COALESCE(
            (SELECT pl.list_price FROM price_list pl 
            WHERE pl.manufacturer = a.manufacturer 
            AND pl.model = a.model 
            AND pl.asset_type = a.asset_type
            AND pl.condition_grade = a.condition::TEXT
            AND pl.is_active = TRUE
            AND (pl.effective_to IS NULL OR pl.effective_to >= CURRENT_DATE)
            ORDER BY pl.effective_from DESC LIMIT 1
            ), 0
        ) AS suggested_price
    FROM assets a
    WHERE a.status = 'ready_for_sale'
    GROUP BY a.manufacturer, a.model, a.asset_type, a.condition
    ORDER BY a.manufacturer, a.model, available_count DESC;

    -- =====================================================
    -- VERIFICACIÓN
    -- =====================================================

    SELECT 'Módulo de Ventas creado correctamente' AS status;

    -- =====================================================
    -- RESUMEN DE TABLAS CREADAS:
    -- ✅ sales_orders - Órdenes de venta
    -- ✅ sales_order_items - Líneas de venta (seriales)
    -- ✅ price_list - Lista de precios por modelo/grado
    -- ✅ available_stock_for_sale - Vista de stock disponible
    -- ✅ confirm_sale() - Función RPC transaccional
    -- =====================================================

