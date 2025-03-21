use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Balance {
    pub id: String,
    pub wallet_id: String,
    pub effective_time: String,
    pub available: i64,
    pub total: i64,
    pub network: Network,
    pub currency: Currency,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Network {
    #[serde(rename = "mainnet")]
    Mainnet,
    #[serde(rename = "testnet")]
    Testnet,
    #[serde(rename = "signet")]
    Signet,
    #[serde(rename = "mutinynet")]
    Mutinynet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Currency {
    #[serde(rename = "btc")]
    Btc,
    #[serde(rename = "usd")]
    Usd,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PaymentDirection {
    #[serde(rename = "send")]
    Send,
    #[serde(rename = "receive")]
    Receive,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PaymentKind {
    #[serde(rename = "bolt11")]
    Bolt11,
    #[serde(rename = "onchain")]
    Onchain,
    #[serde(rename = "bip21")]
    Bip21,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PaymentStatus {
    #[serde(rename = "sending")]
    Sending,
    #[serde(rename = "receiving")]
    Receiving,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
}

// Request models
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceivePaymentRequest {
    pub id: String,
    pub wallet_id: String,
    pub currency: Currency,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount_msats: Option<i64>,
    pub payment_kind: PaymentKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

// Response models for bolt11 receive payments
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bolt11ReceiveData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_request: Option<String>,
    pub amount_msats: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceivePayment {
    pub id: String,
    pub wallet_id: String,
    pub organization_id: String,
    pub environment_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub currency: Currency,
    pub status: PaymentStatus,
    #[serde(rename = "type")]
    pub payment_type: PaymentKind,
    pub direction: PaymentDirection,
    pub data: Bolt11ReceiveData,
    pub error: Option<ReceiveError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiveError {
    pub detail: Option<String>,
    #[serde(rename = "type")]
    pub error_type: String,
}

// Send payment models
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendPaymentRequest {
    pub id: String,
    pub wallet_id: String,
    pub currency: Currency,
    #[serde(rename = "type")]
    pub payment_type: PaymentKind,
    pub data: SendPaymentData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendPaymentData {
    pub payment_request: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount_msats: Option<i64>,
    pub max_fee_msats: i64,
}

// Response models for Lightning payments
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Payment {
    pub id: String,
    pub wallet_id: String,
    pub organization_id: String,
    pub environment_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub currency: Currency,
    pub status: PaymentStatus,
    #[serde(rename = "type")]
    pub payment_type: PaymentKind,
    pub direction: PaymentDirection,
    pub data: serde_json::Value, // Using Value to handle different types
    pub error: Option<serde_json::Value>,
}

// Custom error type for the Lightning service
#[derive(Debug, thiserror::Error)]
pub enum LightningError {
    #[error("HTTP request error: {0}")]
    RequestError(#[from] reqwest_middleware::Error),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("Payment error: {0}")]
    PaymentError(String),

    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    #[error("Payment not found: {0}")]
    PaymentNotFound(String),

    #[error("Payment in invalid state: {0}")]
    InvalidPaymentState(String),

    #[error("Timeout waiting for payment: {0}")]
    PaymentTimeout(String),
}

impl From<LightningError> for crate::domain::Error {
    fn from(err: LightningError) -> Self {
        match err {
            LightningError::PaymentNotFound(msg) => crate::domain::Error::NotFound(msg),
            LightningError::InvalidPaymentState(msg) => crate::domain::Error::InvalidInput(msg),
            LightningError::PaymentTimeout(msg) => crate::domain::Error::InvalidInput(msg),
            _ => crate::domain::Error::Authentication(err.to_string()), // Using Authentication as a generic error type
        }
    }
}
