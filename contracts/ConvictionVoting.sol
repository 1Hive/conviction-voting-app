pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/math/Math.sol";
import "@1hive/apps-token-manager/contracts/TokenManagerHook.sol";


contract ConvictionVoting is AragonApp, TokenManagerHook {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    // Events
    event ProposalAdded(address entity, uint256 id, string title, bytes link, uint256 amount, address beneficiary);
    event StakeAdded(address entity, uint256 id, uint256  amount, uint256 tokensStaked, uint256 totalTokensStaked, uint256 conviction);
    event StakeWithdrawn(address entity, uint256 id, uint256 amount, uint256 tokensStaked, uint256 totalTokensStaked, uint256 conviction);
    event ProposalExecuted(uint256 id, uint256 conviction);

    // Constants
    uint256 public constant D = 10000000;
    uint256 constant TWO_128 = 0x100000000000000000000000000000000; // 2^128
    uint256 constant TWO_127 = 0x80000000000000000000000000000000; // 2^127
    uint256 constant TWO_64 = 0x10000000000000000; // 2^64

    // State
    uint256 public decay;
    uint256 public weight;
    uint256 public maxRatio;
    uint256 public proposalCounter;
    MiniMeToken public stakeToken;
    address public requestToken;
    Vault public vault;

    mapping(uint256 => Proposal) internal proposals;
    mapping(address => uint256) internal stakesPerVoter;

    // Structs
    struct Proposal {
        uint256 requestedAmount;
        address beneficiary;
        uint256 stakedTokens;
        uint256 convictionLast;
        uint64 blockLast;
        bool executed;
        mapping(address => uint256) stakesPerVoter;
    }

    // ACL
    bytes32 constant public CREATE_PROPOSALS_ROLE = keccak256("CREATE_PROPOSALS_ROLE");

    // Errors
    string private constant ERROR_STAKED_MORE_THAN_OWNED = "CONVICTION_VOTING_STAKED_MORE_THAN_OWNED";
    string private constant ERROR_STAKING_ALREADY_STAKED = "CONVICTION_VOTING_STAKING_ALREADY_STAKED";
    string private constant ERROR_WITHDRAWED_MORE_THAN_STAKED = "CONVICTION_VOTING_WITHDRAWED_MORE_THAN_STAKED";
    string private constant ERROR_PROPOSAL_ALREADY_EXECUTED = "CONVICTION_VOTING_PROPOSAL_ALREADY_EXECUTED";
    string private constant ERROR_INSUFFICIENT_CONVICION_TO_EXECUTE = "CONVICTION_VOTING_ERROR_INSUFFICIENT_CONVICION_TO_EXECUTE";
    string private constant ERROR_AMOUNT_CAN_NOT_BE_ZERO = "CONVICTION_VOTING_ERROR_AMOUNT_CAN_NOT_BE_ZERO";
    string private constant ERROR_AMOUNT_OVER_MAX_RATIO = "CONVICTION_VOTING_ERROR_AMOUNT_OVER_MAX_RATIO";
    string private constant ERROR_INCORRECT_TOKEN_MANAGER_HOOK = "CONVICTION_VOTING_ERROR_INCORRECT_TOKEN_MANAGER_HOOK";

    function initialize(MiniMeToken _stakeToken, Vault _vault, address _requestToken) public onlyInit {
        uint256 _decay = 9999599; // 3 days halftime. halftime_alpha = (1/2)**(1/t)
        uint256 _maxRatio = 2000000; // 20%
        uint256 _weight = 20000; // 0.05 * maxRatio ^ 2
        initialize(_stakeToken, _vault, _requestToken, _decay, _maxRatio, _weight);
    }

    function initialize(MiniMeToken _stakeToken, Vault _vault, address _requestToken, uint256 _decay, uint256 _maxRatio) public onlyInit {
        uint256 _weight = (_maxRatio**2).mul(5).div(D); // _maxRatio^2 won't overflow
        initialize(_stakeToken, _vault, _requestToken, _decay, _maxRatio, _weight);
    }

    function initialize(
        MiniMeToken _stakeToken,
        Vault _vault,
        address _requestToken,
        uint256 _decay,
        uint256 _maxRatio,
        uint256 _weight
    )
        public onlyInit
    {
        proposalCounter = 1; // First proposal should be #1, not #0
        stakeToken = _stakeToken;
        requestToken = _requestToken;
        vault = _vault;
        decay = _decay;
        maxRatio = _maxRatio;
        weight = _weight;
        initialized();
    }

    /**
     * @notice Add proposal `_title` for  `@tokenAmount((self.requestToken(): address), _requestedAmount)` to `_beneficiary`
     * @param _title Title of the proposal
     * @param _link IPFS or HTTP link with proposal's description
     * @param _requestedAmount Tokens requested
     * @param _beneficiary Address that will receive payment
     */
    function addProposal(
        string _title,
        bytes _link,
        uint256 _requestedAmount,
        address _beneficiary
    )
        external isInitialized()
    {
        proposals[proposalCounter] = Proposal(
            _requestedAmount,
            _beneficiary,
            0,
            0,
            0,
            false
        );
        emit ProposalAdded(msg.sender, proposalCounter, _title, _link, _requestedAmount, _beneficiary);
        proposalCounter++;
    }

    /**
      * @notice Stake `@tokenAmount((self.stakeToken(): address), _amount)` on proposal #`_id`
      * @param _id Proposal id
      * @param _amount Amount of tokens staked
      */
    function stakeToProposal(uint256 _id, uint256 _amount) external isInitialized() {
        _stake(_id, _amount, msg.sender);
    }

    /**
     * @notice Stake all my `(self.stakeToken(): address).symbol(): string` tokens on proposal #`_id`
     * @param _id Proposal id
     */
    function stakeAllToProposal(uint256 _id) external isInitialized() {
        require(stakesPerVoter[msg.sender] == 0, ERROR_STAKING_ALREADY_STAKED);
        _stake(_id, stakeToken.balanceOf(msg.sender), msg.sender);
    }

    /**
     * @notice Withdraw `@tokenAmount((self.stakeToken(): address), _amount)` previously staked on proposal #`_id`
     * @param _id Proposal id
     * @param _amount Amount of tokens withdrawn
     */
    function withdrawFromProposal(uint256 _id, uint256 _amount) external isInitialized() {
        _withdraw(_id, _amount, msg.sender);
    }

    /**
     * @notice Withdraw all `(self.stakeToken(): address).symbol(): string` tokens previously staked on proposal #`_id`
     * @param _id Proposal id
     */
    function withdrawAllFromProposal(uint256 _id) external isInitialized() {
        _withdraw(_id, proposals[_id].stakesPerVoter[msg.sender], msg.sender);
    }

    /**
     * @notice Execute proposal #`_id`
     * @dev ...by sending `@tokenAmount((self.requestToken(): address), self.getPropoal(_id): ([uint256], address, uint256, uint256, uint64, bool))` to `self.getPropoal(_id): (uint256, [address], uint256, uint256, uint64, bool)`
     * @param _id Proposal id
     * @param _withdrawIfPossible True if sender's staked tokens should be withdrawed after execution
     */
    function executeProposal(uint256 _id, bool _withdrawIfPossible) external isInitialized() {
        Proposal storage proposal = proposals[_id];
        require(!proposal.executed, ERROR_PROPOSAL_ALREADY_EXECUTED);
        proposal.executed = true;
        _calculateAndSetConviction(_id, proposal.stakedTokens);
        require(proposal.convictionLast > calculateThreshold(proposal.requestedAmount), ERROR_INSUFFICIENT_CONVICION_TO_EXECUTE);
        emit ProposalExecuted(_id, proposal.convictionLast);
        vault.transfer(requestToken, proposal.beneficiary, proposal.requestedAmount);
        if (_withdrawIfPossible && proposal.stakesPerVoter[msg.sender] > 0) {
            _withdraw(_id, proposal.stakesPerVoter[msg.sender], msg.sender);
        }
    }

    /**
     * @dev Get proposal parameters
     * @param _id Proposal id
     * @return Requested amount
     * @return Beneficiary address
     * @return Current total stake of tokens on this proposal
     * @return Conviction this proposal had last time calculateAndSetConviction was called
     * @return Block when calculateAndSetConviction was called
     * @return True if proposal has already been executed
     */
    function getProposal(uint256 _id) public view returns (
        uint256,
        address,
        uint256,
        uint256,
        uint64,
        bool
    )
    {
        Proposal storage proposal = proposals[_id];
        return (
            proposal.requestedAmount,
            proposal.beneficiary,
            proposal.stakedTokens,
            proposal.convictionLast,
            proposal.blockLast,
            proposal.executed
        );
    }

    /**
     * @notice Get stake of voter `_voter` on proposal #`_id`
     * @param _id Proposal id
     * @param _voter Entity address that previously might voted on that proposal
     * @return Current amount of staked tokens by voter on proposal
     */
    function getProposalVoterStake(uint256 _id, address _voter) public view returns (uint256) {
        return proposals[_id].stakesPerVoter[_voter];
    }

    /**
     * @notice Get total stake of voter `_voter` on proposals
     * @param _voter Entity address that previously might voted on that proposal
     * @return Current amount of staked tokens by voter on proposal
     */
    function getProposalVoterStake(address _voter) public view returns (uint256) {
        return stakesPerVoter[_voter];
    }

    /**
     * @dev Conviction formula: a^t * y(0) + x * (1 - a^t) / (1 - a)
     * Solidity implementation: y = (2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
     * @param _timePassed Number of blocks since last conviction record
     * @param _lastConv Last conviction record
     * @param _oldAmount Amount of tokens staked until now
     * @return Current conviction
     */
    function calculateConviction(
        uint64 _timePassed,
        uint256 _lastConv,
        uint256 _oldAmount
    )
        public view returns(uint256)
    {
        uint256 t = uint256(_timePassed);
        // atTWO_128 = 2^128 * a^t
        uint256 atTWO_128 = _pow((decay << 128).div(D), t);
        // solium-disable-previous-line
        // conviction = (atTWO_128 * _lastConv + _oldAmount * D * (2^128 - atTWO_128) / (D - aD) + 2^127) / 2^128
        return (atTWO_128.mul(_lastConv).add(_oldAmount.mul(D).mul(TWO_128.sub(atTWO_128)).div(D - decay))).add(TWO_127) >> 128;
    }

    /**
     * @dev Formula: ρ * supply / (1 - a) / (β - requestedAmount / total)**2
     * For the Solidity implementation we amplify ρ and β and simplify the formula:
     * weight = ρ * D
     * maxRatio = β * D
     * decay = a * D
     * threshold = weight * supply * D ** 2 * funds ** 2 / (D - decay) / (maxRatio * funds - requestedAmount * D) ** 2
     * @param _requestedAmount Requested amount of tokens on certain proposal
     * @return Threshold a proposal's conviction should surpass in order to be able to
     * executed it.
     */
    function calculateThreshold(uint256 _requestedAmount) public view returns (uint256 _threshold) {
        uint256 funds = vault.balance(requestToken);
        require(maxRatio.mul(funds) > _requestedAmount.mul(D), ERROR_AMOUNT_OVER_MAX_RATIO);
        uint256 supply = stakeToken.totalSupply();
        // denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
        uint256 denom = (maxRatio << 64).div(D).sub((_requestedAmount << 64).div(funds));
        // _threshold = (weight * 2 ** 128 / D) / (denom ** 2 / 2 ** 64) * supply * D / 2 ** 128
        _threshold = ((weight << 128).div(D).div(denom.mul(denom) >> 64)).mul(D).div(D.sub(decay)).mul(supply) >> 64;
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
     * @param _id Proposal id
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
    function _calculateAndSetConviction(uint256 _id, uint256 _oldStaked) internal {
        Proposal storage proposal = proposals[_id];
        uint64 blockNumber = getBlockNumber64();
        assert(proposal.blockLast <= blockNumber);
        if (proposal.blockLast == blockNumber) {
            return; // Conviction already stored
        }
        // calculateConviction and store it
        uint256 conviction = calculateConviction(
            blockNumber - proposal.blockLast, // we assert it doesn't overflow above
            proposal.convictionLast,
            _oldStaked
        );
        proposal.blockLast = blockNumber;
        proposal.convictionLast = conviction;
    }

    /**
     * @dev Stake an amount of tokens on a proposal
     * @param _id Proposal id
     * @param _amount Amount of staked tokens
     * @param _from Account from which we stake
     */
    function _stake(uint256 _id, uint256 _amount, address _from) internal {
        require(_amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);
        uint256 unstaked = stakeToken.balanceOf(_from).sub(stakesPerVoter[_from]);
        if (_amount > unstaked) {
            _withdrawUnstakedTokens(_amount.sub(unstaked), _from, true);
        }
        // make sure user does not stake more than she has
        require(stakesPerVoter[_from].add(_amount) <= stakeToken.balanceOf(_from), ERROR_STAKED_MORE_THAN_OWNED);
        Proposal storage proposal = proposals[_id];
        uint256 oldStaked = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.add(_amount);
        proposal.stakesPerVoter[_from] = proposal.stakesPerVoter[_from].add(_amount);
        stakesPerVoter[_from] = stakesPerVoter[_from].add(_amount);
        if (proposal.blockLast == 0) {
            proposal.blockLast = getBlockNumber64();
        }
        _calculateAndSetConviction(_id, oldStaked);
        emit StakeAdded(_from, _id, _amount, proposal.stakesPerVoter[_from], proposal.stakedTokens, proposal.convictionLast);
    }

    /**
     * @dev Withdraw staked tokens from proposals until a target amount is reached.
     * @param _targetAmount Amount of withdrawn tokens
     * @param _from Account to withdraw from
     * @param _onlyExecuted Withdraw only from executed proposals
     */
    function _withdrawUnstakedTokens(uint256 _targetAmount, address _from, bool _onlyExecuted) internal {
        uint i = 0;
        uint256 amount = 0;
        uint256 toSubstract;
        while (i < proposalCounter && amount < _targetAmount) {
            if (proposals[i].executed) {
                toSubstract = proposals[i].stakesPerVoter[_from];
                if (toSubstract > 0) {
                    _withdraw(i, toSubstract, _from);
                    amount = amount.add(toSubstract);
                }
            }
            i++;
        }
        i = 0;
        while (!_onlyExecuted && i < proposalCounter && amount < _targetAmount) {
            // In open proposals, we only substract the needed amount to reach the target
            toSubstract = Math.min256(_targetAmount.sub(amount), proposals[i].stakesPerVoter[_from]);
            if (toSubstract > 0) {
                _withdraw(i, toSubstract, _from);
                amount = amount.add(toSubstract);
            }
            i++;
        }
    }

    /**
     * @dev Withdraw an amount of tokens from a proposal
     * @param _id Proposal id
     * @param _amount Amount of withdrawn tokens
     * @param _from Account to withdraw from
     */
    function _withdraw(uint256 _id, uint256 _amount, address _from) internal {
        // make sure voter does not withdraw more than staked on proposal
        require(proposals[_id].stakesPerVoter[_from] >= _amount, ERROR_WITHDRAWED_MORE_THAN_STAKED);
        require(_amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);

        Proposal storage proposal = proposals[_id];
        uint256 oldStaked = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.sub(_amount);
        proposal.stakesPerVoter[_from] = proposal.stakesPerVoter[_from].sub(_amount);
        stakesPerVoter[_from] = stakesPerVoter[_from].sub(_amount);
        if (!proposal.executed) {
            _calculateAndSetConviction(_id, oldStaked);
        }
        emit StakeWithdrawn(_from, _id, _amount, proposal.stakesPerVoter[_from], proposal.stakedTokens, proposal.convictionLast);
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
        if (newBalance < stakesPerVoter[_from]) {
            _withdrawUnstakedTokens(stakesPerVoter[_from].sub(newBalance), _from, false);
        }
        return true;
    }
}
