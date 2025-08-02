// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title 1inch Fusion+ Interfaces
 * @dev Custom interfaces for 1inch integration
 */

interface IFusionOrder {
    struct Order {
        uint256 salt;
        address makerAsset;    // Token being sold
        address takerAsset;    // Token being bought  
        address maker;         // Order creator
        address receiver;      // Funds recipient
        address allowedSender; // Who can fill order
        uint256 makingAmount;  // Amount being sold
        uint256 takingAmount;  // Amount being bought
        uint256 offsets;       // Bit-packed order data
        bytes interactions;    // Custom logic
    }
    
    function fillOrderTo(
        address order,
        uint256 value,
        uint256 makingAmount,
        uint256 takingAmount,
        bytes calldata interactionData
    ) external returns (uint256, uint256);
}

interface IOrderMixin {
    /**
     * @dev Fill a limit order
     */
    function fillOrder(
        IFusionOrder.Order calldata order,
        bytes calldata signature,
        bytes calldata interaction,
        uint256 makingAmount,
        uint256 takingAmount
    ) external returns (uint256 actualMakingAmount, uint256 actualTakingAmount);
    
    /**
     * @dev Cancel order
     */
    function cancelOrder(IFusionOrder.Order calldata order) external;
    
    /**
     * @dev Check if order is valid
     */
    function isValidOrder(
        IFusionOrder.Order calldata order,
        bytes calldata signature
    ) external view returns (bool);
}

interface IFusionResolver {
    /**
     * @dev Resolve Fusion+ order with custom logic
     */
    function resolveOrder(
        IFusionOrder.Order calldata order,
        bytes calldata signature,
        bytes calldata resolverData
    ) external;
    
    /**
     * @dev Check if resolver can handle order
     */
    function canResolve(
        IFusionOrder.Order calldata order
    ) external view returns (bool);
}

/**
 * @dev Events for tracking
 */
interface IFusionEvents {
    event OrderFilled(
        bytes32 indexed orderHash,
        uint256 makingAmount,
        uint256 takingAmount
    );
    
    event OrderCancelled(bytes32 indexed orderHash);
    
    event OrderResolved(
        bytes32 indexed orderHash,
        address indexed resolver,
        bytes resolverData
    );
}