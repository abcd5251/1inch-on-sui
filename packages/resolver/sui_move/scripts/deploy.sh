#!/bin/bash

# SUI Move Cross-Chain Auction & Escrow Deployment Script
# This script helps deploy and initialize the cross-chain auction system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GAS_BUDGET=100000000
NETWORK="testnet"  # Change to "mainnet" for production

echo -e "${BLUE}=== SUI Move Cross-Chain Auction Deployment ===${NC}"
echo

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo -e "${RED}Error: SUI CLI is not installed or not in PATH${NC}"
    echo "Please install SUI CLI: https://docs.sui.io/build/install"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Move.toml" ]; then
    echo -e "${RED}Error: Move.toml not found. Please run this script from the sui_move package directory.${NC}"
    exit 1
fi

# Check SUI client configuration
echo -e "${YELLOW}Checking SUI client configuration...${NC}"
sui client active-address
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: SUI client not configured. Please run 'sui client' to set up.${NC}"
    exit 1
fi

# Get active address
ACTIVE_ADDRESS=$(sui client active-address)
echo -e "${GREEN}Active address: $ACTIVE_ADDRESS${NC}"

# Check balance
echo -e "${YELLOW}Checking SUI balance...${NC}"
BALANCE=$(sui client balance --json | jq -r '.totalBalance')
echo -e "${GREEN}Current balance: $BALANCE MIST${NC}"

if [ "$BALANCE" -lt "$GAS_BUDGET" ]; then
    echo -e "${RED}Warning: Balance might be insufficient for deployment (need at least $GAS_BUDGET MIST)${NC}"
    echo -e "${YELLOW}You can get testnet SUI from: https://discord.gg/sui${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the package
echo -e "${YELLOW}Building Move package...${NC}"
sui move build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build Move package${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Package built successfully${NC}"

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
sui move test
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Tests failed${NC}"
    read -p "Continue with deployment anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ All tests passed${NC}"
fi

# Deploy the package
echo -e "${YELLOW}Deploying package to $NETWORK...${NC}"
echo "This may take a few moments..."

DEPLOY_OUTPUT=$(sui client publish --gas-budget $GAS_BUDGET --json)
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to deploy package${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Parse deployment output
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | jq -r '.objectChanges[] | select(.type == "published") | .packageId')
REGISTRY_ID=$(echo "$DEPLOY_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("AuctionRegistry")) | .objectId')
ADMIN_CAP_ID=$(echo "$DEPLOY_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("AdminCap")) | .objectId')

echo -e "${GREEN}✓ Package deployed successfully!${NC}"
echo
echo -e "${BLUE}=== Deployment Information ===${NC}"
echo -e "${GREEN}Package ID:        $PACKAGE_ID${NC}"
echo -e "${GREEN}Registry ID:       $REGISTRY_ID${NC}"
echo -e "${GREEN}Admin Cap ID:      $ADMIN_CAP_ID${NC}"
echo -e "${GREEN}Network:           $NETWORK${NC}"
echo -e "${GREEN}Deployer:          $ACTIVE_ADDRESS${NC}"
echo

# Save deployment info to file
DEPLOY_INFO_FILE="deployment_info.json"
cat > "$DEPLOY_INFO_FILE" << EOF
{
  "packageId": "$PACKAGE_ID",
  "registryId": "$REGISTRY_ID",
  "adminCapId": "$ADMIN_CAP_ID",
  "network": "$NETWORK",
  "deployer": "$ACTIVE_ADDRESS",
  "deploymentTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gasUsed": $(echo "$DEPLOY_OUTPUT" | jq -r '.balanceChanges[0].amount | tonumber | . * -1')
}
EOF

echo -e "${GREEN}✓ Deployment info saved to $DEPLOY_INFO_FILE${NC}"
echo

# Display usage examples
echo -e "${BLUE}=== Usage Examples ===${NC}"
echo
echo -e "${YELLOW}1. Create an escrow:${NC}"
echo "sui client call --package $PACKAGE_ID --module cross_chain_auction --function create_escrow \\"
echo "  --args $REGISTRY_ID <coin_object_id> <secret_hash_vector> <timelock_timestamp> <metadata_string> 0x6 \\"
echo "  --gas-budget 10000000"
echo
echo -e "${YELLOW}2. Create an auction:${NC}"
echo "sui client call --package $PACKAGE_ID --module cross_chain_auction --function create_auction \\"
echo "  --args $REGISTRY_ID <escrow_id> <start_price> <end_price> <duration> <secret_hash_vector> <metadata_string> 0x6 \\"
echo "  --gas-budget 10000000"
echo
echo -e "${YELLOW}3. Place a bid:${NC}"
echo "sui client call --package $PACKAGE_ID --module cross_chain_auction --function place_bid \\"
echo "  --args $REGISTRY_ID <auction_id> <coin_object_id> 0x6 \\"
echo "  --gas-budget 10000000"
echo
echo -e "${YELLOW}4. Reveal and release escrow:${NC}"
echo "sui client call --package $PACKAGE_ID --module cross_chain_auction --function reveal_and_release \\"
echo "  --args $REGISTRY_ID <escrow_id> <secret_string> <beneficiary_address> 0x6 \\"
echo "  --gas-budget 10000000"
echo

# Display important notes
echo -e "${BLUE}=== Important Notes ===${NC}"
echo -e "${YELLOW}• Keep your AdminCap object ID safe: $ADMIN_CAP_ID${NC}"
echo -e "${YELLOW}• The AuctionRegistry is a shared object accessible to all users${NC}"
echo -e "${YELLOW}• Secret hashes should be generated securely off-chain${NC}"
echo -e "${YELLOW}• Time values are in milliseconds since Unix epoch${NC}"
echo -e "${YELLOW}• Protocol fee is set to 2.5% (250 basis points)${NC}"
echo

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}You can now start using the cross-chain auction system.${NC}"