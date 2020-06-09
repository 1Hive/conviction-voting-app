pragma solidity 0.4.24;

import "@aragon/templates-shared/contracts/TokenCache.sol";
import "@aragon/templates-shared/contracts/BaseTemplate.sol";
import "@1hive/apps-token-manager/contracts/HookedTokenManager.sol";

import "./ConvictionVoting.sol";


contract Template is BaseTemplate, TokenCache {
    bytes32 constant internal HOOKED_TOKEN_MANAGER_APP_ID = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("hooked-token-manager")));  // hooked-token-manager.open.aragonpm.eth

    string constant private ERROR_EMPTY_HOLDERS = "TEMPLATE_EMPTY_HOLDERS";
    string constant private ERROR_BAD_HOLDERS_STAKES_LEN = "TEMPLATE_BAD_HOLDERS_STAKES_LEN";
    string constant private ERROR_BAD_VOTE_SETTINGS = "TEMPLATE_BAD_VOTE_SETTINGS";

    address constant private ANY_ENTITY = address(-1);
    bool constant private TOKEN_TRANSFERABLE = true;
    uint8 constant private TOKEN_DECIMALS = uint8(18);
    uint256 constant private TOKEN_MAX_PER_ACCOUNT = uint256(0);
    uint256 constant private VAULT_BALANCE = 15000000000000000000000;

    constructor (
        DAOFactory _daoFactory,
        ENS _ens,
        MiniMeTokenFactory _miniMeFactory,
        IFIFSResolvingRegistrar _aragonID
    )
        BaseTemplate(_daoFactory, _ens, _miniMeFactory, _aragonID)
        public
    {
        _ensureAragonIdIsValid(_aragonID);
        _ensureMiniMeFactoryIsValid(_miniMeFactory);
    }

    /**
    * @dev Create a new MiniMe token and deploy a Template DAO.
    * @param _stakeTokenName String with the name for the token used by share holders in the organization
    * @param _stakeTokenSymbol String with the symbol for the token used by share holders in the organization
    * @param _holders Array of token holder addresses
    * @param _stakes Array of token stakes for holders (token has 18 decimals, multiply token amount `* 10^18`)
    * @param _votingSettings Array of [supportRequired, minAcceptanceQuorum, voteDuration] to set up the voting app of the organization
    */
    function newTokenAndInstance(
        string _stakeTokenName,
        string _stakeTokenSymbol,
        address[] _holders,
        uint256[] _stakes,
        uint64[3] _votingSettings,
        uint8 _type
    )
        external
    {
        newToken(_stakeTokenName, _stakeTokenSymbol);
        newInstance(_holders, _stakes, _votingSettings, _type);
    }

    /**
    * @dev Create a new MiniMe token and cache it for the user
    * @param _name String with the name for the token used by share holders in the organization
    * @param _symbol String with the symbol for the token used by share holders in the organization
    */
    function newToken(string memory _name, string memory _symbol) public returns (MiniMeToken) {
        MiniMeToken token = _createToken(_name, _symbol, TOKEN_DECIMALS);
        _cacheToken(token, msg.sender);
        return token;
    }

    /**
    * @dev Deploy a Template DAO using a previously cached MiniMe token
    * @param _holders Array of token holder addresses
    * @param _stakes Array of token stakes for holders (token has 18 decimals, multiply token amount `* 10^18`)
    * @param _votingSettings Array of [supportRequired, minAcceptanceQuorum, voteDuration] to set up the voting app of the organization
    */
    function newInstance(
        address[] memory _holders,
        uint256[] memory _stakes,
        uint64[3] memory _votingSettings,
        uint8 _type
    )
        public
    {
        _ensureTemplateSettings(_holders, _stakes, _votingSettings);

        (Kernel dao, ACL acl) = _createDAO();
        MiniMeToken requestToken = _setupRequestToken(dao, acl);
        (Voting voting, TokenManager stakeTokenManager, Vault vault) = _setupBaseApps(dao, acl, _holders, _stakes, _votingSettings);
        // Setup conviction-voting app
        ConvictionVoting app;
        if (_type == 0) {
            app = _setupConvictionVoting(dao, acl, voting, stakeTokenManager.token(), 0x0, 0x0);
        } else {
            app = _setupConvictionVoting(dao, acl, voting, stakeTokenManager.token(), vault, address(requestToken));
        }
        _registerTokenManagerHooks(acl, HookedTokenManager(address(stakeTokenManager)), app);
        _transferRootPermissionsFromTemplateAndFinalizeDAO(dao, voting);
        _fillVault(vault, requestToken, VAULT_BALANCE);
    }

    function _setupRequestToken(Kernel _dao, ACL _acl) internal returns (MiniMeToken) {
        MiniMeToken requestToken = _createToken("DAI", "DAI", 18);
        TokenManager tokenManager = _installTokenManagerApp(_dao, requestToken, TOKEN_TRANSFERABLE, TOKEN_MAX_PER_ACCOUNT);
        _mintTokens(_acl, tokenManager, this, VAULT_BALANCE);
        return requestToken;
    }

    function _setupBaseApps(
        Kernel _dao,
        ACL _acl,
        address[] memory _holders,
        uint256[] memory _stakes,
        uint64[3] memory _votingSettings
    )
        internal
        returns (Voting, TokenManager, Vault)
    {
        MiniMeToken token = _popTokenCache(msg.sender);
        TokenManager tokenManager = _installHookedTokenManagerApp(_dao, token, TOKEN_TRANSFERABLE, TOKEN_MAX_PER_ACCOUNT);
        Voting voting = _installVotingApp(_dao, token, _votingSettings);
        Vault vault = _installVaultApp(_dao);

        _mintTokens(_acl, tokenManager, _holders, _stakes);
        _setupBasePermissions(_acl, voting, tokenManager);

        return (voting, tokenManager, vault);
    }

    function _setupBasePermissions(
        ACL _acl,
        Voting _voting,
        TokenManager _tokenManager
    )
        internal
    {
        _createEvmScriptsRegistryPermissions(_acl, _voting, _voting);
        _createVotingPermissions(_acl, _voting, _voting, _tokenManager, _voting);
        _createTokenManagerPermissions(_acl, _tokenManager, _voting, _voting);
    }

    // Next we install and create permissions for the conviction-voting app
    //--------------------------------------------------------------//
    function _setupConvictionVoting(
        Kernel _dao,
        ACL _acl,
        Voting _voting,
        MiniMeToken _stakeToken,
        address _vault,
        address _requestToken
    )
        internal returns (ConvictionVoting)
    {
        ConvictionVoting app = _installConvictionVoting(_dao, _stakeToken, _vault, _requestToken);
        _createConvictionVotingPermissions(_acl, app, _voting, _voting);
        _mockProposalsData(app);
        if (_vault != 0x0) {
            _createVaultPermissions(_acl, Vault(_vault), app, _voting);
        }
        return app;
    }

    function _installConvictionVoting(
        Kernel _dao,
        MiniMeToken _stakeToken,
        address _vault,
        address _requestToken
    )
        internal returns (ConvictionVoting)
    {
        bytes32 _appId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("conviction-voting")));
        bytes4 selector = bytes4(keccak256("initialize(address,address,address,uint256,uint256)"));
        bytes memory initializeData = abi.encodeWithSelector(selector, _stakeToken, _vault, _requestToken, 5000000, 2000000);
        return ConvictionVoting(_installDefaultApp(_dao, _appId, initializeData));
    }

    function _createConvictionVotingPermissions(
        ACL _acl,
        ConvictionVoting _app,
        address _grantee,
        address _manager
    )
        internal
    {
        _acl.createPermission(ANY_ENTITY, _app, _app.CREATE_PROPOSALS_ROLE(), _manager);
    }

    function _createVaultPermissions(
        ACL _acl,
        Vault _app,
        address _grantee,
        address _manager
    )
        internal
    {
        _acl.createPermission(_grantee, _app, _app.TRANSFER_ROLE(), _manager);
    }

    function _registerTokenManagerHooks(ACL _acl, HookedTokenManager _stakeTokenManager, ConvictionVoting _app) internal {
        _createPermissionForTemplate(_acl, _stakeTokenManager, _stakeTokenManager.SET_HOOK_ROLE());
        _stakeTokenManager.registerHook(_app);
        _removePermissionFromTemplate(_acl, _stakeTokenManager, _stakeTokenManager.SET_HOOK_ROLE());
    }

    function _fillVault(
        Vault _vault,
        MiniMeToken _requestToken,
        uint256 _amount
    )
        internal
    {
        _requestToken.approve(_vault, _amount);
        _vault.deposit(_requestToken, _amount);
    }

    function _mockProposalsData(ConvictionVoting _app) internal {
        _app.addProposal("Aragon Sidechain", "0x0", 2000 * 10 ** 18, msg.sender);
        _app.addProposal("Conviction Voting", "0x0", 1000 * 10 ** 18, msg.sender);
        _app.addProposal("Aragon Button", "0x0", 1000 * 10 ** 18, msg.sender);
    }

    function _installHookedTokenManagerApp(
        Kernel _dao,
        MiniMeToken _token,
        bool _transferable,
        uint256 _maxAccountTokens
    )
        internal returns (TokenManager)
    {
        HookedTokenManager tokenManager = HookedTokenManager(_installDefaultApp(_dao, HOOKED_TOKEN_MANAGER_APP_ID));
        _token.changeController(tokenManager);
        tokenManager.initialize(_token, _transferable, _maxAccountTokens);
        return TokenManager(address(tokenManager));
    }

    //--------------------------------------------------------------//

    function _ensureTemplateSettings(
        address[] memory _holders,
        uint256[] memory _stakes,
        uint64[3] memory _votingSettings
    )
        private
        pure
    {
        require(_holders.length > 0, ERROR_EMPTY_HOLDERS);
        require(_holders.length == _stakes.length, ERROR_BAD_HOLDERS_STAKES_LEN);
        require(_votingSettings.length == 3, ERROR_BAD_VOTE_SETTINGS);
    }
}
