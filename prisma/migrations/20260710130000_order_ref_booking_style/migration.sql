-- Booking-reference-style order numbers (TSC-64): TVK- + 6 random chars from an
-- unambiguous alphabet (no 0/O/1/I/L) → e.g. TVK-K7QMX9. Short, mixed, readable,
-- non-sequential (no volume leak), collision-safe via a uniqueness retry.
CREATE OR REPLACE FUNCTION next_order_number() RETURNS TEXT AS $$
DECLARE
    alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    code TEXT;
    candidate TEXT;
    attempts INT := 0;
BEGIN
    LOOP
        code := '';
        FOR i IN 1..6 LOOP
            code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
        END LOOP;
        candidate := 'TVK-' || code;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM order_requests WHERE order_number = candidate);
        attempts := attempts + 1;
        IF attempts > 20 THEN
            RAISE EXCEPTION 'Could not generate a unique order number after 20 attempts';
        END IF;
    END LOOP;
    RETURN candidate;
END;
$$ LANGUAGE plpgsql;
