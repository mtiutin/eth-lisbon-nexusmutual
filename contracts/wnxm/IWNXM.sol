pragma solidity ^0.8.0;

import "../../openzeppelin-contracts-master/contracts/token/ERC20/IERC20.sol";

interface IWNXM is IERC20 {
    function wrap(uint256 _amount) external;

    function unwrap(uint256 _amount) external;

    function unwrapTo(address _to, uint256 _amount) external;

    function canWrap(address _owner, uint256 _amount)
        external
        view
        returns (bool success, string memory reason);

    function canUnwrap(address _owner, address _recipient, uint256 _amount)
        external
        view
        returns (bool success, string memory reason);

    /// @dev Method to claim junk and accidentally sent tokens
    function claimTokens(IERC20 _token, address payable _to, uint256 _balance) external;
}
