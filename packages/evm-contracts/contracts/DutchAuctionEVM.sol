// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISUIEscrow {
    function revealAndRelease(string calldata secret, address beneficiary) external;
    function canReveal() external view returns (bool);
    function getStatus() external view returns (bool, bool, bool, address, uint256);
}

/**
 * @title DutchAuctionEVM
 * @dev Dutch auction that integrates with SUIEscrow contracts
 */
contract DutchAuctionEVM is ReentrancyGuard, Ownable {
    IERC20 public immutable usdc;
    
    struct Auction {
        address escrowContract;
        address seller;
        uint256 startPrice;
        uint256 endPrice;
        uint256 startTime;
        uint256 duration;
        string secret; // Stored after auction ends
        bytes32 secretHash;
        bool isActive;
        bool isEnded;
        address winner;
        uint256 finalPrice;
        string metadata;
    }
    
    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256[]) public userAuctions; // seller -> auction IDs
    mapping(address => uint256[]) public userBids; // bidder -> auction IDs they participated in
    
    uint256 public nextAuctionId;
    uint256 public protocolFeePercent = 250; // 2.5%
    uint256 public constant MAX_FEE = 1000; // Max 10%
    
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed escrowContract,
        uint256 startPrice,
        uint256 endPrice,
        uint256 duration
    );
    
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 price,
        uint256 timestamp
    );
    
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice
    );
    
    event EscrowReleased(
        uint256 indexed auctionId,
        address indexed escrow,
        address indexed beneficiary
    );
    
    modifier validAuction(uint256 auctionId) {
        require(auctionId < nextAuctionId, "Auction does not exist");
        _;
    }
    
    modifier auctionActive(uint256 auctionId) {
        require(auctions[auctionId].isActive, "Auction not active");
        require(!auctions[auctionId].isEnded, "Auction already ended");
        require(block.timestamp < auctions[auctionId].startTime + auctions[auctionId].duration, "Auction expired");
        _;
    }
    
    constructor(address _usdc) Ownable(msg.sender) ReentrancyGuard() {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    /**
     * @notice Create a Dutch auction linked to an escrow contract
     * @param escrowContract Address of the deployed SUIEscrow contract
     * @param startPrice Starting price in USDC (6 decimals)
     * @param endPrice Ending price in USDC (6 decimals) 
     * @param duration Auction duration in seconds
     * @param secretHash Hash of the secret (must match escrow)
     * @param metadata Additional auction metadata
     */
    function createAuction(
        address escrowContract,
        uint256 startPrice,
        uint256 endPrice,
        uint256 duration,
        bytes32 secretHash,
        string calldata metadata
    ) external returns (uint256) {
        require(escrowContract != address(0), "Invalid escrow contract");
        require(startPrice > endPrice, "Invalid price range");
        require(endPrice > 0, "End price must be > 0");
        require(duration > 0 && duration <= 7 days, "Invalid duration");
        require(secretHash != bytes32(0), "Invalid secret hash");
        
        // Verify the escrow contract can be revealed
        ISUIEscrow escrow = ISUIEscrow(escrowContract);
        require(escrow.canReveal(), "Escrow cannot be revealed");
        
        uint256 auctionId = nextAuctionId++;
        
        auctions[auctionId] = Auction({
            escrowContract: escrowContract,
            seller: msg.sender,
            startPrice: startPrice,
            endPrice: endPrice,
            startTime: block.timestamp,
            duration: duration,
            secret: "",
            secretHash: secretHash,
            isActive: true,
            isEnded: false,
            winner: address(0),
            finalPrice: 0,
            metadata: metadata
        });
        
        userAuctions[msg.sender].push(auctionId);
        
        emit AuctionCreated(
            auctionId,
            msg.sender,
            escrowContract,
            startPrice,
            endPrice,
            duration
        );
        
        return auctionId;
    }
    
    /**
     * @notice Place a bid in the Dutch auction
     * @param auctionId The auction to bid on
     */
    function placeBid(uint256 auctionId) 
        external 
        nonReentrant 
        validAuction(auctionId) 
        auctionActive(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        require(msg.sender != auction.seller, "Seller cannot bid");
        
        uint256 currentPrice = getCurrentPrice(auctionId);
        uint256 protocolFee = (currentPrice * protocolFeePercent) / 10000;
        uint256 totalRequired = currentPrice + protocolFee;
        
        // Transfer USDC from bidder
        require(
            usdc.transferFrom(msg.sender, address(this), totalRequired),
            "USDC transfer failed"
        );
        
        // End the auction immediately (Dutch auction - first bid wins)
        auction.isEnded = true;
        auction.isActive = false;
        auction.winner = msg.sender;
        auction.finalPrice = currentPrice;
        
        userBids[msg.sender].push(auctionId);
        
        emit BidPlaced(auctionId, msg.sender, currentPrice, block.timestamp);
        emit AuctionEnded(auctionId, msg.sender, currentPrice);
        
        // Transfer payment to seller (minus protocol fee)
        require(
            usdc.transfer(auction.seller, currentPrice),
            "Payment to seller failed"
        );
    }
    
    /**
     * @notice Reveal secret and release escrow to auction winner
     * @param auctionId The auction ID
     * @param secret The secret that matches secretHash
     */
    function releaseEscrow(uint256 auctionId, string calldata secret) 
        external 
        nonReentrant 
        validAuction(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        require(auction.isEnded, "Auction not ended");
        require(auction.winner != address(0), "No winner");
        require(
            msg.sender == auction.seller || msg.sender == owner(),
            "Only seller or owner can release"
        );
        
        // Verify secret hash
        bytes32 computedHash = keccak256(abi.encodePacked(secret));
        require(computedHash == auction.secretHash, "Invalid secret");
        
        // Store secret
        auction.secret = secret;
        
        // Release escrow to winner
        ISUIEscrow escrow = ISUIEscrow(auction.escrowContract);
        escrow.revealAndRelease(secret, auction.winner);
        
        emit EscrowReleased(auctionId, auction.escrowContract, auction.winner);
    }
    
    /**
     * @notice End auction if time expired without bids
     */
    function endExpiredAuction(uint256 auctionId) 
        external 
        validAuction(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(
            block.timestamp >= auction.startTime + auction.duration,
            "Auction not expired"
        );
        
        auction.isActive = false;
        auction.isEnded = true;
        
        emit AuctionEnded(auctionId, address(0), 0);
    }
    
    /**
     * @notice Get current price for an active auction
     */
    function getCurrentPrice(uint256 auctionId) 
        public 
        view 
        validAuction(auctionId) 
        returns (uint256) 
    {
        Auction memory auction = auctions[auctionId];
        
        if (!auction.isActive || auction.isEnded) {
            return auction.finalPrice;
        }
        
        uint256 elapsed = block.timestamp - auction.startTime;
        
        if (elapsed >= auction.duration) {
            return auction.endPrice;
        }
        
        // Linear price decay
        uint256 priceReduction = (auction.startPrice - auction.endPrice) * elapsed / auction.duration;
        return auction.startPrice - priceReduction;
    }
    
    /**
     * @notice Check if auction is active and can receive bids
     */
    function isAuctionActive(uint256 auctionId) 
        external 
        view 
        validAuction(auctionId) 
        returns (bool) 
    {
        Auction memory auction = auctions[auctionId];
        return auction.isActive && 
               !auction.isEnded && 
               block.timestamp < auction.startTime + auction.duration;
    }
    
    /**
     * @notice Get time remaining in auction
     */
    function getTimeRemaining(uint256 auctionId) 
        external 
        view 
        validAuction(auctionId) 
        returns (uint256) 
    {
        Auction memory auction = auctions[auctionId];
        
        if (!auction.isActive || auction.isEnded) {
            return 0;
        }
        
        uint256 endTime = auction.startTime + auction.duration;
        
        if (block.timestamp >= endTime) {
            return 0;
        }
        
        return endTime - block.timestamp;
    }
    
    /**
     * @notice Get auction details
     */
    function getAuction(uint256 auctionId) 
        external 
        view 
        validAuction(auctionId) 
        returns (
            address escrowContract,
            address seller,
            uint256 startPrice,
            uint256 endPrice,
            uint256 timeRemaining,
            bool isActive,
            bool isEnded,
            address winner,
            uint256 finalPrice,
            uint256 currentPrice
        ) 
    {
        Auction memory auction = auctions[auctionId];
        
        escrowContract = auction.escrowContract;
        seller = auction.seller;
        startPrice = auction.startPrice;
        endPrice = auction.endPrice;
        timeRemaining = this.getTimeRemaining(auctionId);
        isActive = auction.isActive;
        isEnded = auction.isEnded;
        winner = auction.winner;
        finalPrice = auction.finalPrice;
        currentPrice = getCurrentPrice(auctionId);
    }
    
    /**
     * @notice Get user's auctions (as seller)
     */
    function getUserAuctions(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userAuctions[user];
    }
    
    /**
     * @notice Get user's bids (as bidder)
     */
    function getUserBids(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userBids[user];
    }
    
    /**
     * @notice Update protocol fee (owner only)
     */
    function setProtocolFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= MAX_FEE, "Fee too high");
        protocolFeePercent = _newFeePercent;
    }
    
    /**
     * @notice Withdraw protocol fees (owner only)
     */
    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        
        require(usdc.transfer(to, balance), "Fee withdrawal failed");
    }
    
    /**
     * @notice Get total auctions count
     */
    function getTotalAuctions() external view returns (uint256) {
        return nextAuctionId;
    }
}