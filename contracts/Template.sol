/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";

import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";

import "./ConvictionVotingApp.sol";


contract TemplateBase is APMNamehash {
    ENS public ens;
    DAOFactory public fac;

    event DeployInstance(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) public {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = TemplateBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}


contract Template is TemplateBase {
    using SafeERC20 for ERC20;
    MiniMeTokenFactory tokenFactory;

    uint64 constant PCT = 10 ** 16;
    address constant ANY_ENTITY = address(-1);

    constructor(ENS ens) TemplateBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance() public {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        address account2 = 0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb;
        bytes32 appId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("conviction-voting")));
        bytes32 tokenManagerAppId = apmNamehash("token-manager");
        bytes32 vaultAppId = apmNamehash("vault");

        ConvictionVotingApp app = ConvictionVotingApp(dao.newAppInstance(appId, latestVersionAppBase(appId)));
        TokenManager tokenManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        TokenManager tokenManager2 = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        Vault vault = Vault(dao.newAppInstance(vaultAppId, latestVersionAppBase(vaultAppId)));

        MiniMeToken token = tokenFactory.createCloneToken(MiniMeToken(0), 0, "App token", 0, "APP", true);
        MiniMeToken token2 = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Fake DAI", 18, "DAI", true);
        token.changeController(tokenManager);
        token2.changeController(tokenManager2);

        // Initialize apps
        vault.initialize();
        app.initialize(token, vault, token2);
        tokenManager.initialize(token, true, 0);
        tokenManager2.initialize(token2, true, 0);

        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);
        tokenManager.mint(this, 30000);
        tokenManager.mint(msg.sender, 15000);

        acl.createPermission(this, tokenManager2, tokenManager2.MINT_ROLE(), this);
        tokenManager2.mint(this, 15000 * 10**18);
        ERC20(token2).safeApprove(vault, 15000 * 10**18);
        vault.deposit(token2, 15000 * 10**18);

        acl.createPermission(ANY_ENTITY, app, app.CREATE_PROPOSALS_ROLE(), msg.sender);
        acl.grantPermission(msg.sender, tokenManager, tokenManager.MINT_ROLE());
        acl.grantPermission(msg.sender, tokenManager2, tokenManager2.MINT_ROLE());

        acl.createPermission(app, vault, vault.TRANSFER_ROLE(), this);

        // Clean up permissions
        acl.grantPermission(msg.sender, dao, dao.APP_MANAGER_ROLE());
        acl.revokePermission(this, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(msg.sender, dao, dao.APP_MANAGER_ROLE());

        acl.grantPermission(msg.sender, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.revokePermission(this, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(msg.sender, acl, acl.CREATE_PERMISSIONS_ROLE());

        emit DeployInstance(dao);

        // Test inital transactions
        app.addProposal('Aragon Sidechain', '0x0', 2000, 0xD41b2558691d4A39447b735C23E6c98dF6cF4409);
        app.addProposal('Conviction Voting', '0x0', 1000, 0xb4124cEB3451635DAcedd11767f004d8a28c6eE7);
        app.addProposal('Aragon Button', '0x0', 1000, 0xb4124cEB3451635DAcedd11767f004d8a28c6eE7);
        app.stakeToProposal(1, 20000);
    }
}
