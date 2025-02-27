use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct BlockConfig {
    pub id: String,
    pub start_block: u64,
    pub end_block: u64,
}

pub fn get_block_configs(
    mut start_block: u64,
    end_block: u64,
    batch_size: u64,
) -> Vec<BlockConfig> {
    let mut result = Vec::new();

    while start_block <= end_block {
        let next_end_block = (start_block + batch_size).min(end_block);
        result.push(BlockConfig {
            id: uuid::Uuid::new_v4().to_string(),
            start_block,
            end_block: next_end_block,
        });
        start_block = next_end_block + 1;
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_block_configs() {
        let actual_block_configs = get_block_configs(0u64, 200u64, 49u64);

        assert_eq!(
            actual_block_configs
                .into_iter()
                .map(|c| (c.start_block, c.end_block))
                .collect::<Vec<(u64, u64)>>(),
            vec![(0, 49), (50, 99), (100, 149), (150, 199), (200, 200)]
        );
    }
}
