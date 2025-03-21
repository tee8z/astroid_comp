use anyhow::anyhow;
use nostr_sdk::secp256k1::SecretKey;
use pem_rfc7468::{decode_vec, encode_string};
use rand::{rngs::ThreadRng, thread_rng};
use std::{
    fs::{metadata, File},
    io::{Read, Write},
    path::Path,
};

pub trait SecretKeyHandler: Sized {
    fn new(rng: &mut ThreadRng) -> Self;
    fn from_slice(data: &[u8]) -> Result<Self, anyhow::Error>;
    fn secret_bytes(&self) -> [u8; 32];
}

impl SecretKeyHandler for SecretKey {
    fn new(rng: &mut ThreadRng) -> Self {
        SecretKey::new(rng)
    }

    fn from_slice(data: &[u8]) -> Result<Self, anyhow::Error> {
        SecretKey::from_slice(data).map_err(|e| anyhow!(e))
    }

    fn secret_bytes(&self) -> [u8; 32] {
        self.secret_bytes()
    }
}

pub fn get_key<T: SecretKeyHandler>(file_path: &str) -> Result<T, anyhow::Error> {
    if !is_pem_file(file_path) {
        return Err(anyhow!("Not a '.pem' file extension"));
    }

    if metadata(file_path).is_ok() {
        read_key(file_path)
    } else {
        let key = generate_new_key();
        save_key(file_path, &key)?;
        Ok(key)
    }
}

fn generate_new_key<T: SecretKeyHandler>() -> T {
    T::new(&mut thread_rng())
}

fn is_pem_file(file_path: &str) -> bool {
    Path::new(file_path)
        .extension()
        .and_then(|s| s.to_str())
        .map_or(false, |ext| ext == "pem")
}

fn read_key<T: SecretKeyHandler>(file_path: &str) -> Result<T, anyhow::Error> {
    let mut file = File::open(file_path)?;
    let mut pem_data = String::new();
    file.read_to_string(&mut pem_data)?;

    let (label, decoded_key) = decode_vec(pem_data.as_bytes()).map_err(|e| anyhow!(e))?;

    if label != "EC PRIVATE KEY" {
        return Err(anyhow!("Invalid key format"));
    }

    T::from_slice(&decoded_key)
}

fn save_key<T: SecretKeyHandler>(file_path: &str, key: &T) -> Result<(), anyhow::Error> {
    let pem = encode_string(
        "EC PRIVATE KEY",
        pem_rfc7468::LineEnding::LF,
        &key.secret_bytes(),
    )
    .map_err(|e| anyhow!("Failed to encode key: {}", e))?;

    let mut file = File::create(file_path)?;
    file.write_all(pem.as_bytes())?;
    Ok(())
}
