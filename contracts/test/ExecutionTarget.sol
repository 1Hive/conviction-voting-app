pragma solidity ^0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";

contract ExecutionTarget {
    uint256 public counter;

    event TargetExecuted(uint256 counter);

    function execute() external {
        counter += 1;
        emit TargetExecuted(counter);
    }

    function executeWithTransferFrom(ERC20 token, uint256 _amount) external {
        counter += 1;
        token.transferFrom(msg.sender, address(this), _amount);
        emit TargetExecuted(counter);
    }
}
