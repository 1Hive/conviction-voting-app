pragma solidity ^0.4.24;

import "@aragon/os/contracts/acl/IACLOracle.sol";

contract ACLOracleMock is IACLOracle {

    address public allowed;

    constructor(address _allowed) public {
        allowed = _allowed;
    }

    function canPerform(address, address, bytes32, uint256[] _how) external view returns (bool) {
        return address(_how[0]) == allowed;
    }
}
