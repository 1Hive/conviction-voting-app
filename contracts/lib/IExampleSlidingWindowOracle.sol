pragma solidity ^0.4.24;

interface IExampleSlidingWindowOracle {
    function consult(address tokenIn, uint256 amountIn, address tokenOut) external view returns (uint256 amountOut);
}
