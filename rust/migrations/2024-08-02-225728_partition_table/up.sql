CREATE TABLE processed_transactions_temp (
  id SERIAL NOT NULL,
  handler_id VARCHAR(255) NOT NULL,
  handler_version VARCHAR(255) NOT NULL,
  transaction_hash VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  status VARCHAR(7) CHECK(status IN ('FAILED', 'SUCCESS')) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  batch_id VARCHAR(255) DEFAULT '',
  CONSTRAINT processed_transactions_temp_pkey PRIMARY KEY (id, handler_id, handler_version)
) PARTITION BY HASH (handler_id, handler_version);

  -- Create partitions
CREATE TABLE public.processed_transactions_temp_p00 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 0);

CREATE TABLE public.processed_transactions_temp_p01 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 1);

CREATE TABLE public.processed_transactions_temp_p02 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 2);

CREATE TABLE public.processed_transactions_temp_p03 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 3);

CREATE TABLE public.processed_transactions_temp_p04 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 4);

CREATE TABLE public.processed_transactions_temp_p05 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 5);

CREATE TABLE public.processed_transactions_temp_p06 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 6);

CREATE TABLE public.processed_transactions_temp_p07 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 7);

CREATE TABLE public.processed_transactions_temp_p08 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 8);

CREATE TABLE public.processed_transactions_temp_p09 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 9);

CREATE TABLE public.processed_transactions_temp_p10 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 10);

CREATE TABLE public.processed_transactions_temp_p11 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 11);

CREATE TABLE public.processed_transactions_temp_p12 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 12);

CREATE TABLE public.processed_transactions_temp_p13 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 13);

CREATE TABLE public.processed_transactions_temp_p14 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 14);

CREATE TABLE public.processed_transactions_temp_p15 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 15);

CREATE TABLE public.processed_transactions_temp_p16 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 16);

CREATE TABLE public.processed_transactions_temp_p17 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 17);

CREATE TABLE public.processed_transactions_temp_p18 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 18);

CREATE TABLE public.processed_transactions_temp_p19 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 19);

CREATE TABLE public.processed_transactions_temp_p20 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 20);

CREATE TABLE public.processed_transactions_temp_p21 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 21);

CREATE TABLE public.processed_transactions_temp_p22 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 22);

CREATE TABLE public.processed_transactions_temp_p23 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 23);

CREATE TABLE public.processed_transactions_temp_p24 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 24);

CREATE TABLE public.processed_transactions_temp_p25 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 25);

CREATE TABLE public.processed_transactions_temp_p26 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 26);

CREATE TABLE public.processed_transactions_temp_p27 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 27);

CREATE TABLE public.processed_transactions_temp_p28 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 28);

CREATE TABLE public.processed_transactions_temp_p29 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 29);

CREATE TABLE public.processed_transactions_temp_p30 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 30);

CREATE TABLE public.processed_transactions_temp_p31 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 31);

CREATE TABLE public.processed_transactions_temp_p32 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 32);

CREATE TABLE public.processed_transactions_temp_p33 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 33);

CREATE TABLE public.processed_transactions_temp_p34 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 34);

CREATE TABLE public.processed_transactions_temp_p35 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 35);

CREATE TABLE public.processed_transactions_temp_p36 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 36);

CREATE TABLE public.processed_transactions_temp_p37 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 37);

CREATE TABLE public.processed_transactions_temp_p38 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 38);

CREATE TABLE public.processed_transactions_temp_p39 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 39);

CREATE TABLE public.processed_transactions_temp_p40 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 40);

CREATE TABLE public.processed_transactions_temp_p41 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 41);

CREATE TABLE public.processed_transactions_temp_p42 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 42);

CREATE TABLE public.processed_transactions_temp_p43 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 43);

CREATE TABLE public.processed_transactions_temp_p44 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 44);

CREATE TABLE public.processed_transactions_temp_p45 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 45);

CREATE TABLE public.processed_transactions_temp_p46 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 46);

CREATE TABLE public.processed_transactions_temp_p47 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 47);

CREATE TABLE public.processed_transactions_temp_p48 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 48);

CREATE TABLE public.processed_transactions_temp_p49 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 49);

CREATE TABLE public.processed_transactions_temp_p50 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 50);

CREATE TABLE public.processed_transactions_temp_p51 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 51);

CREATE TABLE public.processed_transactions_temp_p52 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 52);

CREATE TABLE public.processed_transactions_temp_p53 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 53);

CREATE TABLE public.processed_transactions_temp_p54 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 54);

CREATE TABLE public.processed_transactions_temp_p55 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 55);

CREATE TABLE public.processed_transactions_temp_p56 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 56);

CREATE TABLE public.processed_transactions_temp_p57 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 57);

CREATE TABLE public.processed_transactions_temp_p58 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 58);

CREATE TABLE public.processed_transactions_temp_p59 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 59);

CREATE TABLE public.processed_transactions_temp_p60 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 60);

CREATE TABLE public.processed_transactions_temp_p61 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 61);

CREATE TABLE public.processed_transactions_temp_p62 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 62);

CREATE TABLE public.processed_transactions_temp_p63 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 63);

CREATE TABLE public.processed_transactions_temp_p64 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 64);

CREATE TABLE public.processed_transactions_temp_p65 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 65);

CREATE TABLE public.processed_transactions_temp_p66 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 66);

CREATE TABLE public.processed_transactions_temp_p67 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 67);

CREATE TABLE public.processed_transactions_temp_p68 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 68);

CREATE TABLE public.processed_transactions_temp_p69 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 69);

CREATE TABLE public.processed_transactions_temp_p70 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 70);

CREATE TABLE public.processed_transactions_temp_p71 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 71);

CREATE TABLE public.processed_transactions_temp_p72 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 72);

CREATE TABLE public.processed_transactions_temp_p73 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 73);

CREATE TABLE public.processed_transactions_temp_p74 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 74);

CREATE TABLE public.processed_transactions_temp_p75 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 75);

CREATE TABLE public.processed_transactions_temp_p76 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 76);

CREATE TABLE public.processed_transactions_temp_p77 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 77);

CREATE TABLE public.processed_transactions_temp_p78 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 78);

CREATE TABLE public.processed_transactions_temp_p79 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 79);

CREATE TABLE public.processed_transactions_temp_p80 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 80);

CREATE TABLE public.processed_transactions_temp_p81 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 81);

CREATE TABLE public.processed_transactions_temp_p82 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 82);

CREATE TABLE public.processed_transactions_temp_p83 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 83);

CREATE TABLE public.processed_transactions_temp_p84 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 84);

CREATE TABLE public.processed_transactions_temp_p85 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 85);

CREATE TABLE public.processed_transactions_temp_p86 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 86);

CREATE TABLE public.processed_transactions_temp_p87 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 87);

CREATE TABLE public.processed_transactions_temp_p88 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 88);

CREATE TABLE public.processed_transactions_temp_p89 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 89);

CREATE TABLE public.processed_transactions_temp_p90 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 90);

CREATE TABLE public.processed_transactions_temp_p91 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 91);

CREATE TABLE public.processed_transactions_temp_p92 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 92);

CREATE TABLE public.processed_transactions_temp_p93 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 93);

CREATE TABLE public.processed_transactions_temp_p94 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 94);

CREATE TABLE public.processed_transactions_temp_p95 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 95);

CREATE TABLE public.processed_transactions_temp_p96 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 96);

CREATE TABLE public.processed_transactions_temp_p97 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 97);

CREATE TABLE public.processed_transactions_temp_p98 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 98);

CREATE TABLE public.processed_transactions_temp_p99 PARTITION OF public.processed_transactions_temp
    FOR VALUES WITH (MODULUS 100, REMAINDER 99);


-- Create indices
DO $$
DECLARE
    partition RECORD;
BEGIN
    FOR partition IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'processed_transactions_temp_p%'
    LOOP
        EXECUTE format(
            'CREATE INDEX idx_handler_id_version_%s ON %I (handler_id, handler_version);',
            partition.tablename,
            partition.tablename
        );
    END LOOP;
END $$;

INSERT INTO public.processed_transactions_temp (
    id,
    handler_id,
    handler_version,
    transaction_hash,
    "label",
    status,
    "timestamp",
    batch_id
)
SELECT
    id,
    handler_id,
    handler_version,
    transaction_hash,
    "label",
    status,
    "timestamp",
    batch_id
FROM public.processed_transactions;
 
ALTER TABLE processed_transactions RENAME TO processed_transactions_old;
ALTER TABLE processed_transactions_temp RENAME TO processed_transactions;
