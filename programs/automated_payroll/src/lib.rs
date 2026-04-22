pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
// pub use state::*;

declare_id!("FhyRNpsvvtY3HB1jtubTAJnWwkPrhWysHAcKS3SekXZs");

#[program]
pub mod automated_payroll {
    use super::*;

    pub fn initialize_payroll(ctx: Context<InitializePayroll>, total_budget: u64) -> Result<()> {
        let payroll_config = &mut ctx.accounts.payroll_config;
        payroll_config.employer = ctx.accounts.employer.key();
        payroll_config.total_budget = total_budget;
        // Bump is stored to validate the PDA later
        payroll_config.bump = ctx.bumps.payroll_config;

        msg!(
            "Payroll initialized for employer: {:?}",
            payroll_config.employer
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePayroll<'info> {
    // The employer signing the transaction
    #[account(mut)]
    pub employer: Signer<'info>,

    // Creating the PDA for the Company Config
    // seeds: used to derive the address
    // payer: who pays the 'rent' for the account
    // space: 8 (discriminator) + 32 (pubkey) + 8 (u64) + 1 (u8)
    #[account(
        init,
        payer = employer,
        space = 8 + 32 + 8 + 1,
        seeds = [b"payroll_config", employer.key().as_ref()],
        bump
    )]
    pub payroll_config: Account<'info, PayrollConfig>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct PayrollConfig {
    pub employer: Pubkey,  // 32 bytes
    pub total_budget: u64, // 8 bytes
    pub bump: u8,          // 1 byte (for PDA)
}

#[account]
pub struct Employee {
    pub wallet: Pubkey, // 32 bytes
    pub salary: u64,    // 8 bytes
    pub last_paid: i64, // 8 bytes (Unix timestamp)
    pub interval: i64,  // 8 bytes (e.g., 30 days in seconds)
    pub bump: u8,       // 1 byte
}
