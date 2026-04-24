/*
 * 💸 Automated Blockchain Payroll DApp
 * Author: Ko Thiha Aung (https://www.linkedin.com/in/kothihaaung/)
 * License: Polyform Noncommercial License 1.0.0
 * For showcasing and learning purposes only. Commercial use requires compensation.
 */

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use crate::error::*;

pub use constants::*;
pub use instructions::*;

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

    // Add an Employee to the system
    pub fn add_employee(ctx: Context<AddEmployee>, salary: u64, interval: i64) -> Result<()> {
        let employee_account = &mut ctx.accounts.employee_pda;
        employee_account.employer = ctx.accounts.employer.key();
        employee_account.wallet = ctx.accounts.employee_wallet.key();
        employee_account.salary = salary;
        employee_account.interval = interval;
        employee_account.last_paid = Clock::get()?.unix_timestamp;
        employee_account.bump = ctx.bumps.employee_pda;

        msg!("Employee added: {:?}", employee_account.wallet);
        Ok(())
    }

    // Disburse payment to employee
    pub fn disburse_payment(ctx: Context<DisbursePayment>) -> Result<()> {
        let employee = &mut ctx.accounts.employee_pda;
        let clock = Clock::get()?;

        // 1. Logic Check: Is it time to pay?
        let next_pay_date = employee.last_paid + employee.interval;
        require!(
            clock.unix_timestamp >= next_pay_date,
            PayrollError::PaymentNotDue
        );

        // 2. Calculate payment
        let amount = employee.salary;

        // 3. Transfer SOL from Vault PDA to Employee Wallet
        // We "invoke" a transfer from our program-owned PDA
        **ctx
            .accounts
            .vault_pda
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .employee_wallet
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        // 4. Update State
        employee.last_paid = clock.unix_timestamp;

        msg!(
            "Payment of {} lamports sent to {:?}",
            amount,
            employee.wallet
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

    #[account(
        init,
        payer = employer,
        space = 8,
        seeds = [b"vault", employer.key().as_ref()],
        bump
    )]
    pub vault_pda: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddEmployee<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    /// CHECK: This is just the target wallet of the employee
    pub employee_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = employer,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1, // Added 32 for employer pubkey
        // Seeds: "employee", employer's key, and the employee's wallet key.
        // This makes every employee record unique to this specific employer.
        seeds = [b"employee", employer.key().as_ref(), employee_wallet.key().as_ref()],
        bump
    )]
    pub employee_pda: Account<'info, Employee>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DisbursePayment<'info> {
    #[account(
        mut,
        seeds = [b"employee", employer.key().as_ref(), employee_wallet.key().as_ref()],
        bump = employee_pda.bump
    )]
    pub employee_pda: Account<'info, Employee>,

    /// CHECK: This is the vault that holds the company funds
    #[account(
        mut,
        seeds = [b"vault", employer.key().as_ref()],
        bump
    )]
    pub vault_pda: Account<'info, Vault>,

    /// CHECK: Recipient wallet
    #[account(mut, address = employee_pda.wallet)]
    pub employee_wallet: UncheckedAccount<'info>,

    pub employer: Signer<'info>, // Only the employer can trigger the disbursement
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
    pub employer: Pubkey, // 32 bytes
    pub wallet: Pubkey,   // 32 bytes
    pub salary: u64,      // 8 bytes
    pub last_paid: i64,   // 8 bytes (Unix timestamp)
    pub interval: i64,    // 8 bytes (e.g., 30 days in seconds)
    pub bump: u8,         // 1 byte
}

#[account]
pub struct Vault {}

// Add this custom error at the bottom of lib.rs
