# Conviction Voting

1Hive & P2P Models' Conviction Voting app is used to allocate funds on proposals based on the conviction an entire organization has on them. Conviction can be signaled by staking organization tokens on proposals, and it is not fully activated until a certain period of time has passed.

#### 🐲 Project Stage: development

The Conviction Voting app is still in development. If you are interested in contributing please see our [open issues](https://github.com/1hive/conviction-voting-app).

#### 🚨 Security Review Status: pre-audit

The code in this repository has not been audited.

## How to run Conviction Voting app locally

To use this Aragon application, set it up using a token and a vault using:

```sh
npm install
npm start # It actually starts `npm run start:ipfs:template`
```

If everything is working correctly, your new DAO will be deployed and your browser will open http://localhost:3000/#/YOUR-DAO-ADDRESS. It should look something like this:

![Deployed DAO with conviction voting app](https://raw.githubusercontent.com/1Hive/conviction-voting-app/master/app/public/meta/screenshot-1.png)

You can set up mocked data and add funds to the vault by executing:

```sh
npm run mock-data $YOUR_DAO_ADDR $CONVICTION_VOTING_APP_ID [$AMOUNT]
```

You can also see how conviction increases and decreases over time by executing:

```sh
npm run mine-blocks # A new block is going to be mined every 15s
```

And refreshing the application in the browser (F5).

## Background

The process of allocating funds in DAOs that are being used today feels very clunky, typically requiring a series of yes/no votes evaluated independently. These organizations also suffer from a number of challenges like 51% attacks, low participation, and overall inability to effectively prioritize and decide when there are many potential options all competing for consideration at once.

[Conviction voting](https://medium.com/giveth/conviction-voting-a-novel-continuous-decision-making-alternative-to-governance-aa746cfb9475) as proposed by Commons Stack and Block Science  provides an interesting solution, that feels more organic and DAO-like than other methods we have seen proposed.

Our implementation of Conviction Voting as an Aragon application is intended to be used to collectively allocate funds from a shared treasury. It does not currently support voting on other types of proposals.

Proposals can be submitted for consideration at any time and do not have an explicit expiration.

A user can vote for a single proposal at a time, when they do their token-weighted balance adds conviction to that proposal. In this way we can think of voting for a proposal a bit like the emission of a signal directed towards a specific proposal, when the signal is moved it takes time to fully arrive on the new proposal, and at same time the remnants of the signal can still be felt at the previous proposal for some time after the source of the signal has been redirected.

Proposals can be executed only if there is enough accumulated conviction. The threshold at which a proposal can be execute is dependent on the proportion of the funds requested relative to the available funds in the shared treasury. This relationship between the funds requested and available funds means that the threshold at which a proposal can be executed depends on the state of the system at any given time. As proposals pass and remove funds from the treasury, the remaining proposals will become harder to pass (because they now represent a larger proportion of the shared treasury), conversely, as new funds are added to the share treasury the threshold for passing existing proposals will decrease. This provides some natural self regulation to the spending rate of the organization relative to its income.

The time based accumulation forces voters to prioritize where they place their conviction and may encourage members to more effectively converge on a mutually acceptable compromise to most effectively leverage their influence on the DAOs fund allocations.

## Structure

This app has the following structure:

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
  - `ConvictionVotingApp.sol`: Aragon app contract.
  - `Template.sol`: [Aragon Template](https://hack.aragon.org/docs/templates-intro) to deploy a fully functional DAO.
- [**migrations**](https://truffleframework.com/docs/truffle/getting-started/running-migrations): Migrations folder.
- **test**: Tests folder.
- [**arapp.json**](https://hack.aragon.org/docs/cli-global-confg#the-arappjson-file): Aragon configuration file. Includes Aragon-specific metadata for your app.
- [**manifest.json**](https://hack.aragon.org/docs/cli-global-confg#the-manifestjson-file): Aragon configuration file. Includes web-specific configurations.
- [**truffle.js**](https://truffleframework.com/docs/truffle/reference/configuration): Truffle configuration file.
- [**package.json**](https://docs.npmjs.com/creating-a-package-json-file): Main npm configuration file.

## Contributing

We welcome community contributions!

Please check out our [open Issues](https://github.com/1Hive/conviction-voting-app/issues) to get started.

If you discover something that could potentially impact security, please notify us immediately. The quickest way to reach us is via the #conviction-voting channel in our [team Keybase chat](https://1hive.org/contribute/keybase). Just say hi and that you discovered a potential security vulnerability and we'll DM you to discuss details.

### Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/lkngtn"><img src="https://avatars0.githubusercontent.com/u/4986634?v=4" width="75px;" alt=""/><br /><sub><b>Luke Duncan</b></sub></a><br /><a href="#fundingFinding-lkngtn" title="Funding Finding">🔍</a> <a href="#ideas-lkngtn" title="Ideas, Planning, & Feedback">🤔</a> <a href="#projectManagement-lkngtn" title="Project Management">📆</a></td>
    <td align="center"><a href="https://github.com/dizzypaty"><img src="https://avatars0.githubusercontent.com/u/7205369?v=4" width="75px;" alt=""/><br /><sub><b>Patricia Davila</b></sub></a><br /><a href="#design-dizzypaty" title="Design">🎨</a> <a href="#ideas-dizzypaty" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/sembrestels"><img src="https://avatars1.githubusercontent.com/u/931684?v=4" width="75px;" alt=""/><br /><sub><b>David Llop</b></sub></a><br /><a href="https://github.com/1hive/conviction-voting-app/commits?author=sembrestels" title="Code">💻</a> <a href="#ideas-sembrestels" title="Ideas, Planning, & Feedback">🤔</a> <a href="#security-sembrestels" title="Security">🛡️</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
