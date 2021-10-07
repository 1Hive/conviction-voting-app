pragma solidity ^0.4.24;

contract GnosisSafe {

    enum Operation {Call, DelegateCall}

    function execTransactionFromModule(address to, uint256 value, bytes memory data, Operation operation)
        public returns (bool success);

}
