pragma solidity ^0.4.24;

contract Erc721ToErc20 {

    uint256 constant public TOKENS_PER_NFT = 1000e18;

    address public owner;
    address public convictionVoting;
    address public erc721;
    uint256 public totalSupply;
    mapping (address => uint256) public balances;

    modifier onlyOwner() {
        require(msg.sender == owner, "E721toE20: Not owner");
    }

    constructor() public {
        owner = msg.sender;
    }

    function setErc721(address _erc721) public onlyOwner {
        require(erc721 == address(0), "E721toE20: Already set");
        erc721 = _erc721;
    }

    function setConvictionVoting(address _convictionVoting) public onlyOwner {
        convictionVoting = _convictionVoting;

        if (address(_convictionVoting) != address(0)) {
            _convictionVoting.onRegisterAsHook(0, address(this));
        }
    }

    function burnOwner() public onlyOwner {
        owner = address(0);
    }

    function totalSupply() view returns (uint256) {
        return totalSupply;
    }

    function balanceOf(address _account) view returns (uint256) {
        return balances[_account];
    }

    // Occurs before transfer has happened and balanceOf is updated
    // This must be called for mint/burn as well (any time an NFT is created or destroyed)
    function onTransfer(address _from, address _to, uint256 _id) public {
        require(msg.sender == erc721, "E721toE20: Not ERC721");

        if (_from != address(0) // the mint address
            && erc721.balanceOf(_from) == 1) // Note balanceOf will be 0 after transfer is completed, this prevents an account with multiple NFT's being revoked vote weight until they have 0 NFT's
        {
            balances[_from] -= TOKENS_PER_NFT;
            totalSupply -= TOKENS_PER_NFT;

            if (address(convictionVoting) != address(0)) {
                convictionVoting.onTransfer(_from, _to, TOKENS_PER_NFT);
            }
        }

        if (_to != address(0) // the burn address
            && erc721.balanceOf(_to) == 0) // Note balanceOf will be 1 after transfer is completed, this prevents an account with multiple NFT's being granted multiple vote weights
        {
            balances[_to] += TOKENS_PER_NFT;
            totalSupply += TOKENS_PER_NFT;
        }
    }
}
