/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.4.24;


contract IThreshold {
    /**
     * @dev Threshold formula
     * @param _requestedAmount Requested amount of tokens on certain proposal
     * @return Threshold a proposal's conviction should surpass in order to be able to
     * execute it.
     */
    function calculateThreshold(uint256 _requestedAmount) public view returns (uint256 _threshold);
}