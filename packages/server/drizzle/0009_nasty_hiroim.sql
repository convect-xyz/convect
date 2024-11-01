ALTER TABLE "web_producer" ALTER COLUMN "chain_id" SET DATA TYPE integer USING (chain_id::integer);
