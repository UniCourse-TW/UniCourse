use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use unicourse_catalog::MIGRATOR;
use unicourse_ingest::{import, import_external_reviews, parse_external_reviews, parse_snapshot};

const USAGE: &str = "usage: unicourse-ingest <snapshot.json | directory> [...]\n       \
    unicourse-ingest --external-reviews <reviews.json | directory> [...]";

/// Expand a directory argument to the `*.json` files directly inside it, sorted by name.
fn snapshot_files(directory: &Path) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    for entry in std::fs::read_dir(directory)? {
        let path = entry?.path();
        if path
            .extension()
            .is_some_and(|extension| extension == "json")
            && path.is_file()
        {
            files.push(path);
        }
    }
    anyhow::ensure!(!files.is_empty(), "no *.json snapshots in directory");
    files.sort();
    Ok(files)
}

#[tokio::main]
async fn main() -> Result<()> {
    let mut arguments: Vec<_> = std::env::args_os().skip(1).collect();
    let external_reviews = arguments
        .first()
        .is_some_and(|first| first == "--external-reviews");
    if external_reviews {
        arguments.remove(0);
    }
    let arguments: Vec<_> = arguments.into_iter().map(PathBuf::from).collect();
    anyhow::ensure!(!arguments.is_empty(), USAGE);
    let database_url = std::env::var("DATABASE_URL").context("set DATABASE_URL")?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&database_url)
        .await?;
    MIGRATOR.run(&pool).await?;

    let mut failed = false;
    let mut paths = Vec::new();
    for argument in arguments {
        if argument.is_dir() {
            match snapshot_files(&argument) {
                Ok(files) => paths.extend(files),
                Err(error) => {
                    failed = true;
                    eprintln!("{}: {error:#}", argument.display());
                }
            }
        } else {
            paths.push(argument);
        }
    }

    for path in paths {
        let result = async {
            let bytes = tokio::fs::read(&path).await?;
            if external_reviews {
                let snapshot = parse_external_reviews(&bytes)?;
                let summary = import_external_reviews(&pool, &snapshot).await?;
                let rate = if summary.posts == 0 {
                    0.0
                } else {
                    100.0 * summary.matched as f64 / summary.posts as f64
                };
                Ok(format!(
                    "imported {} {} posts, {} matched to a course ({rate:.1}%), {} kept as live data",
                    summary.posts,
                    snapshot.board(),
                    summary.matched,
                    summary.skipped
                ))
            } else {
                let snapshot = parse_snapshot(&bytes)?;
                let count = import(&pool, &snapshot).await?;
                Ok::<_, anyhow::Error>(format!("imported {count} offerings"))
            }
        }
        .await;
        match result {
            Ok(message) => println!("{}: {message}", path.display()),
            Err(error) => {
                failed = true;
                eprintln!("{}: {error:#}", path.display());
            }
        }
    }

    anyhow::ensure!(
        !failed,
        "one or more snapshots failed; successful imports were kept"
    );
    Ok(())
}
