#!/usr/bin/env python3
"""
SUI Move Cross-Chain Auction Python SDK Example

This module demonstrates how to interact with the SUI Move cross-chain auction
and escrow system using Python and the pysui library.

Author: 1inch Network
Version: 1.0.0
"""

import asyncio
import hashlib
import json
import secrets
import time
from typing import Dict, List, Optional, Tuple, AsyncGenerator
from dataclasses import dataclass
from pathlib import Path

try:
    from pysui import SuiConfig, SyncClient, AsyncClient
    from pysui.sui.sui_txn import SyncTransaction, AsyncTransaction
    from pysui.sui.sui_types import SuiAddress, ObjectID
except ImportError:
    print("Please install pysui: pip install pysui")
    raise


@dataclass
class AuctionConfig:
    """Configuration for the auction system"""
    package_id: str
    registry_id: str
    admin_cap_id: Optional[str] = None
    network: str = "testnet"
    gas_budget: int = 10_000_000


@dataclass
class Escrow:
    """Escrow data structure"""
    id: str
    secret_hash: List[int]
    amount: str
    maker_address: str
    timelock: str
    metadata: str
    is_revealed: bool
    is_released: bool
    is_refunded: bool
    beneficiary: Optional[str] = None


@dataclass
class Auction:
    """Auction data structure"""
    id: str
    escrow_id: str
    seller: str
    start_price: str
    end_price: str
    start_time: str
    duration: str
    secret_hash: List[int]
    is_active: bool
    is_ended: bool
    winner: Optional[str] = None
    final_price: Optional[str] = None
    metadata: str = ""


class CrossChainAuctionSDK:
    """Main SDK class for interacting with SUI Move cross-chain auction system"""
    
    def __init__(self, config: AuctionConfig):
        self.config = config
        self.client = None
        self._setup_client()
    
    def _setup_client(self):
        """Setup SUI client based on network configuration"""
        sui_config = SuiConfig.user_config(
            rpc_url=self._get_rpc_url(),
            prv_keys=[],  # Will be set when needed
            ws_url=None
        )
        self.client = SyncClient(sui_config)
    
    def _get_rpc_url(self) -> str:
        """Get RPC URL based on network"""
        networks = {
            "mainnet": "https://fullnode.mainnet.sui.io:443",
            "testnet": "https://fullnode.testnet.sui.io:443",
            "devnet": "https://fullnode.devnet.sui.io:443",
            "localnet": "http://127.0.0.1:9000"
        }
        return networks.get(self.config.network, networks["testnet"])
    
    @staticmethod
    def generate_secret() -> Tuple[str, List[int]]:
        """Generate a secret and its SHA3-256 hash"""
        secret = secrets.token_hex(32)
        hash_bytes = hashlib.sha3_256(secret.encode()).digest()
        hash_list = list(hash_bytes)
        return secret, hash_list
    
    @staticmethod
    def calculate_protocol_fee(price: str, fee_bps: int = 250) -> str:
        """Calculate protocol fee"""
        price_int = int(price)
        fee = (price_int * fee_bps) // 10000
        return str(fee)
    
    @staticmethod
    def calculate_total_payment(price: str, fee_bps: int = 250) -> str:
        """Calculate total payment (price + protocol fee)"""
        price_int = int(price)
        fee = int(CrossChainAuctionSDK.calculate_protocol_fee(price, fee_bps))
        return str(price_int + fee)
    
    @staticmethod
    def format_sui_amount(amount: str) -> str:
        """Format SUI amount for display"""
        amount_int = int(amount)
        sui = amount_int / 1_000_000_000
        return f"{sui:.9f}".rstrip('0').rstrip('.') + " SUI"
    
    @staticmethod
    def parse_sui_amount(amount: str) -> str:
        """Parse SUI amount from string"""
        sui = float(amount)
        return str(int(sui * 1_000_000_000))
    
    @staticmethod
    def generate_timelock(offset_ms: int) -> int:
        """Generate timelock timestamp"""
        return int(time.time() * 1000) + offset_ms
    
    @staticmethod
    def is_timelock_expired(timelock: int) -> bool:
        """Check if timelock has expired"""
        return int(time.time() * 1000) > timelock
    
    def create_escrow(
        self,
        coin_id: str,
        secret_hash: List[int],
        timelock: int,
        metadata: str
    ) -> str:
        """Create a new escrow"""
        txn = SyncTransaction(client=self.client)
        
        # Build transaction
        txn.move_call(
            target=f"{self.config.package_id}::cross_chain_auction::create_escrow",
            arguments=[
                self.config.registry_id,
                coin_id,
                secret_hash,
                str(timelock),
                metadata,
                "0x6"  # Clock object
            ]
        )
        
        # Execute transaction
        result = txn.execute(gas_budget=self.config.gas_budget)
        
        # Extract escrow ID from events
        for event in result.events or []:
            if "EscrowCreated" in event.type:
                return event.parsed_json["escrow_id"]
        
        raise Exception("Escrow creation failed")
    
    def create_auction(
        self,
        escrow_id: int,
        start_price: str,
        end_price: str,
        duration: int,
        secret_hash: List[int],
        metadata: str
    ) -> str:
        """Create a new Dutch auction"""
        txn = SyncTransaction(client=self.client)
        
        # Build transaction
        txn.move_call(
            target=f"{self.config.package_id}::cross_chain_auction::create_auction",
            arguments=[
                self.config.registry_id,
                str(escrow_id),
                start_price,
                end_price,
                str(duration),
                secret_hash,
                metadata,
                "0x6"  # Clock object
            ]
        )
        
        # Execute transaction
        result = txn.execute(gas_budget=self.config.gas_budget)
        
        # Extract auction ID from events
        for event in result.events or []:
            if "AuctionCreated" in event.type:
                return event.parsed_json["auction_id"]
        
        raise Exception("Auction creation failed")
    
    def place_bid(
        self,
        auction_id: int,
        coin_id: str
    ) -> Dict[str, str]:
        """Place a bid on an auction"""
        txn = SyncTransaction(client=self.client)
        
        # Build transaction
        txn.move_call(
            target=f"{self.config.package_id}::cross_chain_auction::place_bid",
            arguments=[
                self.config.registry_id,
                str(auction_id),
                coin_id,
                "0x6"  # Clock object
            ]
        )
        
        # Execute transaction
        result = txn.execute(gas_budget=self.config.gas_budget)
        
        # Extract bid result from events
        for event in result.events or []:
            if "BidPlaced" in event.type:
                event_data = event.parsed_json
                return {
                    "winner": event_data["bidder"],
                    "final_price": event_data["final_price"]
                }
        
        raise Exception("Bid placement failed")
    
    def reveal_and_release(
        self,
        escrow_id: int,
        secret: str,
        beneficiary: str
    ) -> None:
        """Reveal secret and release escrow funds"""
        txn = SyncTransaction(client=self.client)
        
        # Build transaction
        txn.move_call(
            target=f"{self.config.package_id}::cross_chain_auction::reveal_and_release",
            arguments=[
                self.config.registry_id,
                str(escrow_id),
                secret,
                beneficiary,
                "0x6"  # Clock object
            ]
        )
        
        # Execute transaction
        txn.execute(gas_budget=self.config.gas_budget)
    
    def get_current_price(self, auction_id: int) -> str:
        """Get current auction price"""
        # This would require a view function call
        # Implementation depends on pysui's view function support
        # For now, return a placeholder
        return "0"
    
    def is_auction_active(self, auction_id: int) -> bool:
        """Check if auction is active"""
        # This would require a view function call
        # Implementation depends on pysui's view function support
        # For now, return a placeholder
        return True
    
    def get_time_remaining(self, auction_id: int) -> int:
        """Get time remaining for auction"""
        # This would require a view function call
        # Implementation depends on pysui's view function support
        # For now, return a placeholder
        return 0
    
    def get_suitable_coin(self, amount: str) -> str:
        """Get suitable coin for payment"""
        # Get coins from wallet
        coins = self.client.get_coins(
            coin_type="0x2::sui::SUI"
        )
        
        # Find suitable coin
        for coin in coins.data:
            if int(coin.balance) >= int(amount):
                return coin.coin_object_id
        
        raise Exception(f"No suitable coin found for amount {amount}")


class AuctionMonitor:
    """Monitor auction price changes"""
    
    def __init__(self, sdk: CrossChainAuctionSDK):
        self.sdk = sdk
    
    async def monitor_auction_price(
        self,
        auction_id: int,
        interval_seconds: int = 30
    ) -> AsyncGenerator[Dict[str, any], None]:
        """Monitor auction price changes"""
        while True:
            try:
                is_active = self.sdk.is_auction_active(auction_id)
                if not is_active:
                    break
                
                price = self.sdk.get_current_price(auction_id)
                yield {
                    "timestamp": int(time.time()),
                    "price": price,
                    "formatted_price": CrossChainAuctionSDK.format_sui_amount(price)
                }
                
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                print(f"Error monitoring auction price: {e}")
                break


def load_config(config_path: str) -> AuctionConfig:
    """Load configuration from JSON file"""
    with open(config_path, 'r') as f:
        data = json.load(f)
    
    deployment = data.get('deployment', {})
    return AuctionConfig(
        package_id=deployment.get('package_id', ''),
        registry_id=deployment.get('registry_id', ''),
        admin_cap_id=deployment.get('admin_cap_id'),
        network=data.get('network', {}).get('name', 'testnet')
    )


def example_usage():
    """Example usage of the SDK"""
    # Load configuration
    config = AuctionConfig(
        package_id="0x...",  # Your deployed package ID
        registry_id="0x...",  # Your registry object ID
        network="testnet"
    )
    
    # Initialize SDK
    sdk = CrossChainAuctionSDK(config)
    
    try:
        # Generate secret
        secret, secret_hash = CrossChainAuctionSDK.generate_secret()
        print(f"Generated secret: {secret}")
        print(f"Secret hash: {secret_hash}")
        
        # Create escrow
        coin_id = sdk.get_suitable_coin("1000000000")  # 1 SUI
        timelock = CrossChainAuctionSDK.generate_timelock(24 * 60 * 60 * 1000)  # 24 hours
        
        escrow_id = sdk.create_escrow(
            coin_id,
            secret_hash,
            timelock,
            "Cross-chain escrow for auction"
        )
        print(f"Created escrow: {escrow_id}")
        
        # Create auction
        auction_id = sdk.create_auction(
            int(escrow_id),
            CrossChainAuctionSDK.parse_sui_amount("0.5"),  # Start price: 0.5 SUI
            CrossChainAuctionSDK.parse_sui_amount("0.1"),  # End price: 0.1 SUI
            60 * 60 * 1000,  # Duration: 1 hour
            secret_hash,
            "Dutch auction for cross-chain asset"
        )
        print(f"Created auction: {auction_id}")
        
        # Monitor auction (simplified example)
        print("Monitoring auction...")
        for i in range(10):  # Monitor for 10 iterations
            price = sdk.get_current_price(int(auction_id))
            print(f"Current price: {CrossChainAuctionSDK.format_sui_amount(price)}")
            
            # Example: place bid when price drops below 0.3 SUI
            if int(price) <= int(CrossChainAuctionSDK.parse_sui_amount("0.3")):
                bid_coin_id = sdk.get_suitable_coin(
                    CrossChainAuctionSDK.calculate_total_payment(price)
                )
                
                bid_result = sdk.place_bid(int(auction_id), bid_coin_id)
                print(f"Bid placed! Winner: {bid_result['winner']}, Final price: {CrossChainAuctionSDK.format_sui_amount(bid_result['final_price'])}")
                
                # Reveal secret and release funds
                sdk.reveal_and_release(
                    int(escrow_id),
                    secret,
                    bid_result['winner']
                )
                print("Escrow released to winner")
                break
            
            time.sleep(30)  # Wait 30 seconds
            
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    example_usage()