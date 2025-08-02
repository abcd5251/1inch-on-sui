// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/I1inch.sol";

/**
 * @title SUIDutchAuctionResolver
 * @dev Custom 1inch Fusion+ resolver for SUI cross-chain auctions
 */
contract SUIDutchAuctionResolver is ReentrancyGuard, Ownable {
    IFusionOrder public immutable settlement;
    
    struct AuctionOrder {
        address seller;
        uint256 startPrice;
        uint256 endPrice;
        uint256 duration;
        uint256 startTime;
        bool isActive;
        address escrowContract;
        bytes32 secretHash;
    }
    
    struct AuctionResult {
        address winner;
        uint256 finalPrice;
        string secretHash;
        address escrowContract;
        bytes orderData;
    }
    
    // Mapping from order hash to auction order details
    mapping(bytes32 => AuctionOrder) public auctionOrders;
    mapping(bytes32 => bool) public resolvedOrders;
    mapping(address => bool) public authorizedOperators;
    
    // Events
    event FusionOrderFilled(
        bytes32 indexed orderHash,
        address indexed seller,
        uint256 finalPrice,
        uint256 settledAmount
    );
    
    event AuctionOrderCreated(
        bytes32 indexed orderHash,
        address indexed seller,
        uint256 startPrice,
        uint256 endPrice
    );
    
    event OrderResolved(
        bytes32 indexed orderId,
        address indexed winner,
        uint256 finalPrice,
        string secretHash
    );
    
    event AuctionSettled(
        address indexed escrow,
        address indexed winner,
        uint256 amount
    );
    
    modifier onlyAuthorized() {
        require(
            authorizedOperators[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    
    constructor(address _settlement) Ownable(msg.sender) {
        require(_settlement != address(0), "Invalid settlement");
        settlement = IFusionOrder(_settlement);
        authorizedOperators[msg.sender] = true;
    }

    /**
     * @dev Create auction order
     */
    function createAuctionOrder(
        bytes32 orderHash,
        address seller,
        uint256 startPrice,
        uint256 endPrice,
        uint256 duration,
        address escrowContract,
        bytes32 secretHash
    ) external onlyAuthorized {
        require(orderHash != bytes32(0), "Invalid order hash");
        require(seller != address(0), "Invalid seller");
        require(startPrice > endPrice, "Invalid price range");
        require(escrowContract != address(0), "Invalid escrow");
        
        auctionOrders[orderHash] = AuctionOrder({
            seller: seller,
            startPrice: startPrice,
            endPrice: endPrice,
            duration: duration,
            startTime: block.timestamp,
            isActive: true,
            escrowContract: escrowContract,
            secretHash: secretHash
        });
        
        emit AuctionOrderCreated(orderHash, seller, startPrice, endPrice);
    }

    /**
     * @dev Main resolver function for 1inch Fusion+ integration
     * @param order The 1inch order to resolve
     * @param auctionResult Results from SUI auction
     */
    function resolveOrder(
        IFusionOrder.Order calldata order,
        bytes calldata /* signature */,
        AuctionResult calldata auctionResult
    ) external nonReentrant onlyAuthorized {
        
        bytes32 orderId = keccak256(abi.encode(order));
        require(!resolvedOrders[orderId], "Order already resolved");
        
        // Mark as resolved first (CEI pattern)
        resolvedOrders[orderId] = true;
        
        // Validate auction result
        require(auctionResult.winner != address(0), "Invalid winner");
        require(auctionResult.finalPrice > 0, "Invalid price");
        require(auctionResult.escrowContract != address(0), "Invalid escrow");
        
        // Execute 1inch order settlement
        _settleFusionOrder(order, auctionResult);
        
        // Release funds from escrow using secret
        _releaseEscrow(auctionResult);
        
        emit OrderResolved(
            orderId,
            auctionResult.winner,
            auctionResult.finalPrice,
            auctionResult.secretHash
        );
    }

    /**
     * @dev Settle the 1inch Fusion+ order
     */
    function _settleFusionOrder(
        IFusionOrder.Order calldata order,
        AuctionResult calldata auctionResult
    ) internal {
        
        // Transfer tokens to winner based on auction result
        IERC20 token = IERC20(order.makerAsset);
        require(
            token.transferFrom(
                order.maker,
                auctionResult.winner,
                auctionResult.finalPrice
            ),
            "Token transfer failed"
        );
        
        emit AuctionSettled(
            auctionResult.escrowContract,
            auctionResult.winner,
            auctionResult.finalPrice
        );
    }

    /**
     * @dev Release funds from escrow contract
     */
    function _releaseEscrow(AuctionResult calldata auctionResult) internal {
        
        // Call escrow contract to reveal secret and release funds
        (bool success, ) = auctionResult.escrowContract.call(
            abi.encodeWithSignature(
                "revealAndRelease(string,address)",
                auctionResult.secretHash,
                auctionResult.winner
            )
        );
        
        require(success, "Escrow release failed");
    }

    /**
     * @dev Handle Fusion settlement (legacy method)
     */
    function _handleFusionSettlement(
        bytes32 orderHash,
        bytes calldata orderData,
        uint256 finalPrice
    ) internal {
        require(orderHash != bytes32(0), "Invalid order hash");
        require(orderData.length > 0, "Invalid order data");
        require(finalPrice > 0, "Invalid price");

        // Call 1inch Fusion settlement contract
        settlement.fillOrderTo(
            address(uint160(uint256(orderHash))),
            finalPrice,
            finalPrice,
            finalPrice,
            orderData
        );
        
        emit FusionOrderFilled(
            orderHash,
            auctionOrders[orderHash].seller,
            finalPrice,
            finalPrice
        );
    }
    
    /**
     * @dev Add authorized operator
     */
    function addOperator(address operator) external onlyOwner {
        authorizedOperators[operator] = true;
    }
    
    /**
     * @dev Remove authorized operator  
     */
    function removeOperator(address operator) external onlyOwner {
        authorizedOperators[operator] = false;
    }
    
    /**
     * @dev Emergency function to handle failed orders
     */
    function emergencyResolve(bytes32 orderId) external onlyOwner {
        resolvedOrders[orderId] = true;
    }
    
    /**
     * @dev Check if order is already resolved
     */
    function isOrderResolved(bytes32 orderId) external view returns (bool) {
        return resolvedOrders[orderId];
    }
    
    /**
     * @dev Get auction order details
     */
    function getAuctionOrder(bytes32 orderHash) external view returns (
        address seller,
        uint256 startPrice,
        uint256 endPrice,
        uint256 duration,
        uint256 startTime,
        bool isActive,
        address escrowContract,
        bytes32 secretHash
    ) {
        AuctionOrder memory auction = auctionOrders[orderHash];
        return (
            auction.seller,
            auction.startPrice,
            auction.endPrice,
            auction.duration,
            auction.startTime,
            auction.isActive,
            auction.escrowContract,
            auction.secretHash
        );
    }
    
    /**
     * @dev Check if order can be resolved
     */
    function canResolveOrder(bytes32 orderHash) external view returns (bool) {
        AuctionOrder memory auction = auctionOrders[orderHash];
        return auction.isActive && 
               !resolvedOrders[orderHash] &&
               block.timestamp < auction.startTime + auction.duration;
    }
    
    /**
     * @dev Get current price for Dutch auction
     */
    function getCurrentPrice(bytes32 orderHash) external view returns (uint256) {
        AuctionOrder memory auction = auctionOrders[orderHash];
        
        if (!auction.isActive || resolvedOrders[orderHash]) {
            return 0;
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
     * @dev Get order status
     */
    function getOrderStatus(bytes32 orderHash) external view returns (
        bool isActive,
        bool isResolved,
        address winner,
        uint256 finalPrice,
        uint256 currentPrice,
        uint256 timeRemaining
    ) {
        AuctionOrder memory auction = auctionOrders[orderHash];
        
        isActive = auction.isActive;
        isResolved = resolvedOrders[orderHash];
        winner = address(0); // Would need to track winner separately
        finalPrice = 0; // Would need to track final price separately  
        currentPrice = this.getCurrentPrice(orderHash);
        
        uint256 endTime = auction.startTime + auction.duration;
        timeRemaining = block.timestamp < endTime ? endTime - block.timestamp : 0;
    }
}