use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use unicourse_catalog::MIGRATOR;
use unicourse_ingest::{import, parse_snapshot};

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
    let arguments: Vec<_> = std::env::args_os().skip(1).map(PathBuf::from).collect();
    anyhow::ensure!(
        !arguments.is_empty(),
        "usage: unicourse-ingest <snapshot.json | directory> [...]"
    );
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
            let snapshot = parse_snapshot(&tokio::fs::read(&path).await?)?;
            import(&pool, &snapshot).await
        }
        .await;
        match result {
            Ok(count) => println!("{}: imported {count} offerings", path.display()),
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
