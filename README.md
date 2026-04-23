# 🏦 Automated Payroll DApp

A decentralized payroll management system built on the Solana blockchain using the Anchor framework. This application allows employers to initialize a payroll budget and securely manage employee payments through Program Derived Addresses (PDAs).

## 🚀 Tech Stack

- **Blockchain**: [Solana](https://solana.com/)
- **Framework**: [Anchor (v0.30+)](https://www.anchor-lang.com/)
- **Smart Contract Language**: [Rust](https://www.rust-lang.org/)
- **Testing & Scripting**: [TypeScript](https://www.typescriptlang.org/)
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Local Validator**: `solana-test-validator`

## 📋 Prerequisites

Ensure you have the following installed:
- [Rust](https://rustup.rs/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)
- [Bun](https://bun.sh/docs/installation)

## ⚙️ Configuration

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd automated_payroll
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Check your Solana Config**:
   Ensure you are set to `localhost`:
   ```bash
   solana config set --url localhost
   ```

4. **Update Program ID** (Optional):
   If you change the program ID, update it in:
   - `Anchor.toml`
   - `programs/automated_payroll/src/lib.rs`

## 🛠️ How to Run

### 1. Start the Local Validator
Open a separate terminal and run:
```bash
solana-test-validator
```

### 2. Build the Program
```bash
anchor build
```

### 3. Run Tests
The project uses `bun test` for high-performance testing. To run the automated test suite against your local validator:
```bash
anchor test --skip-local-validator
```

## 🧪 Testing Coverage

The current test suite includes:
- **Initialization**: Verifies that an employer can successfully initialize a payroll config with a budget.
- **Security Constraints**: Ensures that the program rejects unauthorized PDA initialization attempts (Negative Testing).

## 📄 License
ISC
