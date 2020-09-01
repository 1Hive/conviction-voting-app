# Conviction Voting

1Hive's Conviction Voting app is used to allocate funds on proposals based on the conviction an entire organization has on them. Conviction can be signaled by staking organization tokens on proposals, and it is not fully activated until a certain period of time has passed.

#### 🐲 Project Stage: Rinkeby

The Conviction Voting app has been published to `open.aragonpm.eth` on Rinkeby network. If you experience any issues or are interested in contributing please see review our [open issues](https://github.com/1hive/conviction-voting-app).

#### 🚨 Security Review Status: pre-audit

The code in this repository has not been audited.

## How to run Conviction Voting app locally

The Conviction Voting template requires the use of [1Hive's Tokens app](https://github.com/1hive/token-manager-app), so please follow the instructions in the README to deploy the app in the local devchain. Many devchains can coexist in the same computer, make sure you are deploying the Tokens app in the same devchain that is going to be deployed Conviction Voting.

To use the Conviction Voting application, you can simply do:

```sh
npm install
npm start # It actually starts `npm run start:ipfs:run`
```

If everything is working correctly, your new DAO will be deployed and your browser will open http://localhost:3000/#/YOUR-DAO-ADDRESS. It should look something like this:

![Deployed DAO with conviction voting app](https://raw.githubusercontent.com/1Hive/conviction-voting-app/master/app/public/meta/screenshot-1.png)

NOTE: What the script `npm run start:ipfs:run` does is running `npm run start:ipfs:template`, kill the devchain, and reinitiate it with a block time of 15s, so we can see conviction growing over time.

## How to deploy Conviction Voting to an organization

Conviction Voting has been published to APM on Rinkeby at `conviction-voting.open.aragonpm.eth`.

To deploy an organization you can use the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html).

```sh
aragon dao install <dao-addr> conviction-voting.open.aragonpm.eth --app-init-args <org-token> <vault-addr> <funds-token> 9999599 2000000 20000 200000000000000000
```
This are the initalization parameters you can use:
* **<org-token>**: The token address of the DAO's token. The supply for tokens with 18 decimals should not exceed 34,028,236,692, a supply bigger than that can cause errors ([more details](./docs/max-safes.md)).
* **<vault-addr>**: The DAO's main vault/agent address. It can be `0x0000000000000000000000000000000000000000` to set it up for conviction signaling (without money allocation).
* **<funds-token>**: The token address that is going to be allocated. The token must be in the vault/agent. It can `0x0000000000000000000000000000000000000000` to set it up for conviction signaling (without money allocation).
* The rest of the parameters are:
  * `decay = 0.9999599`, which sets up conviction halftime to 3 days.
  * `maxRatio = 0.2`, which sets the threshold formula to only allow proposals that request less than 20% of the funds. 
  * `rho = 0.002`, which fine tunes the threshold formula.
  * `minThresholdStakePercentage = 0.2`, which sets the minimum percent of stake token active supply that is used for calculating the threshold

Once the app has been installed, we can create permissions for anybody to create proposals on conviction voting, and for conviction voting to transfer funds from the vault/agent:

```sh
aragon dao acl create <dao-addr> <conviction-voting-app> CREATE_PROPOSALS_ROLE 0xffffffffffffffffffffffffffffffffffffffff <voting-app>
aragon dao acl create <dao-addr> <vault-app> TRANSFER_ROLE <conviction-voting-app> <voting-app>
```

## Background

The process of allocating funds in DAOs that are being used today feels very clunky, typically requiring a series of yes/no votes evaluated independently. These organizations also suffer from a number of challenges like 51% attacks, low participation, and overall inability to effectively prioritize and decide when there are many potential options all competing for consideration at once.

[Conviction voting](https://medium.com/giveth/conviction-voting-a-novel-continuous-decision-making-alternative-to-governance-aa746cfb9475) as proposed by Commons Stack and Block Science provides an interesting solution, that feels more organic and DAO-like than other methods we have seen proposed.

Our implementation of Conviction Voting as an Aragon application is intended to be used to collectively allocate funds from a shared treasury, or to signal priorities when used over proposals without money allocation.

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
├ ├── ConvictionVoting.sol
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
  - `ConvictionVoting.sol`: Aragon app contract.
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
    <td align="center"><a href="http://spacedecentral.net"><img src="https://avatars3.githubusercontent.com/u/2584493?v=4" width="75px;" alt=""/><br /><sub><b>Yalda Mousavinia</b></sub></a><br /><a href="#ideas-stellarmagnet" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://twitter.com/deamlabs"><img src="https://avatars2.githubusercontent.com/u/9392750?v=4" width="75px;" alt=""/><br /><sub><b>Deam</b></sub></a><br /><a href="https://github.com/1hive/conviction-voting-app/commits?author=deamme" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/fabriziovigevani"><img src="https://avatars3.githubusercontent.com/u/22663232?v=4" width="75px;" alt=""/><br /><sub><b>Fabrizio Vigevani</b></sub></a><br /><a href="https://github.com/1hive/conviction-voting-app/commits?author=fabriziovigevani" title="Code">💻</a> <a href="#security-fabriziovigevani" title="Security">🛡️</a></td>
    <td align="center"><a href="https://github.com/javieralaves"><img src="https://avatars2.githubusercontent.com/u/28843778?v=4" width="75px;" alt=""/><br /><sub><b>Javier Alaves</b></sub></a><br /><a href="#design-javieralaves" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/vivianedias"><img src="https://avatars3.githubusercontent.com/u/9057801?v=4" width="75px;" alt=""/><br /><sub><b>Viviane Dias</b></sub></a><br /><a href="https://github.com/1hive/conviction-voting-app/commits?author=vivianedias" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/SabaunT"><img src="https://avatars0.githubusercontent.com/u/37265857?v=4" width="75px;" alt=""/><br /><sub><b>Sabaun Taraki</b></sub></a><br /><a href="https://github.com/1hive/conviction-voting-app/commits?author=SabaunT" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/commons-stack"><img src="https://avatars1.githubusercontent.com/u/48513475?v=4" width="75px;" alt=""/><br /><sub><b>The Commons Stack</b></sub></a><br /><a href="#blog-commons-stack" title="Blogposts">📝</a> <a href="#ideas-commons-stack" title="Ideas, Planning, & Feedback">🤔</a> <a href="#tool-commons-stack" title="Tools">🔧</a></td>
    <td align="center"><a href="http://1hive.org"><img src="https://avatars2.githubusercontent.com/u/29875830?v=4" width="75px;" alt=""/><br /><sub><b>1Hive</b></sub></a><br /><a href="#financial-1Hive" title="Financial">💵</a> <a href="#infra-1Hive" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://aragon.org"><img src="https://avatars1.githubusercontent.com/u/24612534?v=4" width="75px;" alt=""/><br /><sub><b>Aragon</b></sub></a><br /><a href="#financial-aragon" title="Financial">💵</a></td>
    <td align="center"><a href="https://p2pmodels.eu"><img src="https://avatars1.githubusercontent.com/u/35083190?v=4" width="75px;" alt=""/><br /><sub><b>P2P Models</b></sub></a><br /><a href="#infra-P2PModels" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/fioreb"><img src="https://avatars2.githubusercontent.com/u/61423083?v=4" width="75px;" alt=""/><br /><sub><b>fioreb</b></sub></a><br /><a href="#design-fioreb" title="Design">🎨</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/PJColombo"><img src="https://avatars1.githubusercontent.com/u/33203511?v=4" width="75px;" alt=""/><br /><sub><b>Paulo J. Colombo</b></sub></a><br /><a href="https://github.com/1hive/conviction-voting-app/commits?author=PJColombo" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
