-- Append a random 4-char suffix (unambiguous alphabet, no 0/O/1/I/L) to order
-- numbers so they are not enumerable — e.g. O-2026-0040-K7QX. The sequence part
-- stays for human reference; access is still enforced by buyer ownership.
CREATE OR REPLACE FUNCTION next_order_number() RETURNS TEXT AS $$
DECLARE
    yr INT := EXTRACT(YEAR FROM now());
    seq INT;
    suffix TEXT := '';
    alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
BEGIN
    INSERT INTO order_number_sequence(year, last_number) VALUES (yr, 1)
    ON CONFLICT (year) DO UPDATE SET last_number = order_number_sequence.last_number + 1
    RETURNING last_number INTO seq;
    FOR i IN 1..4 LOOP
        suffix := suffix || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    END LOOP;
    RETURN 'O-' || yr::text || '-' || lpad(seq::text, 4, '0') || '-' || suffix;
END;
$$ LANGUAGE plpgsql;
