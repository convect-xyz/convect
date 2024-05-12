use lambda_extension::Error;
use regex::Regex;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let record = "2024-05-09T16:21:23.573Z 668809f4-e221-5f81-8126-57421812b6c5 INFO Log message with newline \n and special characters...";

    let re = Regex::new(r"(?x)^(?P<time>[\d\-T:.Z]+)\s+(?P<uuid>[a-f0-9\-]+)\s+(?P<log_level>[A-Z]+)\s+(?P<log_message>[\s\S]+)$").unwrap();
    let captures = re.captures(&record).unwrap();

    println!(
        "{:?}",
        serde_json::to_string(&json!({
            "time": captures["time"].to_string(),
            "invocation_id": captures["uuid"].to_string(),
            "log_level": captures["log_level"].to_string(),
            "log_message": captures["log_message"].to_string(),
        }))
        .unwrap()
    );

    Ok(())
}
