// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SUIEscrow
 * @dev Escrow contract for SUI to EVM cross-chain transactions
 * Deployed dynamically based on relayer parameters
 */
contract SUIEscrow is ReentrancyGuard {
    IERC20 public immutable usdc;
    
    bytes32 public immutable secretHash;
    uint256 public immutable amount;
    address public immutable makerAddress;
    uint256 public immutable timelock;
    string public metadata;
    
    bool public isRevealed;
    bool public isReleased;
    bool public isRefunded;
    string public revealedSecret;
    address public beneficiary;
    
    uint256 public constant REVEAL_WINDOW = 24 hours; // Time window after timelock to reveal
    
    event SecretRevealed(address indexed revealer, string secret);
    event EscrowReleased(address indexed beneficiary, uint256 amount);
    event EscrowRefunded(address indexed maker, uint256 amount);
    
    modifier onlyBeforeTimelock() {
        require(block.timestamp < timelock, "Timelock expired");
        _;
    }
    
    modifier onlyAfterTimelock() {
        require(block.timestamp >= timelock, "Timelock not reached");
        _;
    }
    
    modifier onlyDuringRevealWindow() {
        require(
            block.timestamp >= timelock && 
            block.timestamp <= timelock + REVEAL_WINDOW,
            "Not in reveal window"
        );
        _;
    }
    
    modifier notReleased() {
        require(!isReleased, "Already released");
        _;
    }
    
    modifier notRefunded() {
        require(!isRefunded, "Already refunded");
        _;
    }
    
    constructor(
        address _usdc,
        bytes32 _secretHash,
        uint256 _amount,
        address _makerAddress,
        uint256 _timelock,
        string memory _metadata
    ) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_secretHash != bytes32(0), "Invalid secret hash");
        require(_amount > 0, "Amount must be greater than 0");
        require(_makerAddress != address(0), "Invalid maker address");
        require(_timelock > block.timestamp, "Timelock must be in future");
        
        usdc = IERC20(_usdc);
        secretHash = _secretHash;
        amount = _amount;
        makerAddress = _makerAddress;
        timelock = _timelock;
        metadata = _metadata;
    }
    
    /**
     * @notice Reveal secret to unlock escrow
     * @param secret The secret that hashes to secretHash
     * @param _beneficiary Address to receive the funds
     */
    function revealSecret(string calldata secret, address _beneficiary) 
        external 
        onlyDuringRevealWindow 
        notReleased 
        notRefunded 
    {
        require(!isRevealed, "Secret already revealed");
        require(_beneficiary != address(0), "Invalid beneficiary");
        
        // Verify secret hash
        bytes32 computedHash = keccak256(abi.encodePacked(secret));
        require(computedHash == secretHash, "Invalid secret");
        
        isRevealed = true;
        revealedSecret = secret;
        beneficiary = _beneficiary;
        
        emit SecretRevealed(msg.sender, secret);
    }
    
    /**
     * @notice Release funds to beneficiary after secret is revealed
     */
    function releaseFunds() 
        external 
        nonReentrant 
        notReleased 
        notRefunded 
    {
        require(isRevealed, "Secret not revealed");
        require(beneficiary != address(0), "No beneficiary set");
        
        isReleased = true;
        
        require(
            usdc.transfer(beneficiary, amount),
            "USDC transfer failed"
        );
        
        emit EscrowReleased(beneficiary, amount);
    }
    
    /**
     * @notice Refund to maker if secret not revealed in time
     */
    function refund() 
        external 
        nonReentrant 
        notReleased 
        notRefunded 
    {
        require(
            block.timestamp > timelock + REVEAL_WINDOW,
            "Reveal window not expired"
        );
        require(!isRevealed, "Secret was revealed");
        
        isRefunded = true;
        
        require(
            usdc.transfer(makerAddress, amount),
            "USDC transfer failed"
        );
        
        emit EscrowRefunded(makerAddress, amount);
    }
    
    /**
     * @notice Emergency release by maker before timelock
     * Can be used if auction conditions are not met
     */
    function emergencyRefund() 
        external 
        onlyBeforeTimelock 
        nonReentrant 
        notReleased 
        notRefunded 
    {
        require(msg.sender == makerAddress, "Only maker can emergency refund");
        
        isRefunded = true;
        
        require(
            usdc.transfer(makerAddress, amount),
            "USDC transfer failed"
        );
        
        emit EscrowRefunded(makerAddress, amount);
    }
    
    /**
     * @notice Reveal and release in one transaction (gas optimization)
     */
    function revealAndRelease(string calldata secret, address _beneficiary) 
        external 
        onlyDuringRevealWindow 
        nonReentrant 
        notReleased 
        notRefunded 
    {
        require(!isRevealed, "Secret already revealed");
        require(_beneficiary != address(0), "Invalid beneficiary");
        
        // Verify secret hash
        bytes32 computedHash = keccak256(abi.encodePacked(secret));
        require(computedHash == secretHash, "Invalid secret");
        
        isRevealed = true;
        isReleased = true;
        revealedSecret = secret;
        beneficiary = _beneficiary;
        
        require(
            usdc.transfer(_beneficiary, amount),
            "USDC transfer failed"
        );
        
        emit SecretRevealed(msg.sender, secret);
        emit EscrowReleased(_beneficiary, amount);
    }
    
    /**
     * @notice Check if escrow can be revealed
     */
    function canReveal() external view returns (bool) {
        return !isRevealed && 
               !isReleased && 
               !isRefunded &&
               block.timestamp >= timelock && 
               block.timestamp <= timelock + REVEAL_WINDOW;
    }
    
    /**
     * @notice Check if escrow can be refunded
     */
    function canRefund() external view returns (bool) {
        return !isRevealed && 
               !isReleased && 
               !isRefunded &&
               block.timestamp > timelock + REVEAL_WINDOW;
    }
    
    /**
     * @notice Get escrow status
     */
    function getStatus() external view returns (
        bool _isRevealed,
        bool _isReleased, 
        bool _isRefunded,
        address _beneficiary,
        uint256 _timeRemaining
    ) {
        uint256 timeRemaining = 0;
        if (block.timestamp < timelock) {
            timeRemaining = timelock - block.timestamp;
        } else if (block.timestamp <= timelock + REVEAL_WINDOW) {
            timeRemaining = (timelock + REVEAL_WINDOW) - block.timestamp;
        }
        
        return (
            isRevealed,
            isReleased,
            isRefunded,
            beneficiary,
            timeRemaining
        );
    }
    
    /**
     * @notice Get contract info
     */
    function getInfo() external view returns (
        bytes32 _secretHash,
        uint256 _amount,
        address _makerAddress,
        uint256 _timelock,
        string memory _metadata
    ) {
        return (
            secretHash,
            amount,
            makerAddress,
            timelock,
            metadata
        );
    }
}