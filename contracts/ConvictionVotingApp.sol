pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";


contract ConvictionVotingApp is AragonApp {

    /// Events
    event ProposalAdded(address entity, uint256 id, string title, uint256 amount, address beneficiary);
    event Staked(address entity, uint256 id, uint256 stakedTokens, uint256 conviction);
    event Withdrawn(address entity, uint256 id, uint256 stakedTokens, uint256 conviction);
    event ProposalPassed(uint256 id, uint256 conviction);

    /// State
    uint256 public constant TIME_UNIT = 1;
    uint256 public constant PADD = 10;
    uint256 public constant CONV_ALPHA = 9 * PADD;
    uint256 public weight = 5;
    uint256 public maxFunded = 8;  // from 10
    uint256 proposalCounter = 1;
    MiniMeToken public token;
    Vault public vault;

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public stakesPerVoter;

    struct Proposal {
        uint256 amountCommons;
        uint256 externalId;  // github issue id
        address beneficiary;  // gitcoin beneficiary
        uint256 stakedTokens;
        uint256 sentEther;
        uint256 convictionLast;
        uint256 blockLast;
        mapping(address => uint256) stakesPerVoter;
    }

    /// ACL
    bytes32 constant public CREATE_PROPOSALS_ROLE = keccak256("CREATE_PROPOSALS_ROLE");

    // Errors
    string private constant ERROR_STAKED_MORE_THAN_OWNED = "CONVICTION_VOTING_STAKED_MORE_THAN_OWNED";
    string private constant ERROR_WITHDRAWED_MORE_THAN_STAKED = "CONVICTION_VOTING_WITHDRAWED_MORE_THAN_STAKED";

    function initialize(MiniMeToken _token, Vault _vault) public onlyInit {
        token = _token;
        vault = _vault;
        initialized();
    }

    function addProposal(
        string _title,
        uint256 _amountCommons,
        address _beneficiary
    )
        external
    {
        proposals[proposalCounter] = Proposal(
            _amountCommons,
            0,
            _beneficiary,
            0,
            0,
            0,
            0
        );
        emit ProposalAdded(msg.sender, proposalCounter, _title, _amountCommons, _beneficiary);
        proposalCounter++;
    }

    function stakeToProposal(uint256 id, uint256 amount) external {
        // make sure user does not stake more than he has
        require(stakesPerVoter[msg.sender] + amount < token.balanceOf(msg.sender), ERROR_STAKED_MORE_THAN_OWNED);

        Proposal storage proposal = proposals[id];
        uint256 oldStaked = proposal.stakedTokens;
        proposal.stakesPerVoter[msg.sender] += amount;
        proposal.stakedTokens += amount;

        if (proposal.blockLast == 0) {
            proposal.blockLast = block.number - TIME_UNIT;
        }
        stakesPerVoter[msg.sender] += amount;
        calculateAndSetConviction(id, oldStaked);
        emit Staked(msg.sender, id, proposal.stakedTokens, proposal.convictionLast);
    }

    function stakeAllToProposal(uint256 id) external {
        // TODO call to stakeToProposal(uint256 id, uint256 amount)
        Proposal storage proposal = proposals[id];
        emit Staked(msg.sender, id, proposal.stakedTokens, proposal.convictionLast);
    }

    function withdrawFromProposal(uint256 id, uint256 amount) external {
        Proposal storage proposal = proposals[id];

        require(proposal.stakesPerVoter[msg.sender] >= amount, ERROR_WITHDRAWED_MORE_THAN_STAKED);

        uint256 oldStaked = proposal.stakedTokens;
        proposal.stakedTokens -= amount;
        stakesPerVoter[msg.sender] -= amount;
        calculateAndSetConviction(id, oldStaked);
        emit Withdrawn(msg.sender, id, proposal.stakedTokens, proposal.convictionLast);
    }

    function widthdrawAllFromProposal(uint256 id) external {
        // TODO Call to withdrawFromProposal(uint256 id, uint256 amount)
        Proposal storage proposal = proposals[id];
        emit Withdrawn(msg.sender, id, proposal.stakedTokens, proposal.convictionLast);
    }

    // TODO Use the vault
    function sendToProposal(uint256 id) external payable {
        proposals[id].sentEther += msg.value;
        proposals[id].beneficiary.transfer(msg.value);
    }

    function getProposal (uint256 id) public view returns (
        uint256,
        uint256,
        address,
        uint256,
        uint256,
        uint256,
        uint256
    )
    {
        Proposal storage proposal = proposals[id];
        return (
            proposal.amountCommons,
            proposal.externalId,
            proposal.beneficiary,
            proposal.stakedTokens,
            proposal.sentEther,
            proposal.convictionLast,
            proposal.blockLast
        );
    }

    function getProposalVoterStake(uint256 id, address voter) public view returns (uint256) {
        return proposals[id].stakesPerVoter[voter];
    }

    function calculateConviction(
        uint256 timePassed,
        uint256 lastConv,
        uint256 oldAmount,
        uint256 newAmount
    )
        public view returns(uint256 conviction)
    {
        uint256 steps = timePassed / TIME_UNIT;
        uint256 i;
        conviction = lastConv;
        for (i = 0; i < steps - 1; i++) {
            conviction = CONV_ALPHA * conviction / PADD / 10 + oldAmount;
        }
        conviction = CONV_ALPHA * conviction / PADD / 10 + newAmount;
        return conviction;
    }

    function calculateThreshold(uint256 amountCommons) public view returns (uint256 threshold) {
        // - wS/(β-r)^2
        uint256 totalCommons = address(this).balance;
        threshold = weight * token.totalSupply();
        threshold /= (
            maxFunded -
            (amountCommons * PADD / totalCommons)
        ) ** 2;
    }

    function calculateAndSetConviction(uint256 id, uint256 oldStaked) internal {
        Proposal storage proposal = proposals[id];
        // calculateConviction and store it
        uint256 conviction = calculateConviction(
            block.number - proposal.blockLast,
            proposal.convictionLast,
            oldStaked,
            proposal.stakedTokens
        );
        proposal.blockLast = block.number;
        proposal.convictionLast = conviction;
        if (conviction > calculateThreshold(proposal.amountCommons)) {
            emit ProposalPassed(id, conviction);
        }
    }
}
