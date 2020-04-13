pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";


contract ConvictionVoting is AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    // Events
    event ProposalAdded(address entity, uint256 id, string title, bytes link, uint256 amount, address beneficiary);
    event StakeChanged(address entity, uint256 id, uint256 tokensStaked, uint256 totalTokensStaked, uint256 conviction);
    event ProposalExecuted(uint256 id, uint256 conviction);

    // Constants
    uint256 public constant TIME_UNIT = 1;
    uint256 public constant D = 10;
    uint256 constant TWO_128 = 0x100000000000000000000000000000000; // 2^128
    uint256 constant TWO_127 = 0x80000000000000000000000000000000; // 2^127

    // State
    uint256 public decay;
    uint256 public weight;
    uint256 public maxRatio;
    uint256 public proposalCounter;
    MiniMeToken public stakeToken;
    address public requestToken;
    Vault public vault;

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public stakesPerVoter;

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

    function initialize(MiniMeToken _stakeToken, Vault _vault, address _requestToken) public onlyInit {
        uint256 _decay = 9;
        uint256 _maxRatio = 2; // 20%
        uint256 _weight = 2; // 0.5 * maxRatio ^ 2
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
      * @notice Stake `@tokenAmount((self.stakeToken(): address), amount)` on proposal #`id`
      * @param id Proposal id
      * @param amount Amount of tokens staked
      */
    function stakeToProposal(uint256 id, uint256 amount) external isInitialized() {
        stake(id, amount);
    }

    /**
     * @notice Stake all my `(self.stakeToken(): address).symbol(): string` tokens on proposal #`id`
     * @param id Proposal id
     */
    function stakeAllToProposal(uint256 id) external isInitialized() {
        require(stakesPerVoter[msg.sender] == 0, ERROR_STAKING_ALREADY_STAKED);
        stake(id, stakeToken.balanceOf(msg.sender));
    }

    /**
     * @notice Withdraw `@tokenAmount((self.stakeToken(): address), amount)` previously staked on proposal #`id`
     * @param id Proposal id
     * @param amount Amount of tokens withdrawn
     */
    function withdrawFromProposal(uint256 id, uint256 amount) external isInitialized() {
        withdraw(id, amount);
    }

    /**
     * @notice Withdraw all `(self.stakeToken(): address).symbol(): string` tokens previously staked on proposal #`id`
     * @param id Proposal id
     */
    function withdrawAllFromProposal(uint256 id) external isInitialized() {
        withdraw(id, proposals[id].stakesPerVoter[msg.sender]);
    }

    /**
     * @notice Execute proposal #`id`
     * @dev ...by sending `@tokenAmount((self.requestToken(): address), self.getPropoal(id): ([uint256], address, uint256, uint256, uint64, bool))` to `self.getPropoal(id): (uint256, [address], uint256, uint256, uint64, bool)`
     * @param id Proposal id
     * @param _withdrawIfPossible True if sender's staked tokens should be withdrawed after execution
     */
    function executeProposal(uint256 id, bool _withdrawIfPossible) external isInitialized() {
        Proposal storage proposal = proposals[id];
        require(!proposal.executed, ERROR_PROPOSAL_ALREADY_EXECUTED);
        proposal.executed = true;
        calculateAndSetConviction(id, proposal.stakedTokens);
        require(proposal.convictionLast > calculateThreshold(proposal.requestedAmount), ERROR_INSUFFICIENT_CONVICION_TO_EXECUTE);
        emit ProposalExecuted(id, proposal.convictionLast);
        vault.transfer(requestToken, proposal.beneficiary, proposal.requestedAmount);
        if (_withdrawIfPossible && proposal.stakesPerVoter[msg.sender] > 0) {
            withdraw(id, proposal.stakesPerVoter[msg.sender]);
        }
    }

    /**
     * @dev Get proposal parameters
     * @param id Proposal id
     * @return Requested amount
     * @return Beneficiary address
     * @return Current total stake of tokens on this proposal
     * @return Conviction this proposal had last time calculateAndSetConviction was called
     * @return Block when calculateAndSetConviction was called
     * @return True if proposal has already been executed
     */
    function getProposal (uint256 id) public view returns (
        uint256,
        address,
        uint256,
        uint256,
        uint64,
        bool
    )
    {
        Proposal storage proposal = proposals[id];
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
     * @notice Get stake of voter `voter` on proposal #`id`
     * @param id Proposal id
     * @param voter Entity address that previously might voted on that proposal
     * @return Current amount of staked tokens by voter on proposal
     */
    function getProposalVoterStake(uint256 id, address voter) public view returns (uint256) {
        return proposals[id].stakesPerVoter[voter];
    }

    /**
     * @dev Conviction formula: a^t * y(0) + x * (1 - a^t) / (1 - a)
     * Solidity implementation: y = (2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
     * @param timePassed Number of blocks since last conviction record
     * @param lastConv Last conviction record
     * @param oldAmount Amount of tokens staked until now
     * @return Current conviction
     */
    function calculateConviction(
        uint64 timePassed,
        uint256 lastConv,
        uint256 oldAmount
    )
        public view returns(uint256 conviction)
    {
        uint256 t = uint256(timePassed).div(TIME_UNIT);
        // atTWO_128 = 2^128 * a^t
        uint256 atTWO_128 = pow((decay << 128).div(D), t);
        // conviction = (atTWO_128 * lastConv + oldAmount * D * (2^128 - atTWO_128) / (D - aD) + 2^127) / 2^128
        conviction = (atTWO_128.mul(lastConv).add(oldAmount.mul(D).mul(TWO_128.sub(atTWO_128)).div(D - decay))).add(TWO_127) >> 128;
    }

    /**
     * @dev Formula: ρ * supply / (β - requestedAmount / total)**2
     * For the Solidity implementation we amplify ρ and β and simplify the formula:
     * weight = ρ * D ** 2
     * maxRatio = β * D
     * threshold = weight * supply * funds ** 2 / (maxRatio * funds - requestedAmount * D) ** 2
     * @param requestedAmount Requested amount of tokens on certain proposal
     * @return Threshold a proposal's conviction should surpass in order to be able to
     * executed it.
     */
    function calculateThreshold(uint256 requestedAmount) public view returns (uint256 threshold) {
        uint256 funds = vault.balance(requestToken);
        uint256 supply = stakeToken.totalSupply();
        // denom = maxRatio * funds - requestedAmount * D
        uint256 denom = maxRatio.mul(funds).sub(requestedAmount.mul(D));
        // threshold = weight * supply * funds ** 2
        threshold = weight.mul(supply).mul(funds).mul(funds);
        // threshold /= denom ** 2
        threshold = threshold.div(denom.mul(denom));
    }

    /**
     * Multiply _a by _b / 2^128.  Parameter _a should be less than or equal to
     * 2^128 and parameter _b should be less than 2^128.
     * @param _a left argument
     * @param _b right argument
     * @return _a * _b / 2^128
     */
    function mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
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
    function pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a < TWO_128, "_a should be less than 2^128");

        _result = TWO_128;
        while (_b > 0) {
            if (_b & 1 == 0) {
                _a = mul (_a, _a);
                _b >>= 1;
            } else {
                _result = mul (_result, _a);
                _b -= 1;
            }
        }
    }

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param id Proposal id
     * @param oldStaked Amount of tokens staked on a proposal until now
     */
    function calculateAndSetConviction(uint256 id, uint256 oldStaked) internal {
        Proposal storage proposal = proposals[id];
        uint64 blockNumber = getBlockNumber64();
        assert(proposal.blockLast <= blockNumber);
        if (proposal.blockLast == blockNumber) {
            return; // Conviction already stored
        }
        // calculateConviction and store it
        uint256 conviction = calculateConviction(
            blockNumber - proposal.blockLast, // we assert it doesn't overflow above
            proposal.convictionLast,
            oldStaked
        );
        proposal.blockLast = blockNumber;
        proposal.convictionLast = conviction;
    }

    /**
     * @dev Stake an amount of tokens on a proposal
     * @param id Proposal id
     * @param amount Amount of staked tokens
     */
    function stake(uint256 id, uint256 amount) internal {
        // make sure user does not stake more than she has
        require(amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);
        uint256 unstaked = stakeToken.balanceOf(msg.sender).sub(stakesPerVoter[msg.sender]);
        if (amount > unstaked) {
            withdrawTokensFromExecutedProposals(amount.sub(unstaked));
        }
        require(stakesPerVoter[msg.sender].add(amount) <= stakeToken.balanceOf(msg.sender), ERROR_STAKED_MORE_THAN_OWNED);
        Proposal storage proposal = proposals[id];
        uint256 oldStaked = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.add(amount);
        proposal.stakesPerVoter[msg.sender] = proposal.stakesPerVoter[msg.sender].add(amount);
        stakesPerVoter[msg.sender] = stakesPerVoter[msg.sender].add(amount);
        if (proposal.blockLast == 0) {
            proposal.blockLast = getBlockNumber64();
        }
        calculateAndSetConviction(id, oldStaked);
        emit StakeChanged(msg.sender, id, proposal.stakesPerVoter[msg.sender], proposal.stakedTokens, proposal.convictionLast);
    }

    /**
     * @dev Withdraw staked tokens from executed proposals until
     * a target amount is reached.
     * @param _targetAmount Amount of withdrawn tokens.
     */
    function withdrawTokensFromExecutedProposals(uint256 _targetAmount) internal {
        uint i = 0;
        uint256 amount = 0;
        while (i < proposalCounter && amount < _targetAmount) {
            Proposal storage proposal = proposals[i];
            uint256 voterStakes = proposal.stakesPerVoter[msg.sender];
            if (proposal.executed && voterStakes > 0) {
                withdraw(i, voterStakes);
                amount = amount.add(voterStakes);
           }
            i++;
        }
    }

    /**
     * @dev Withdraw an amount of tokens from a proposal
     * @param id Proposal id
     * @param amount Amount of withdrawn tokens
     */
    function withdraw(uint256 id, uint256 amount) internal {
        // make sure voter does not withdraw more than staked on proposal
        require(proposals[id].stakesPerVoter[msg.sender] >= amount, ERROR_WITHDRAWED_MORE_THAN_STAKED);
        require(amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);

        Proposal storage proposal = proposals[id];
        uint256 oldStaked = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.sub(amount);
        proposal.stakesPerVoter[msg.sender] = proposal.stakesPerVoter[msg.sender].sub(amount);
        stakesPerVoter[msg.sender] = stakesPerVoter[msg.sender].sub(amount);
        if (!proposal.executed) {
            calculateAndSetConviction(id, oldStaked);
        }
        emit StakeChanged(msg.sender, id, proposal.stakesPerVoter[msg.sender], proposal.stakedTokens, proposal.convictionLast);
    }
}
