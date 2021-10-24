pragma solidity ^0.8.0;

import "../../openzeppelin-contracts-master/contracts/token/ERC20/IERC20.sol";

interface INXM is IERC20 {
    function whiteListed(address owner) external view returns (bool);
    function isLockedForMV(address owner) external view returns (uint256);
}
