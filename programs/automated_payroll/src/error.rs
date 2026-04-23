use anchor_lang::prelude::*;

#[error_code]
pub enum PayrollError {
    #[msg("Custom error message")]
    CustomError,
    #[msg("The payment is not due yet.")]
    PaymentNotDue,
}
