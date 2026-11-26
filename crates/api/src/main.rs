use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use unicourse_api::Config;
use unicourse_catalog::MIGRATOR;

#[tokio::main]
async fn main() -> Result<()> {
    let database_url = std::env::var("DATABASE_URL").context("set DATABASE_URL")?;
    let bind = std::env::var("API_BIND").unwrap_or_else(|_| "127.0.0.1:3001".into());
    let config = Config {
        cookie_secure: std::env::var("COOKIE_SECURE").is_ok_and(|value| value == "1"),
    };
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;
    // Accounts, sessions and the forum live in the same database as the catalog, so the API brings
    // the schema up to date itself instead of waiting for the next ingest run.
    MIGRATOR.run(&pool).await?;
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    println!("UniCourse API listening on {}", listener.local_addr()?);
    axum::serve(listener, unicourse_api::router_with(pool, config)).await?;
    Ok(())
}
