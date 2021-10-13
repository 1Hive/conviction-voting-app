pragma solidity ^0.4.24;

import "./ConvictionVoting.sol";
import "./IErc721Adapter.sol";
import "./ERC721.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

contract Erc721Adapter is IErc721Adapter {
    using SafeMath for uint256;

    uint256 constant public TOKENS_PER_NFT = 1000e18;

    address public owner;
    ConvictionVoting public convictionVoting;
    ERC721 public erc721;
    uint256 public totalSupply;
    mapping(address => uint256) public balances;

    modifier onlyOwner() {
        require(msg.sender == owner, "ERR:NOT_OWNER");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function setOwner(address _owner) public onlyOwner {
        owner = _owner;
    }

    function setErc721(ERC721 _erc721) public onlyOwner {
        require(erc721 == address(0), "ERR:ALREADY_SET");
        erc721 = _erc721;
    }

    function setConvictionVoting(ConvictionVoting _convictionVoting) public onlyOwner {
        convictionVoting = _convictionVoting;

        if (address(_convictionVoting) != address(0)) {
            _convictionVoting.onRegisterAsHook(0, address(this));
        }
    }

    // Function used by Conviction Voting
    function totalSupply() view returns (uint256) {
        return totalSupply;
    }

    // Function used by Conviction Voting
    function balanceOf(address _account) view returns (uint256) {
        return balances[_account];
    }

    // In the LivingNft this occurs before the transfer has happened and balanceOf is updated
    // Note this must be called for all mint/burn operations on the NFT as well
    function onTransfer(address _from, address _to, uint256 _id) public {
        require(msg.sender == address(erc721), "ERR:NOT_ERC721");
        require(_from != _to, "ERR:SEND_TO_SELF");

        if (_from != address(0) // the mint address
            && erc721.balanceOf(_from) == 1) // Note balanceOf will be 0 after transfer is completed, this prevents an account with multiple NFT's being revoked vote weight until they have 0 NFT's
        {
            balances[_from] = balances[_from].sub(TOKENS_PER_NFT);
            totalSupply = totalSupply.sub(TOKENS_PER_NFT);

            if (address(convictionVoting) != address(0)) {
                convictionVoting.onTransfer(_from, _to, TOKENS_PER_NFT);
            }
        }

        if (_to != address(0) // the burn address
            && erc721.balanceOf(_to) == 0) // Note balanceOf will be 1 after transfer is completed, this prevents an account with multiple NFT's being granted multiple vote weights
        {
            balances[_to] = balances[_to].add(TOKENS_PER_NFT);
            totalSupply = totalSupply.add(TOKENS_PER_NFT);
        }
    }
}
