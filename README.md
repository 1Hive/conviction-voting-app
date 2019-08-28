# Aragon Conviction Voting Application
The process of allocating funds in DAOs that are being used today feels very clunky, typically requiring a series of yes/no votes evaluated independently. These organizations also suffer from a number of challenges like 51% attacks, low participation, and overall inability to effectively prioritize and decide when there are many potential options all competing for consideration at once.

[Conviction voting](https://medium.com/giveth/conviction-voting-a-novel-continuous-decision-making-alternative-to-governance-aa746cfb9475) as proposed by Commons Stack and Block Science  provides an interesting solution, that feels more organic and DAO-like than other methods we have seen proposed.

## What it does
Our implementation of Conviction Voting as an Aragon application is intended to be used to collectively allocate funds from a shared treasury. It does not currently support voting on other types of proposals.

Proposals can be submitted for consideration at any time and do not have an explicit expiration.

A user can vote for a single proposal at a time, when they do their token-weighted balance adds conviction to that proposal. In this way we can think of voting for a proposal a bit like the emission of a signal directed towards a specific proposal, when the signal is moved it takes time to fully arrive on the new proposal, and at same time the remnants of the signal can still be felt at the previous proposal for some time after the source of the signal has been redirected.

Proposals can be executed only if there is enough accumulated conviction. The threshold at which a proposal can be execute is dependent on the proportion of the funds requested relative to the available funds in the shared treasury. This relationship between the funds requested and available funds means that the threshold at which a proposal can be executed depends on the state of the system at any given time. As proposals pass and remove funds from the treasury, the remaining proposals will become harder to pass (because they now represent a larger proportion of the shared treasury), conversely, as new funds are added to the share treasury the threshold for passing existing proposals will decrease. This provides some natural self regulation to the spending rate of the organization relative to its income.

The time based accumulation forces voters to prioritize where they place their conviction and may encourage members to more effectively converge on a mutually acceptable compromise to most effectively leverage their influence on the DAOs fund allocations.

Unfortunately, we were not able to complete the application during the hackathon, we were able to get the basic contract into a mostly complete state as an Aragon App. We are confident the approach will work at this point, but some cleanup still needs to be done, and the threshold function still needs to be implemented. On the front-end we were able to come up with a [design](https://www.figma.com/file/MH2ntFCnKC1O91HS8lWmDb/Conviction-Voting?node-id=1%3A2280) and start to implement using mock data.

## Usage

To use this Aragon application, set it up using a token and a vault using:

```sh
npm install
npm run start:ipfs:template
```

## Structure

This boilerplate has the following structure:

```md
root
├── app
├ ├── src
├ └── package.json
├── contracts
├ ├── ConvictionVotingApp.sol
├ └── Template.sol
├── migration
├── test
├── arapp.json
├── manifest.json
├── truffle.js
└── package.json
```

- **app**: Frontend folder. Completely encapsulated, has its own package.json and dependencies.
  - **src**: Source files.
  - [**package.json**](https://docs.npmjs.com/creating-a-package-json-file): Frontend npm configuration file.
- **contracts**: Smart Constracts folder.
  - `ConvictionApp.sol`: Aragon app contract.
  - `Template.sol`: [Aragon Template](https://hack.aragon.org/docs/templates-intro) to deploy a fully functional DAO.
- [**migrations**](https://truffleframework.com/docs/truffle/getting-started/running-migrations): Migrations folder.
- **test**: Tests folder.
- [**arapp.json**](https://hack.aragon.org/docs/cli-global-confg#the-arappjson-file): Aragon configuration file. Includes Aragon-specific metadata for your app.
- [**manifest.json**](https://hack.aragon.org/docs/cli-global-confg#the-manifestjson-file): Aragon configuration file. Includes web-specific configurations.
- [**truffle.js**](https://truffleframework.com/docs/truffle/reference/configuration): Truffle configuration file.
- [**package.json**](https://docs.npmjs.com/creating-a-package-json-file): Main npm configuration file.

## Contributors

- Luke - 1Hive
- Pati - Aragon One
- Sem - P2P Models
- Yalda - Autark
- Deam - Aragon Black
