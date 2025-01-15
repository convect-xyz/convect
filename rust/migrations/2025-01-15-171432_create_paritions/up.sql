-- Create partitions
CREATE TABLE public.eth_transaction_p00 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 0);

CREATE TABLE public.eth_transaction_p01 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 1);

CREATE TABLE public.eth_transaction_p02 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 2);

CREATE TABLE public.eth_transaction_p03 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 3);

CREATE TABLE public.eth_transaction_p04 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 4);

CREATE TABLE public.eth_transaction_p05 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 5);

CREATE TABLE public.eth_transaction_p06 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 6);

CREATE TABLE public.eth_transaction_p07 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 7);

CREATE TABLE public.eth_transaction_p08 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 8);

CREATE TABLE public.eth_transaction_p09 PARTITION OF public.eth_transaction
    FOR VALUES WITH (MODULUS 10, REMAINDER 9);
