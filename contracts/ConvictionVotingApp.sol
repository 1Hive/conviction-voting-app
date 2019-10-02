pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";


contract ConvictionVotingApp is AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    // Events
    event ProposalAdded(address entity, uint256 id, string title, bytes ipfsHash, uint256 amount, address beneficiary);
    event StakeChanged(address entity, uint256 id, uint256 tokensStaked, uint256 totalTokensStaked, uint256 conviction);
    event ProposalExecuted(uint256 id, uint256 conviction);

    // Constants
    uint256 public constant TIME_UNIT = 1;
    uint256 public constant D = 10;
    uint256 public constant MAX_T = 77; // MAX_T = floor(log(2**256 - 1) / log(D))
    // Variable `t` can't surpass MAX_T because D**(MAX_T+1) = 10**78 overflows uint256

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
        uint256 _weight = (_maxRatio**2).div(D).mul(5); // _maxRatio^2 won't overflow
        initialize(_stakeToken, _vault, _requestToken, _decay, _maxRatio, _weight);
    }

    function initialize(MiniMeToken _stakeToken, Vault _vault, address _requestToken, uint256 _decay, uint256 _maxRatio, uint256 _weight) public onlyInit {
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
     * @notice Add proposal `_title` for `@tokenAmount(requestToken, _requestedAmount)` to `_beneficiary`
     * @param _title Title of the proposal
     * @param _ipfsHash IPFS file with proposal's description
     * @param _requestedAmount Tokens requested
     * @param _beneficiary Address that will receive payment
     */
    function addProposal(
        string _title,
        bytes _ipfsHash,
        uint256 _requestedAmount,
        address _beneficiary
    )
        external
        isInitialized()
    {
        proposals[proposalCounter] = Proposal(
            _requestedAmount,
            _beneficiary,
            0,
            0,
            0,
            false
        );
        emit ProposalAdded(msg.sender, proposalCounter, _title, _ipfsHash, _requestedAmount, _beneficiary);
        proposalCounter++;
    }

    /**
      * @notice Stake `@tokenAmount(token, amount)` on proposal #`id`
      * @param id Proposal id
      * @param amount Amount of tokens staked
      */
    function stakeToProposal(uint256 id, uint256 amount) external isInitialized() {
        stake(id, amount);
    }

    /**
     * @notice Stake all my tokens on #`id`
     * @param id Proposal id
     */
    function stakeAllToProposal(uint256 id) external isInitialized() {
        // TODO: Should we withdraw tokens from other proposals in just one tx?
        // uint256 i = 0;
        // while (i < proposalCounter && stakesPerVoter[msg.sender] > 0) {
        //     if (proposals[i].stakesPerVoter[msg.sender] > 0) {
        //         withdraw(i, proposals[i].stakesPerVoter[msg.sender]);
        //     }
        //     i++;
        // }
        require(stakesPerVoter[msg.sender] == 0, ERROR_STAKING_ALREADY_STAKED);
        stake(id, stakeToken.balanceOf(msg.sender));
    }

    /**
     * @notice Withdraw `@tokenAmount(token, amount)` previously staked on proposal #`id`
     * @param id Proposal id
     * @param amount Amount of tokens withdrawn
     */
    function withdrawFromProposal(uint256 id, uint256 amount) external isInitialized() {
        withdraw(id, amount);
    }

    /**
     * @notice Withdraw all tokens previously staked on proposal #`id`
     * @param id Proposal id
     */
    function withdrawAllFromProposal(uint256 id) external isInitialized() {
        withdraw(id, proposals[id].stakedTokens);
    }

    /**
     * @notice Execute proposal #`id` by sending `proposals[id].requestedAmount` to `proposals[id].beneficiary`
     * @param id Proposal id
     */
    function executeProposal(uint256 id) external isInitialized() {
        Proposal storage proposal = proposals[id];
        require(!proposal.executed, ERROR_PROPOSAL_ALREADY_EXECUTED);
        proposal.executed = true;
        calculateAndSetConviction(id, proposal.stakedTokens);
        require(proposal.convictionLast > calculateThreshold(proposal.requestedAmount), ERROR_INSUFFICIENT_CONVICION_TO_EXECUTE);
        emit ProposalExecuted(id, proposal.convictionLast);
        // TODO Check if enough funds?
        vault.transfer(requestToken, proposal.beneficiary, proposal.requestedAmount);
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
        uint256 aD = decay;
        uint256 Dt = D**t;
        uint256 aDt_1 = aD**(t-1);
        uint256 aDt = aDt_1 * t;
        if (Dt  > D**(t - 1)) { // no overflow
          conviction = aDt.mul(lastConv).add((oldAmount.mul(D).mul(Dt.sub(aDt))).div(D.sub(aD))).div(Dt);
        } else {
          // We neglect lastConv when timePassed is big enough because lim [ a^t ] = 0 when t -> infinity
          conviction = oldAmount.mul(D).div(D.sub(aD));
        }
    }

    /**
     * @dev Formula: wS/(β-r)^2, r = requested/total
     * @param requestedAmount Requested amount of tokens on certain proposal
     * @return Threshold a proposal's conviction should surpass in order to be able to executed it
     */
    function calculateThreshold(uint256 requestedAmount) public view returns (uint256 threshold) {
        uint256 totalFunds = vault.balance(requestToken);
        threshold = weight.mul(stakeToken.totalSupply());
        threshold = threshold.div(maxRatio.sub(requestedAmount.mul(D).div(totalFunds))**2); // (β-r)^2 won't overflow
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
        require(stakesPerVoter[msg.sender].add(amount) <= stakeToken.balanceOf(msg.sender), ERROR_STAKED_MORE_THAN_OWNED);
        require(amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);

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
        calculateAndSetConviction(id, oldStaked);
        emit StakeChanged(msg.sender, id, proposal.stakesPerVoter[msg.sender], proposal.stakedTokens, proposal.convictionLast);
    }
}
