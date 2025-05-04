# CCP + Bread Fundraising Contract

This project implements a fundraising smart contract using the Mina protocol and zero-knowledge proofs via [o1js](https://github.com/o1-labs/o1js) and the [fts-scaffolded-xt](https://www.npmjs.com/package/fts-scaffolded-xt) library. It allows donors to contribute funds in the form of tokens towards a fundraising goal and includes two withdrawal methods:

- **Donor Refunds**: Allows donors to reclaim their donation if the deadline passes without reaching the goal.
- **Beneficiary Claim**: Allows the beneficiary to claim the total donation amount if the fundraising goal is met after the deadline.

## Project Structure

- **src/Fundraiser.ts**  
  Contains the smart contract logic for donations, refunds, and beneficiary withdrawals.
- **src/fundraiser_runner.ts**  
  A runner script that deploys and initializes the token and fundraiser contracts, simulates donations, time progression, refunds, and finally the beneficiary withdrawing funds.

## Installation

1. Clone the repository.
2. Install dependencies using:

   ```sh
   npm install
   ```

## Building the Project

To compile the TypeScript sources into JavaScript, run:

```sh
npm run build
```

## Running the Project

You can run the local simulation of the fundraiser with:

```sh
npm run run
```

Alternatively, for debugging with TypeScript, use:

```sh
npm run debug
```

This will execute the [fundraiser_runner.ts](./src/fundraiser_runner.ts) script which:

- Deploys and initializes the token and fundraiser contracts.
- Executes a series of transactions simulating donations, refunds, and ultimately a beneficiary claim.

## Code Quality and Formatting

- ESLint is configured to lint TypeScript and JavaScript files.
- Prettier is set up to enforce code formatting.
- Husky hooks are configured to run linting and formatting before commits.

## Additional Notes

- This project uses dummy proofs and verification keys for testing and demonstration purposes.
