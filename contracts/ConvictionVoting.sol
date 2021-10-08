pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/math/Math.sol";
import "@1hive/apps-token-manager/contracts/TokenManagerHook.sol";
import "@1hive/funds-manager/contracts/FundsManager.sol";
import "./lib/ArrayUtils.sol";
import "./lib/IPriceOracle.sol";

contract ConvictionVoting is DisputableAragonApp, TokenManagerHook {
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using ArrayUtils for uint256[];

    // bytes32 constant public PAUSE_CONTRACT_ROLE = keccak256("PAUSE_CONTRACT_ROLE");
    bytes32 constant public PAUSE_CONTRACT_ROLE = 0x0e3a87ad3cd0c04dcd1e538226de2b467c72316c162f937f5b6f791361662462;
    // bytes32 constant public UPDATE_SETTINGS_ROLE = keccak256("UPDATE_SETTINGS_ROLE");
    bytes32 constant public UPDATE_SETTINGS_ROLE = 0x9d4f140430c9045e12b5a104aa9e641c09b980a26ab8e12a32a2f3d155229ae3;
    // bytes32 constant public CREATE_PROPOSALS_ROLE = keccak256("CREATE_PROPOSALS_ROLE");
    bytes32 constant public CREATE_PROPOSALS_ROLE = 0xbf05b9322505d747ab5880dfb677dc4864381e9fc3a25ccfa184a3a53d02f4b2;
    // bytes32 constant public CANCEL_PROPOSALS_ROLE = keccak256("CANCEL_PROPOSALS_ROLE");
    bytes32 constant public CANCEL_PROPOSALS_ROLE = 0x82c52f79cad6ac09c16c165c562b50c5e655a09a19bb99b2d182ab3caff020f2;

    uint256 public constant D = 10000000;
    uint256 public constant ONE_HUNDRED_PERCENT = 1e18;
    uint256 private constant TWO_128 = 0x100000000000000000000000000000000; // 2^128
    uint256 private constant TWO_127 = 0x80000000000000000000000000000000; // 2^127
    uint256 private constant TWO_64 = 0x10000000000000000; // 2^64
    uint256 public constant ABSTAIN_PROPOSAL_ID = 1;
    uint64 public constant MAX_STAKED_PROPOSALS = 10;

    string private constant ERROR_CONTRACT_PAUSED = "CV_CONTRACT_PAUSED";
    string private constant ERROR_PROPOSAL_DOES_NOT_EXIST = "CV_PROPOSAL_DOES_NOT_EXIST";
    string private constant ERROR_REQUESTED_AMOUNT_ZERO = "CV_REQUESTED_AMOUNT_ZERO";
    string private constant ERROR_NO_BENEFICIARY = "CV_NO_BENEFICIARY";
    string private constant ERROR_STAKING_ALREADY_STAKED = "CV_STAKING_ALREADY_STAKED";
    string private constant ERROR_PROPOSAL_NOT_ACTIVE = "CV_PROPOSAL_NOT_ACTIVE";
    string private constant ERROR_CANNOT_EXECUTE_ABSTAIN_PROPOSAL = "CV_CANNOT_EXECUTE_ABSTAIN_PROPOSAL";
    string private constant ERROR_CANNOT_EXECUTE_ZERO_VALUE_PROPOSAL = "CV_CANNOT_EXECUTE_ZERO_VALUE_PROPOSAL";
    string private constant ERROR_INSUFFICIENT_CONVICION = "CV_INSUFFICIENT_CONVICION";
    string private constant ERROR_SENDER_CANNOT_CANCEL = "CV_SENDER_CANNOT_CANCEL";
    string private constant ERROR_CANNOT_CANCEL_ABSTAIN_PROPOSAL = "CV_CANNOT_CANCEL_ABSTAIN_PROPOSAL";
    string private constant ERROR_AMOUNT_OVER_MAX_RATIO = "CV_AMOUNT_OVER_MAX_RATIO";
    string private constant ERROR_INCORRECT_TOKEN_MANAGER_HOOK = "CV_INCORRECT_TOKEN_MANAGER_HOOK";
    string private constant ERROR_AMOUNT_CAN_NOT_BE_ZERO = "CV_AMOUNT_CAN_NOT_BE_ZERO";
    string private constant ERROR_INCORRECT_PROPOSAL_STATUS = "CV_INCORRECT_PROPOSAL_STATUS";
    string private constant ERROR_STAKING_MORE_THAN_AVAILABLE = "CV_STAKING_MORE_THAN_AVAILABLE";
    string private constant ERROR_MAX_PROPOSALS_REACHED = "CV_MAX_PROPOSALS_REACHED";
    string private constant ERROR_WITHDRAW_MORE_THAN_STAKED = "CV_WITHDRAW_MORE_THAN_STAKED";
    string private constant ERROR_NO_TOKEN_MANAGER_SET = "CV_NO_TOKEN_MANAGER_SET";

    enum ProposalStatus {
        Active,              // A vote that has been reported to Agreements
        Paused,              // A vote that is being challenged by Agreements
        Cancelled,           // A vote that has been cancelled
        Executed             // A vote that has been executed
    }

    struct Proposal {
        uint256 requestedAmount;
        bool stableRequestAmount;
        address beneficiary;
        uint256 stakedTokens;
        uint256 convictionLast;
        uint64 blockLast;
        uint256 agreementActionId;
        ProposalStatus proposalStatus;
        mapping(address => uint256) voterStake;
        address submitter;
    }

    MiniMeToken public stakeToken;
    address public requestToken;
    address public stableToken;
    IPriceOracle public stableTokenOracle;
    FundsManager public fundsManager;
    uint256 public decay;
    uint256 public maxRatio;
    uint256 public weight;
    uint256 public minThresholdStakePercentage;
    uint256 public proposalCounter;
    uint256 public totalStaked;
    bool public contractPaused;

    mapping(uint256 => Proposal) internal proposals;
    mapping(address => uint256) internal totalVoterStake;
    mapping(address => uint256[]) internal voterStakedProposals;

    event ContractPaused(bool pauseEnabled);
    event OracleSettingsChanged(IPriceOracle stableTokenOracle, address stableToken);
    event FundsManagerChanged(FundsManager fundsManager);
    event ConvictionSettingsChanged(uint256 decay, uint256 maxRatio, uint256 weight, uint256 minThresholdStakePercentage);
    event ProposalAdded(address indexed entity, uint256 indexed id, uint256 indexed actionId, string title, bytes link, uint256 amount, bool stable, address beneficiary);
    event StakeAdded(address indexed entity, uint256 indexed id, uint256  amount, uint256 tokensStaked, uint256 totalTokensStaked, uint256 conviction);
    event StakeWithdrawn(address entity, uint256 indexed id, uint256 amount, uint256 tokensStaked, uint256 totalTokensStaked, uint256 conviction);
    event ProposalExecuted(uint256 indexed id, uint256 conviction);
    event ProposalPaused(uint256 indexed proposalId, uint256 indexed challengeId);
    event ProposalResumed(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event ProposalRejected(uint256 indexed proposalId);

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId == 1 || proposals[_proposalId].submitter != address(0), ERROR_PROPOSAL_DOES_NOT_EXIST);
        _;
    }

    modifier notPaused() {
        require(!contractPaused, ERROR_CONTRACT_PAUSED);
        _;
    }

    function initialize(
        MiniMeToken _stakeToken,
        address _requestToken,
        address _stableToken,
        IPriceOracle _stableTokenOracle,
        FundsManager _fundsManager,
        uint256 _decay,
        uint256 _maxRatio,
        uint256 _weight,
        uint256 _minThresholdStakePercentage
    )
        external onlyInit
    {
        proposalCounter = 2; // First proposal should be #2, #1 is reserved for abstain proposal, #0 is not used for better UX.
        stakeToken = _stakeToken;
        requestToken = _requestToken;
        stableToken = _stableToken;
        stableTokenOracle = _stableTokenOracle;
        fundsManager = _fundsManager;
        decay = _decay;
        maxRatio = _maxRatio;
        weight = _weight;
        minThresholdStakePercentage = _minThresholdStakePercentage;

        proposals[ABSTAIN_PROPOSAL_ID] = Proposal(
            0,
            false,
            0x0,
            0,
            0,
            0,
            0,
            ProposalStatus.Active,
            0x0
        );
        emit ProposalAdded(0x0, ABSTAIN_PROPOSAL_ID, 0, "Abstain proposal", "", 0, false, 0x0);

        initialized();
    }

    /**
    * @notice Pause / unpause the contract preventing / allowing general interaction
    * @param _pauseEnabled Whether to enable or disable pause
    */
    function pauseContract(bool _pauseEnabled) external auth(PAUSE_CONTRACT_ROLE) {
        contractPaused = _pauseEnabled;
        emit ContractPaused(contractPaused);
    }

    /**
    * @notice Update the stable token oracle settings
    * @param _stableTokenOracle The new stable token oracle
    * @param _stableToken The new stable token
    */
    function setStableTokenOracleSettings(IPriceOracle _stableTokenOracle, address _stableToken)
        external auth(UPDATE_SETTINGS_ROLE)
    {
        stableTokenOracle = _stableTokenOracle;
        stableToken = _stableToken;

        emit OracleSettingsChanged(_stableTokenOracle, _stableToken);
    }

    /**
    * @notice Update the funds manager
    * @param _fundsManager The new funds manager
    */
    function setFundsManager(FundsManager _fundsManager) external auth(UPDATE_SETTINGS_ROLE) {
        fundsManager = _fundsManager;
        emit FundsManagerChanged(_fundsManager);
    }

    /**
     * @notice Update the conviction voting parameters
     * @param _decay The rate at which conviction is accrued or lost from a proposal
     * @param _maxRatio Proposal threshold parameter
     * @param _weight Proposal threshold parameter
     * @param _minThresholdStakePercentage The minimum percent of stake token max supply that is used for calculating
        conviction
     */
    function setConvictionCalculationSettings(
        uint256 _decay,
        uint256 _maxRatio,
        uint256 _weight,
        uint256 _minThresholdStakePercentage
    )
        external auth(UPDATE_SETTINGS_ROLE)
    {
        decay = _decay;
        maxRatio = _maxRatio;
        weight = _weight;
        minThresholdStakePercentage = _minThresholdStakePercentage;

        emit ConvictionSettingsChanged(_decay, _maxRatio, _weight, _minThresholdStakePercentage);
    }

    /**
     * @notice Create signaling proposal `_title`
     * @param _title Title of the proposal
     * @param _link IPFS or HTTP link with proposal's description
     */
    function addSignalingProposal(string _title, bytes _link) external isInitialized auth(CREATE_PROPOSALS_ROLE) {
        _addProposal(_title, _link, 0, false, address(0));
    }

    /**
     * @notice Create proposal `_title` for `@tokenAmount((self.requestToken(): address), _requestedAmount)` to `_beneficiary`
     * @param _title Title of the proposal
     * @param _link IPFS or HTTP link with proposal's description
     * @param _requestedAmount Tokens requested
     * @param _stableRequestAmount Whether the requested amount is in the request token or the stable token, converted to the request token upon execution
     * @param _beneficiary Address that will receive payment
     */
    function addProposal(string _title, bytes _link, uint256 _requestedAmount, bool _stableRequestAmount, address _beneficiary)
        external isInitialized auth(CREATE_PROPOSALS_ROLE)
    {
        require(_requestedAmount > 0, ERROR_REQUESTED_AMOUNT_ZERO);
        require(_beneficiary != address(0), ERROR_NO_BENEFICIARY);

        _addProposal(_title, _link, _requestedAmount, _stableRequestAmount, _beneficiary);
    }

    /**
      * @notice Stake `@tokenAmount((self.stakeToken(): address), _amount)` on proposal #`_proposalId`
      * @param _proposalId Proposal id
      * @param _amount Amount of tokens staked
      */
    function stakeToProposal(uint256 _proposalId, uint256 _amount) external isInitialized {
        _stake(_proposalId, _amount, msg.sender);
    }

    /**
     * @notice Stake all my `(self.stakeToken(): address).symbol(): string` tokens on proposal #`_proposalId`
     * @param _proposalId Proposal id
     */
    function stakeAllToProposal(uint256 _proposalId) external isInitialized {
        require(totalVoterStake[msg.sender] == 0, ERROR_STAKING_ALREADY_STAKED);
        _stake(_proposalId, stakeToken.balanceOf(msg.sender), msg.sender);
    }

    /**
     * @notice Withdraw `@tokenAmount((self.stakeToken(): address), _amount)` previously staked on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _amount Amount of tokens withdrawn
     */
    function withdrawFromProposal(uint256 _proposalId, uint256 _amount) external isInitialized proposalExists(_proposalId) {
        _withdrawFromProposal(_proposalId, _amount, msg.sender);
    }

    /**
     * @notice Withdraw all `(self.stakeToken(): address).symbol(): string` tokens previously staked on proposal #`_proposalId`
     * @param _proposalId Proposal id
     */
    function withdrawAllFromProposal(uint256 _proposalId) external isInitialized proposalExists(_proposalId) {
        _withdrawFromProposal(_proposalId, proposals[_proposalId].voterStake[msg.sender], msg.sender);
    }

    /**
     * @notice Withdraw all callers stake from inactive proposals
     */
    function withdrawFromInactiveProposals() external isInitialized {
        _withdrawInactiveStakedTokens(uint256(-1), msg.sender);
    }

    /**
     * @notice Execute proposal #`_proposalId`
     * @dev ...by sending `@tokenAmount((self.requestToken(): address), self.getPropoal(_proposalId): ([uint256], address, uint256, uint256, uint64, bool))` to `self.getPropoal(_proposalId): (uint256, [address], uint256, uint256, uint64, bool)`
     * @param _proposalId Proposal id
     */
    function executeProposal(uint256 _proposalId) external notPaused isInitialized proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        require(_proposalId != ABSTAIN_PROPOSAL_ID, ERROR_CANNOT_EXECUTE_ABSTAIN_PROPOSAL);
        require(proposal.requestedAmount > 0, ERROR_CANNOT_EXECUTE_ZERO_VALUE_PROPOSAL);
        require(proposal.proposalStatus == ProposalStatus.Active, ERROR_PROPOSAL_NOT_ACTIVE);

        _calculateAndSetConviction(proposal, proposal.stakedTokens);
        uint256 requestedAmount = _getRequestAmount(proposal);
        require(proposal.convictionLast > calculateThreshold(requestedAmount), ERROR_INSUFFICIENT_CONVICION);

        proposal.proposalStatus = ProposalStatus.Executed;
        _closeDisputableAction(proposal.agreementActionId);

        fundsManager.transfer(requestToken, proposal.beneficiary, requestedAmount);

        emit ProposalExecuted(_proposalId, proposal.convictionLast);
    }

    /**
     * @notice Cancel proposal #`_proposalId`
     * @param _proposalId Proposal id
     */
    function cancelProposal(uint256 _proposalId) external notPaused proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        bool senderHasPermission = canPerform(msg.sender, CANCEL_PROPOSALS_ROLE, new uint256[](0));
        require(proposal.submitter == msg.sender || senderHasPermission, ERROR_SENDER_CANNOT_CANCEL);
        require(_proposalId != ABSTAIN_PROPOSAL_ID, ERROR_CANNOT_CANCEL_ABSTAIN_PROPOSAL);
        require(proposal.proposalStatus == ProposalStatus.Active, ERROR_PROPOSAL_NOT_ACTIVE);

        proposal.proposalStatus = ProposalStatus.Cancelled;
        _closeDisputableAction(proposal.agreementActionId);

        emit ProposalCancelled(_proposalId);
    }

    /**
     * @dev Get proposal details
     * @param _proposalId Proposal id
     * @return Requested amount
     * @return If requested in stable amount
     * @return Beneficiary address
     * @return Current total stake of tokens on this proposal
     * @return Conviction this proposal had last time calculateAndSetConviction was called
     * @return Block when calculateAndSetConviction was called
     * @return True if proposal has already been executed
     * @return AgreementActionId assigned by the Agreements app
     * @return ProposalStatus defining the state of the proposal
     * @return Submitter of the proposal
     */
    function getProposal(uint256 _proposalId) external view returns (
        uint256 requestedAmount,
        bool stableRequestAmount,
        address beneficiary,
        uint256 stakedTokens,
        uint256 convictionLast,
        uint64 blockLast,
        uint256 agreementActionId,
        ProposalStatus proposalStatus,
        address submitter,
        uint256 threshold
    )
    {
        Proposal storage proposal = proposals[_proposalId];
        threshold = proposal.requestedAmount == 0 ? 0 : calculateThreshold(_getRequestAmount(proposal));
        return (
            proposal.requestedAmount,
            proposal.stableRequestAmount,
            proposal.beneficiary,
            proposal.stakedTokens,
            proposal.convictionLast,
            proposal.blockLast,
            proposal.agreementActionId,
            proposal.proposalStatus,
            proposal.submitter,
            threshold
        );
    }

    /**
     * @notice Get stake of voter `_voter` on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _voter Voter address
     * @return Proposal voter stake
     */
    function getProposalVoterStake(uint256 _proposalId, address _voter) external view returns (uint256) {
        return proposals[_proposalId].voterStake[_voter];
    }

    /**
     * @notice Get the total stake of voter `_voter` on all proposals
     * @param _voter Voter address
     * @return Total voter stake
     */
    function getTotalVoterStake(address _voter) external view returns (uint256) {
        return totalVoterStake[_voter];
    }

    /**
     * @notice Get all proposal ID's voter `_voter` has currently staked to
     * @param _voter Voter address
     * @return Voter proposals
     */
    function getVoterStakedProposals(address _voter) external view returns (uint256[]) {
        return voterStakedProposals[_voter];
    }

    /**
    * @dev IDisputable interface conformance
    */
    function canChallenge(uint256 _proposalId) external view returns (bool) {
        return proposals[_proposalId].proposalStatus == ProposalStatus.Active && !contractPaused;
    }

    /**
    * @dev IDisputable interface conformance
    */
    function canClose(uint256 _proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];

        return proposal.proposalStatus == ProposalStatus.Executed
            || proposal.proposalStatus == ProposalStatus.Cancelled;
    }

    /**
     * @dev Conviction formula: a^t * y(0) + x * (1 - a^t) / (1 - a)
     * Solidity implementation: y = (2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
     * @param _timePassed Number of blocks since last conviction record
     * @param _lastConv Last conviction record
     * @param _oldAmount Amount of tokens staked until now
     * @return Current conviction
     */
    function calculateConviction(uint64 _timePassed, uint256 _lastConv, uint256 _oldAmount) public view returns(uint256) {
        uint256 t = uint256(_timePassed);
        // atTWO_128 = 2^128 * a^t
        uint256 atTWO_128 = _pow((decay << 128).div(D), t);
        // solium-disable-previous-line
        // conviction = (atTWO_128 * _lastConv + _oldAmount * D * (2^128 - atTWO_128) / (D - aD) + 2^127) / 2^128
        return (atTWO_128.mul(_lastConv).add(_oldAmount.mul(D).mul(TWO_128.sub(atTWO_128)).div(D - decay))).add(TWO_127) >> 128;
    }

    /**
     * @dev Formula: ρ * totalStaked / (1 - a) / (β - requestedAmount / total)**2
     * For the Solidity implementation we amplify ρ and β and simplify the formula:
     * weight = ρ * D
     * maxRatio = β * D
     * decay = a * D
     * threshold = weight * totalStaked * D ** 2 * funds ** 2 / (D - decay) / (maxRatio * funds - requestedAmount * D) ** 2
     * @param _requestedAmount Requested amount of tokens on certain proposal
     * @return Threshold a proposal's conviction should surpass in order to be able to
     * executed it.
     */
    function calculateThreshold(uint256 _requestedAmount) public view returns (uint256 _threshold) {
        uint256 funds = fundsManager.balance(requestToken);
        require(maxRatio.mul(funds) > _requestedAmount.mul(D), ERROR_AMOUNT_OVER_MAX_RATIO);
        // denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
        uint256 denom = (maxRatio << 64).div(D).sub((_requestedAmount << 64).div(funds));
        // _threshold = (weight * 2 ** 128 / D) / (denom ** 2 / 2 ** 64) * totalStaked * D / 2 ** 128
        _threshold = ((weight << 128).div(D).div(denom.mul(denom) >> 64)).mul(D).div(D.sub(decay)).mul(_totalStaked()) >> 64;
    }

    function _totalStaked() internal view returns (uint256) {
        uint256 minTotalStake = (stakeToken.totalSupply().mul(minThresholdStakePercentage)).div(ONE_HUNDRED_PERCENT);
        return totalStaked < minTotalStake ? minTotalStake : totalStaked;
    }

    function _getRequestAmount(Proposal storage proposal) internal view returns (uint256) {
        return proposal.stableRequestAmount ?
            stableTokenOracle.consult(stableToken, proposal.requestedAmount, requestToken) : proposal.requestedAmount;
    }

    /**
     * @dev Internal implementation of the `onDisputableActionChallenged` hook
     * @param _proposalId Identification number of the disputable action to be challenged
     */
    function _onDisputableActionChallenged(uint256 _proposalId, uint256  _challengeId, address /* _challenger */) internal {
        Proposal storage proposal = proposals[_proposalId];
        proposal.proposalStatus = ProposalStatus.Paused;

        emit ProposalPaused(_proposalId, _challengeId);
    }

    /**
    * @dev Internal implementation of the `onDisputableActionRejected` hook
    * @param _proposalId Identification number of the disputable action to be rejected
    */
    function _onDisputableActionRejected(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        proposal.proposalStatus = ProposalStatus.Cancelled;

        emit ProposalRejected(_proposalId);
    }

    /**
    * @dev Internal implementation of the `onDisputableActionAllowed` hook
    * @param _proposalId Identification number of the disputable action to be allowed
    */
    function _onDisputableActionAllowed(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        proposal.proposalStatus = ProposalStatus.Active;

        emit ProposalResumed(_proposalId);
    }

    /**
    * @dev Internal implementation of the `onDisputableActionVoided` hook
    * @param _proposalId Identification number of the disputable action to be voided
    */
    function _onDisputableActionVoided(uint256 _proposalId) internal {
        _onDisputableActionAllowed(_proposalId);
    }

    /**
     * @dev Overrides TokenManagerHook's `_onRegisterAsHook`
     */
    function _onRegisterAsHook(address _tokenManager, uint256 _hookId, address _token) internal {
        require(_token == address(stakeToken), ERROR_INCORRECT_TOKEN_MANAGER_HOOK);
    }

    /**
     * @dev Overrides TokenManagerHook's `_onTransfer`
     */
    function _onTransfer(address _from, address _to, uint256 _amount) internal returns (bool) {
        if (_from == 0x0) {
            return true; // Do nothing on token mintings
        }

        uint256 newBalance = stakeToken.balanceOf(_from).sub(_amount);
        if (newBalance < totalVoterStake[_from]) {
            _withdrawInactiveStakedTokens(totalVoterStake[_from].sub(newBalance), _from);
        }

        if (newBalance < totalVoterStake[_from]) {
            _withdrawActiveStakedTokens(totalVoterStake[_from].sub(newBalance), _from);
        }

        return true;
    }

    /**
     * Multiply _a by _b / 2^128.  Parameter _a should be less than or equal to
     * 2^128 and parameter _b should be less than 2^128.
     * @param _a left argument
     * @param _b right argument
     * @return _a * _b / 2^128
     */
    function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a <= TWO_128, "_a should be less than or equal to 2^128");
        require(_b < TWO_128, "_b should be less than 2^128");
        return _a.mul(_b).add(TWO_127) >> 128;
    }

    /**
     * Calculate (_a / 2^128)^_b * 2^128.  Parameter _a should be less than 2^128.
     *
     * @param _a left argument
     * @param _b right argument
     * @return (_a / 2^128)^_b * 2^128
     */
    function _pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a < TWO_128, "_a should be less than 2^128");
        uint256 a = _a;
        uint256 b = _b;
        _result = TWO_128;
        while (b > 0) {
            if (b & 1 == 0) {
                a = _mul(a, a);
                b >>= 1;
            } else {
                _result = _mul(_result, a);
                b -= 1;
            }
        }
    }

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param _proposal Proposal
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
    function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked) internal {
        uint64 blockNumber = getBlockNumber64();
        assert(_proposal.blockLast <= blockNumber);
        if (_proposal.blockLast == blockNumber) {
            return; // Conviction already stored
        }
        // calculateConviction and store it
        uint256 conviction = calculateConviction(
            blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
            _proposal.convictionLast,
            _oldStaked
        );
        _proposal.blockLast = blockNumber;
        _proposal.convictionLast = conviction;
    }

    function _addProposal(string _title, bytes _link, uint256 _requestedAmount, bool _stableRequestAmount, address _beneficiary)
        internal notPaused
    {
        uint256 agreementActionId = _registerDisputableAction(proposalCounter, _link, msg.sender);
        proposals[proposalCounter] = Proposal(
            _requestedAmount,
            _stableRequestAmount,
            _beneficiary,
            0,
            0,
            0,
            agreementActionId,
            ProposalStatus.Active,
            msg.sender
        );

        emit ProposalAdded(msg.sender, proposalCounter, agreementActionId, _title, _link, _requestedAmount, _stableRequestAmount, _beneficiary);
        proposalCounter++;
    }

    /**
     * @dev Stake an amount of tokens on a proposal
     * @param _proposalId Proposal id
     * @param _amount Amount of staked tokens
     * @param _from Account from which we stake
     */
    function _stake(uint256 _proposalId, uint256 _amount, address _from) internal notPaused proposalExists(_proposalId) {
        require(getTokenManager() != address(0), ERROR_NO_TOKEN_MANAGER_SET);

        Proposal storage proposal = proposals[_proposalId];
        require(_amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);
        require(proposal.proposalStatus == ProposalStatus.Active || proposal.proposalStatus == ProposalStatus.Paused,
            ERROR_INCORRECT_PROPOSAL_STATUS);

        uint256 unstakedAmount = stakeToken.balanceOf(_from).sub(totalVoterStake[_from]);
        if (_amount > unstakedAmount) {
            _withdrawInactiveStakedTokens(_amount.sub(unstakedAmount), _from);
        }

        require(totalVoterStake[_from].add(_amount) <= stakeToken.balanceOf(_from), ERROR_STAKING_MORE_THAN_AVAILABLE);

        uint256 previousStake = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.add(_amount);
        proposal.voterStake[_from] = proposal.voterStake[_from].add(_amount);
        totalVoterStake[_from] = totalVoterStake[_from].add(_amount);
        totalStaked = totalStaked.add(_amount);

        if (proposal.blockLast == 0) {
            proposal.blockLast = getBlockNumber64();
        } else {
            _calculateAndSetConviction(proposal, previousStake);
        }

        _updateVoterStakedProposals(_proposalId, _from);

        emit StakeAdded(_from, _proposalId, _amount, proposal.voterStake[_from], proposal.stakedTokens, proposal.convictionLast);
    }

    function _updateVoterStakedProposals(uint256 _proposalId, address _submitter) internal {
        uint256[] storage voterStakedProposalsArray = voterStakedProposals[_submitter];

        if (!voterStakedProposalsArray.contains(_proposalId)) {
            require(voterStakedProposalsArray.length < MAX_STAKED_PROPOSALS, ERROR_MAX_PROPOSALS_REACHED);
            voterStakedProposalsArray.push(_proposalId);
        }
    }

    /**
     * @dev Withdraw staked tokens from executed proposals until a target amount is reached.
     * @param _targetAmount Target at which to stop withdrawing tokens
     * @param _from Account to withdraw from
     */
    function _withdrawInactiveStakedTokens(uint256 _targetAmount, address _from) internal {
        uint256 i = 0;
        uint256 toWithdraw;
        uint256 withdrawnAmount = 0;
        uint256[] memory voterStakedProposalsCopy = voterStakedProposals[_from];

        while (i < voterStakedProposalsCopy.length && withdrawnAmount < _targetAmount) {
            uint256 proposalId = voterStakedProposalsCopy[i];
            Proposal storage proposal = proposals[proposalId];

            if (proposal.proposalStatus == ProposalStatus.Executed || proposal.proposalStatus == ProposalStatus.Cancelled) {
                toWithdraw = proposal.voterStake[_from];
                if (toWithdraw > 0) {
                    _withdrawFromProposal(proposalId, toWithdraw, _from);
                    withdrawnAmount = withdrawnAmount.add(toWithdraw);
                }
            }
            i++;
        }
    }

    /**
     * @dev Withdraw staked tokens from active proposals until a target amount is reached.
     *      Assumes there are no inactive staked proposals, to save gas.
     * @param _targetAmount Target at which to stop withdrawing tokens
     * @param _from Account to withdraw from
     */
    function _withdrawActiveStakedTokens(uint256 _targetAmount, address _from) internal {
        uint256 i = 0;
        uint256 toWithdraw;
        uint256 withdrawnAmount = 0;
        uint256[] memory voterStakedProposalsCopy = voterStakedProposals[_from];

        if (voterStakedProposals[_from].contains(ABSTAIN_PROPOSAL_ID)) {
            toWithdraw = Math.min256(_targetAmount, proposals[ABSTAIN_PROPOSAL_ID].voterStake[_from]);
            if (toWithdraw > 0) {
                _withdrawFromProposal(ABSTAIN_PROPOSAL_ID, toWithdraw, _from);
                withdrawnAmount = withdrawnAmount.add(toWithdraw);
            }
        }

        // We reset this variable as _withdrawFromProposal can update voterStakedProposals
        voterStakedProposalsCopy = voterStakedProposals[_from];

        while (i < voterStakedProposalsCopy.length && withdrawnAmount < _targetAmount) {
            uint256 proposalId = voterStakedProposalsCopy[i];
            Proposal storage proposal = proposals[proposalId];

            // For active proposals, we only subtract the needed amount to reach the target
            toWithdraw = Math.min256(_targetAmount.sub(withdrawnAmount), proposal.voterStake[_from]);
            if (toWithdraw > 0) {
                _withdrawFromProposal(proposalId, toWithdraw, _from);
                withdrawnAmount = withdrawnAmount.add(toWithdraw);
            }
            i++;
        }
    }

    /**
     * @dev Withdraw an amount of tokens from a proposal
     * @param _proposalId Proposal id
     * @param _amount Amount of withdrawn tokens
     * @param _from Account to withdraw from
     */
    function _withdrawFromProposal(uint256 _proposalId, uint256 _amount, address _from) internal {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.voterStake[_from] >= _amount, ERROR_WITHDRAW_MORE_THAN_STAKED);
        require(_amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);

        uint256 previousStake = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.sub(_amount);
        proposal.voterStake[_from] = proposal.voterStake[_from].sub(_amount);
        totalVoterStake[_from] = totalVoterStake[_from].sub(_amount);
        totalStaked = totalStaked.sub(_amount);

        if (proposal.voterStake[_from] == 0) {
            voterStakedProposals[_from].deleteItem(_proposalId);
        }

        if (proposal.proposalStatus == ProposalStatus.Active || proposal.proposalStatus == ProposalStatus.Paused) {
            _calculateAndSetConviction(proposal, previousStake);
        }

        emit StakeWithdrawn(_from, _proposalId, _amount, proposal.voterStake[_from], proposal.stakedTokens, proposal.convictionLast);
    }
}
